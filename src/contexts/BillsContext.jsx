import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
    participantIds: (row.bill_shares ?? []).map((share) => share.user_id),
    shares,
  }
}

export function BillsProvider({ children }) {
  const { house } = useHouse()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setBills([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_shares(*), bill_occurrence_exceptions(occurrence_date)')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_shares' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_occurrence_exceptions' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addBill(bill) {
    const shares = bill.participantIds.map((userId) => ({
      user_id: userId,
      amount: bill.shares[userId].amount,
      percentage: bill.shares[userId].percentage ?? null,
      paid: bill.shares[userId].paid ?? false,
      paid_at: bill.shares[userId].paidAt ?? null,
    }))

    const { error } = await supabase.rpc('create_bill', {
      p_house_id: house.id,
      p_title: bill.title,
      p_category: bill.category,
      p_total_amount: bill.totalAmount,
      p_due_date: bill.dueDate,
      p_recurrence: bill.recurrence,
      p_split_type: bill.splitType,
      p_source: bill.source ?? null,
      p_shares: shares,
    })

    if (error) throw error
    await refresh()
  }

  async function updateBill(billId, bill) {
    const existing = bills.find((current) => current.id === billId)

    const shares = bill.participantIds.map((userId) => {
      const newShare = bill.shares[userId]
      const previousShare = existing?.shares[userId]
      const keepPaid = Boolean(previousShare?.paid)

      return {
        user_id: userId,
        amount: newShare.amount,
        percentage: newShare.percentage ?? null,
        paid: keepPaid,
        paid_at: keepPaid ? previousShare.paidAt : null,
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
    })

    if (error) throw error
    await refresh()
  }

  async function toggleParticipantPaid(billId, userId) {
    const bill = bills.find((current) => current.id === billId)
    if (!bill) return
    const nextPaid = !bill.shares[userId].paid

    const { error } = await supabase
      .from('bill_shares')
      .update({ paid: nextPaid, paid_at: nextPaid ? new Date().toISOString().slice(0, 10) : null })
      .eq('bill_id', billId)
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      return
    }
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
    () => ({ bills, loading, addBill, updateBill, toggleParticipantPaid, deleteOccurrence, deleteOccurrenceAndFollowing }),
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
