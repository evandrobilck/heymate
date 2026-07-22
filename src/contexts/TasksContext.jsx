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
    completed: row.completed,
    completedByIds: (row.task_completers ?? []).map((completer) => completer.user_id),
    completedAt: row.completed_at,
    createdBy: row.created_by,
    reminders: (row.task_reminders ?? []).map((reminder) => ({
      id: reminder.id,
      channel: reminder.channel,
      daysBefore: reminder.days_before,
      timeOfDay: reminder.time_of_day?.slice(0, 5),
    })),
  }
}

export function TasksProvider({ children }) {
  const { house } = useHouse()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setTasks([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id), task_completers(user_id), task_reminders(*)')
      .eq('house_id', house.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setTasks((data ?? []).map(mapTaskRow))
    setLoading(false)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completers' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_reminders' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function syncTaskReminders(taskId, reminders) {
    const { error: deleteError } = await supabase.from('task_reminders').delete().eq('task_id', taskId)
    if (deleteError) throw deleteError

    if (reminders.length > 0) {
      const { error: insertError } = await supabase.from('task_reminders').insert(
        reminders.map((reminder) => ({
          task_id: taskId,
          channel: reminder.channel,
          days_before: reminder.daysBefore,
          time_of_day: reminder.timeOfDay,
        }))
      )
      if (insertError) throw insertError
    }
  }

  async function addTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        house_id: house.id,
        title: task.title,
        recurrence: task.recurrence,
        due_date: task.dueDate,
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

    if (task.reminders?.length > 0) await syncTaskReminders(data.id, task.reminders)

    await refresh()
  }

  async function updateTask(taskId, task) {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: task.title,
        recurrence: task.recurrence,
        due_date: task.dueDate,
      })
      .eq('id', taskId)

    if (error) throw error

    const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', taskId)
    if (deleteError) throw deleteError

    if (task.assigneeIds.length > 0) {
      const { error: assigneesError } = await supabase
        .from('task_assignees')
        .insert(task.assigneeIds.map((userId) => ({ task_id: taskId, user_id: userId })))

      if (assigneesError) throw assigneesError
    }

    if (task.reminders) await syncTaskReminders(taskId, task.reminders)

    await refresh()
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) throw error
    await refresh()
  }

  async function markTaskDone(taskId, completedByIds) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString().slice(0, 10) })
      .eq('id', taskId)

    if (error) throw error

    const { error: completersError } = await supabase
      .from('task_completers')
      .insert(completedByIds.map((userId) => ({ task_id: taskId, user_id: userId })))

    if (completersError) throw completersError
    await refresh()
  }

  async function markTaskUndone(taskId) {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: false, completed_at: null })
      .eq('id', taskId)

    if (error) throw error

    const { error: completersError } = await supabase.from('task_completers').delete().eq('task_id', taskId)
    if (completersError) throw completersError
    await refresh()
  }

  const value = useMemo(
    () => ({ tasks, loading, refresh, addTask, updateTask, deleteTask, markTaskDone, markTaskUndone }),
    [tasks, loading]
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider')
  }
  return context
}
