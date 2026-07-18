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

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setItems([])
      return
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('house_id', house.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setItems((data ?? []).map(mapItemRow))
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
    const { error } = await supabase.from('shopping_items').insert({
      house_id: house.id,
      name,
      added_by: userId,
    })

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  async function markAsBought(itemId, price) {
    const { error } = await supabase.rpc('mark_item_bought', {
      p_item_id: itemId,
      p_price: price,
    })

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  const value = useMemo(() => ({ items, addItem, markAsBought }), [items])

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping() {
  const context = useContext(ShoppingContext)
  if (!context) {
    throw new Error('useShopping must be used within a ShoppingProvider')
  }
  return context
}
