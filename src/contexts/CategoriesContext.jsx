import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const CategoriesContext = createContext(null)

function mapRow(row) {
  return { id: row.id, label: row.label }
}

export function CategoriesProvider({ children }) {
  const { house } = useHouse()
  const [customBillCategories, setCustomBillCategories] = useState([])
  const [customShoppingCategories, setCustomShoppingCategories] = useState([])
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState([])

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setCustomBillCategories([])
      setCustomShoppingCategories([])
      setHiddenCategoryIds([])
      return
    }

    const [{ data: billRows }, { data: shoppingRows }, { data: hiddenRows }] = await Promise.all([
      supabase.from('bill_categories').select('*').eq('house_id', house.id).order('created_at', { ascending: true }),
      supabase
        .from('shopping_categories')
        .select('*')
        .eq('house_id', house.id)
        .order('created_at', { ascending: true }),
      supabase.from('hidden_bill_categories').select('category_id').eq('house_id', house.id),
    ])

    setCustomBillCategories((billRows ?? []).map(mapRow))
    setCustomShoppingCategories((shoppingRows ?? []).map(mapRow))
    setHiddenCategoryIds((hiddenRows ?? []).map((row) => row.category_id))
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`categories-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bill_categories', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_categories', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hidden_bill_categories', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addBillCategory(label) {
    const { error } = await supabase.from('bill_categories').insert({ house_id: house.id, label })
    if (error) throw error
    await refresh()
  }

  async function removeBillCategory(id) {
    const { error } = await supabase.from('bill_categories').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function addShoppingCategory(label) {
    const { error } = await supabase.from('shopping_categories').insert({ house_id: house.id, label })
    if (error) throw error
    await refresh()
  }

  async function removeShoppingCategory(id) {
    const { error } = await supabase.from('shopping_categories').delete().eq('id', id)
    if (error) throw error
    await refresh()
  }

  async function hideBuiltInCategory(categoryId) {
    const { error } = await supabase
      .from('hidden_bill_categories')
      .insert({ house_id: house.id, category_id: categoryId })
    if (error) throw error
    await refresh()
  }

  async function showBuiltInCategory(categoryId) {
    const { error } = await supabase
      .from('hidden_bill_categories')
      .delete()
      .eq('house_id', house.id)
      .eq('category_id', categoryId)
    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({
      customBillCategories,
      customShoppingCategories,
      hiddenCategoryIds,
      addBillCategory,
      removeBillCategory,
      addShoppingCategory,
      removeShoppingCategory,
      hideBuiltInCategory,
      showBuiltInCategory,
    }),
    [customBillCategories, customShoppingCategories, hiddenCategoryIds]
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return context
}
