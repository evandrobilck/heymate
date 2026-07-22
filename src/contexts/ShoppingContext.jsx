import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const ShoppingContext = createContext(null)

function mapItemRow(row) {
  return {
    id: row.id,
    name: row.name,
    addedBy: row.added_by,
    createdAt: row.created_at,
    bought: row.bought,
    boughtBy: row.bought_by,
    boughtAt: row.bought_at,
    price: row.price != null ? Number(row.price) : null,
    billId: row.bill_id,
  }
}

export function ShoppingProvider({ children }) {
  const { house } = useHouse()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setItems([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('house_id', house.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setItems((data ?? []).map(mapItemRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`shopping-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addItem(name, userId) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        house_id: house.id,
        name,
        added_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return
    }

    // Fire-and-forget: instant push to the rest of the house. Never block
    // adding the item on this, and never surface a failure here — push
    // isn't wired up yet (needs Firebase), so this is a safe no-op for now.
    supabase.functions.invoke('notify-shopping-added', { body: { item_id: data.id } }).catch(() => {})

    await refresh()
  }

  async function recordPurchase(itemId, purchase) {
    const shares = purchase.participantIds.map((userId) => ({
      user_id: userId,
      amount: purchase.shares[userId].amount,
      percentage: purchase.shares[userId].percentage ?? null,
      paid: purchase.shares[userId].paid ?? false,
      paid_at: purchase.shares[userId].paidAt ?? null,
    }))

    const { error } = await supabase.rpc('record_purchase', {
      p_item_id: itemId,
      p_title: purchase.title,
      p_category: purchase.category,
      p_total_amount: purchase.totalAmount,
      p_buyer_id: purchase.buyerId,
      p_split_type: purchase.splitType,
      p_shares: shares,
    })

    if (error) throw error
    await refresh()
  }

  async function renameItem(itemId, name) {
    const { error } = await supabase.from('shopping_items').update({ name }).eq('id', itemId)
    if (error) throw error
    await refresh()
  }

  async function deleteItem(itemId) {
    const { error } = await supabase.rpc('delete_shopping_item', { p_item_id: itemId })
    if (error) throw error
    await refresh()
  }

  async function updatePurchase(itemId, purchase) {
    const shares = purchase.participantIds.map((userId) => ({
      user_id: userId,
      amount: purchase.shares[userId].amount,
      percentage: purchase.shares[userId].percentage ?? null,
      paid: purchase.shares[userId].paid ?? false,
      paid_at: purchase.shares[userId].paidAt ?? null,
    }))

    const { error } = await supabase.rpc('update_purchase', {
      p_item_id: itemId,
      p_title: purchase.title,
      p_category: purchase.category,
      p_total_amount: purchase.totalAmount,
      p_buyer_id: purchase.buyerId,
      p_split_type: purchase.splitType,
      p_shares: shares,
    })

    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({ items, loading, addItem, recordPurchase, renameItem, deleteItem, updatePurchase }),
    [items, loading]
  )

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping() {
  const context = useContext(ShoppingContext)
  if (!context) {
    throw new Error('useShopping must be used within a ShoppingProvider')
  }
  return context
}
