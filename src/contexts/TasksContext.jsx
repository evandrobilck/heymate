import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const TasksContext = createContext(null)

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    assigneeIds: (row.task_assignees ?? []).map((assignee) => assignee.user_id),
    recurrence: row.recurrence,
    dueDate: row.due_date,
    notify: row.notify,
    completed: row.completed,
    completedBy: row.completed_by,
    completedAt: row.completed_at,
    createdBy: row.created_by,
  }
}

export function TasksProvider({ children }) {
  const { house } = useHouse()
  const [tasks, setTasks] = useState([])

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setTasks([])
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id)')
      .eq('house_id', house.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setTasks((data ?? []).map(mapTaskRow))
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`tasks-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        house_id: house.id,
        title: task.title,
        recurrence: task.recurrence,
        due_date: task.dueDate,
        notify: task.notify,
        created_by: task.createdBy,
      })
      .select()
      .single()

    if (error) throw error

    if (task.assigneeIds.length > 0) {
      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(task.assigneeIds.map((userId) => ({ task_id: data.id, user_id: userId })))

      if (assigneesError) throw assigneesError
    }

    await refresh()
  }

  async function toggleTaskCompleted(taskId, userId) {
    const task = tasks.find((current) => current.id === taskId)
    if (!task) return
    const nextCompleted = !task.completed

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: nextCompleted,
        completed_by: nextCompleted ? userId : null,
        completed_at: nextCompleted ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq('id', taskId)

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  const value = useMemo(() => ({ tasks, addTask, toggleTaskCompleted }), [tasks])

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider')
  }
  return context
}
