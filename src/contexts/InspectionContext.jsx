import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const InspectionContext = createContext(null)

function mapInspectionRow(row) {
  return {
    id: row.id,
    scheduledDate: row.scheduled_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    tasks: (row.inspection_tasks ?? [])
      .map((task) => ({ id: task.id, title: task.title, completed: task.completed }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  }
}

export function InspectionProvider({ children }) {
  const { house } = useHouse()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setInspections([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('inspections')
      .select('*, inspection_tasks(*)')
      .eq('house_id', house.id)
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setInspections((data ?? []).map(mapInspectionRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`inspections-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspections', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_tasks' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addInspection({ scheduledDate, notes, createdBy }) {
    const { error } = await supabase.from('inspections').insert({
      house_id: house.id,
      scheduled_date: scheduledDate,
      notes: notes || null,
      created_by: createdBy,
    })

    if (error) throw error
    await refresh()
  }

  async function deleteInspection(inspectionId) {
    const { error } = await supabase.from('inspections').delete().eq('id', inspectionId)
    if (error) throw error
    await refresh()
  }

  async function addTask(inspectionId, title) {
    const { error } = await supabase.from('inspection_tasks').insert({ inspection_id: inspectionId, title })
    if (error) throw error
    await refresh()
  }

  async function toggleTask(taskId, completed) {
    const { error } = await supabase.from('inspection_tasks').update({ completed }).eq('id', taskId)
    if (error) throw error
    await refresh()
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from('inspection_tasks').delete().eq('id', taskId)
    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({ inspections, loading, addInspection, deleteInspection, addTask, toggleTask, deleteTask }),
    [inspections, loading]
  )

  return <InspectionContext.Provider value={value}>{children}</InspectionContext.Provider>
}

export function useInspection() {
  const context = useContext(InspectionContext)
  if (!context) {
    throw new Error('useInspection must be used within an InspectionProvider')
  }
  return context
}
