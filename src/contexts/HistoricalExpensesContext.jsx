import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const HistoricalExpensesContext = createContext(null)

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    totalAmount: Number(row.total_amount),
    expenseDate: row.expense_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export function HistoricalExpensesProvider({ children }) {
  const { house } = useHouse()
  const [historicalExpenses, setHistoricalExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setHistoricalExpenses([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('historical_expenses')
      .select('*')
      .eq('house_id', house.id)
      .order('expense_date', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setHistoricalExpenses((data ?? []).map(mapRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`historical-expenses-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'historical_expenses', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addHistoricalExpense({ title, category, totalAmount, expenseDate, createdBy }) {
    const { error } = await supabase.from('historical_expenses').insert({
      house_id: house.id,
      title,
      category,
      total_amount: totalAmount,
      expense_date: expenseDate,
      created_by: createdBy,
    })

    if (error) throw error
    await refresh()
  }

  async function deleteHistoricalExpense(expenseId) {
    const { error } = await supabase.from('historical_expenses').delete().eq('id', expenseId)
    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({ historicalExpenses, loading, addHistoricalExpense, deleteHistoricalExpense }),
    [historicalExpenses, loading]
  )

  return <HistoricalExpensesContext.Provider value={value}>{children}</HistoricalExpensesContext.Provider>
}

export function useHistoricalExpenses() {
  const context = useContext(HistoricalExpensesContext)
  if (!context) {
    throw new Error('useHistoricalExpenses must be used within a HistoricalExpensesProvider')
  }
  return context
}
