import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const BillsContext = createContext(null)

function mapBillRow(row) {
  const shares = {}
  ;(row.bill_shares ?? []).forEach((share) => {
    shares[share.user_id] = {
      amount: Number(share.amount),
      percentage: share.percentage != null ? Number(share.percentage) : undefined,
      paid: share.paid,
      paidAt: share.paid_at,
      paidAmount: Number(share.paid_amount ?? (share.paid ? share.amount : 0)),
      settledVia: share.settled_via ?? null,
    }
  })

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    totalAmount: Number(row.total_amount),
    dueDate: row.due_date,
    recurrence: row.recurrence,
    recurrenceUntil: row.recurrence_until,
    excludedDates: (row.bill_occurrence_exceptions ?? []).map((exception) => exception.occurrence_date),
    splitType: row.split_type,
    createdBy: row.created_by,
    source: row.source,
    isPrivate: row.is_private,
    photoUrl: row.photo_url,
    amountConfirmedThrough: row.amount_confirmed_through,
    participantIds: (row.bill_shares ?? []).map((share) => share.user_id),
    shares,
    reminders: (row.bill_reminders ?? []).map((reminder) => ({
      id: reminder.id,
      channel: reminder.channel,
      daysBefore: reminder.days_before,
      timeOfDay: reminder.time_of_day?.slice(0, 5),
    })),
  }
}

export function BillsProvider({ children }) {
  const { house } = useHouse()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  // Realtime's postgres_changes filter can only match a column on the
  // table being watched — bill_shares/bill_occurrence_exceptions/
  // bill_reminders only have bill_id, not house_id, so "does this row
  // belong to one of MY house's bills" can't be expressed as a Realtime
  // filter. Kept in a ref so the channel subscription below doesn't need
  // to resubscribe every time the bill list changes.
  const billIdsRef = useRef([])
  useEffect(() => {
    billIdsRef.current = bills.map((bill) => bill.id)
  }, [bills])

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setBills([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_shares(*), bill_occurrence_exceptions(occurrence_date), bill_reminders(*)')
      .eq('house_id', house.id)
      .order('due_date', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setBills((data ?? []).map(mapBillRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`bills-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_shares' }, (payload) => {
        const billId = payload.new?.bill_id ?? payload.old?.bill_id
        if (billIdsRef.current.includes(billId)) refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_occurrence_exceptions' }, (payload) => {
        const billId = payload.new?.bill_id ?? payload.old?.bill_id
        if (billIdsRef.current.includes(billId)) refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_reminders' }, (payload) => {
        const billId = payload.new?.bill_id ?? payload.old?.bill_id
        if (billIdsRef.current.includes(billId)) refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function syncBillReminders(billId, reminders) {
    const { error: deleteError } = await supabase.from('bill_reminders').delete().eq('bill_id', billId)
    if (deleteError) throw deleteError

    if (reminders.length > 0) {
      const { error: insertError } = await supabase.from('bill_reminders').insert(
        reminders.map((reminder) => ({
          bill_id: billId,
          channel: reminder.channel,
          days_before: reminder.daysBefore,
          time_of_day: reminder.timeOfDay,
        }))
      )
      if (insertError) throw insertError
    }
  }

  async function addBill(bill) {
    const shares = bill.participantIds.map((userId) => ({
      user_id: userId,
      amount: bill.shares[userId].amount,
      percentage: bill.shares[userId].percentage ?? null,
      paid: bill.shares[userId].paid ?? false,
      paid_at: bill.shares[userId].paidAt ?? null,
    }))

    const { data, error } = await supabase.rpc('create_bill', {
      p_house_id: house.id,
      p_title: bill.title,
      p_category: bill.category,
      p_total_amount: bill.totalAmount,
      p_due_date: bill.dueDate,
      p_recurrence: bill.recurrence,
      p_split_type: bill.splitType,
      p_source: bill.source ?? null,
      p_shares: shares,
      p_is_private: bill.isPrivate ?? false,
      p_apply_debt_offset: bill.applyDebtOffset ?? true,
    })

    if (error) throw error
    if (bill.reminders?.length > 0) await syncBillReminders(data.id, bill.reminders)
    await refresh()
    return data.id
  }

  async function updateBill(billId, bill) {
    const existing = bills.find((current) => current.id === billId)

    const shares = bill.participantIds.map((userId) => {
      const newShare = bill.shares[userId]
      const previousShare = existing?.shares[userId]
      // Cap the carried-over paid amount to the (possibly edited) new
      // total, so shrinking a bill's amount can't leave paid_amount
      // stranded above amount, but otherwise preserve whatever was
      // already settled — including partial debt-offset amounts.
      const carriedPaidAmount = Math.min(previousShare?.paidAmount ?? 0, newShare.amount)
      const keepPaid = carriedPaidAmount >= newShare.amount - 0.005

      return {
        user_id: userId,
        amount: newShare.amount,
        percentage: newShare.percentage ?? null,
        paid: keepPaid,
        paid_at: keepPaid ? (previousShare?.paidAt ?? new Date().toISOString().slice(0, 10)) : null,
        paid_amount: carriedPaidAmount,
        settled_via: carriedPaidAmount > 0 ? (previousShare?.settledVia ?? 'cash') : null,
      }
    })

    const { error } = await supabase.rpc('update_bill', {
      p_bill_id: billId,
      p_title: bill.title,
      p_category: bill.category,
      p_total_amount: bill.totalAmount,
      p_due_date: bill.dueDate,
      p_recurrence: bill.recurrence,
      p_split_type: bill.splitType,
      p_shares: shares,
      p_is_private: bill.isPrivate ?? false,
    })

    if (error) throw error
    if (bill.reminders) await syncBillReminders(billId, bill.reminders)
    await refresh()
  }

  async function toggleParticipantPaid(billId, userId) {
    const bill = bills.find((current) => current.id === billId)
    if (!bill) return
    const share = bill.shares[userId]
    const nextPaid = !share.paid

    const { error } = await supabase
      .from('bill_shares')
      .update({
        paid: nextPaid,
        paid_at: nextPaid ? new Date().toISOString().slice(0, 10) : null,
        paid_amount: nextPaid ? share.amount : 0,
        settled_via: nextPaid ? 'cash' : null,
      })
      .eq('bill_id', billId)
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  async function uploadBillPhoto(file) {
    const extension = file.name.split('.').pop()
    const path = `${house.id}/${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('bill-photos').upload(path, file)
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('bill-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function setBillPhoto(billId, photoFile) {
    const photoUrl = photoFile ? await uploadBillPhoto(photoFile) : null
    const { error } = await supabase.rpc('set_bill_photo', { p_bill_id: billId, p_photo_url: photoUrl })
    if (error) throw error
    await refresh()
    return photoUrl
  }

  async function confirmBillAmount(billId) {
    const { error } = await supabase.rpc('confirm_bill_amount', { p_bill_id: billId })
    if (error) throw error
    await refresh()
  }

  async function deleteBill(billId) {
    const { error } = await supabase.rpc('delete_bill', { p_bill_id: billId })
    if (error) throw error
    await refresh()
  }

  async function deleteOccurrence(billId, occurrenceDate) {
    const { error } = await supabase
      .from('bill_occurrence_exceptions')
      .insert({ bill_id: billId, occurrence_date: occurrenceDate })

    if (error) throw error
    await refresh()
  }

  async function deleteOccurrenceAndFollowing(billId, fromDate) {
    const [year, month, day] = fromDate.split('-').map(Number)
    const cutoff = new Date(year, month - 1, day)
    cutoff.setDate(cutoff.getDate() - 1)
    const untilDate = cutoff.toISOString().slice(0, 10)

    const { error } = await supabase.rpc('set_bill_recurrence_until', {
      p_bill_id: billId,
      p_until_date: untilDate,
    })

    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({
      bills,
      loading,
      refresh,
      addBill,
      updateBill,
      setBillPhoto,
      confirmBillAmount,
      deleteBill,
      toggleParticipantPaid,
      deleteOccurrence,
      deleteOccurrenceAndFollowing,
    }),
    [bills, loading]
  )

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>
}

export function useBills() {
  const context = useContext(BillsContext)
  if (!context) {
    throw new Error('useBills must be used within a BillsProvider')
  }
  return context
}
