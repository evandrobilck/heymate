import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const CalendarEventsContext = createContext(null)

function mapEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    eventTime: row.event_time,
    location: row.location,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export function CalendarEventsProvider({ children }) {
  const { house } = useHouse()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setEvents([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('house_id', house.id)
      .order('event_date', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setEvents((data ?? []).map(mapEventRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`calendar-events-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function addEvent({ title, eventDate, eventTime, location, notes, createdBy }) {
    const { error } = await supabase.from('calendar_events').insert({
      house_id: house.id,
      title,
      event_date: eventDate,
      event_time: eventTime || null,
      location: location || null,
      notes: notes || null,
      created_by: createdBy,
    })
    if (error) throw error
    await refresh()
  }

  async function deleteEvent(eventId) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) throw error
    await refresh()
  }

  const value = useMemo(() => ({ events, loading, addEvent, deleteEvent }), [events, loading])

  return <CalendarEventsContext.Provider value={value}>{children}</CalendarEventsContext.Provider>
}

export function useCalendarEvents() {
  const context = useContext(CalendarEventsContext)
  if (!context) {
    throw new Error('useCalendarEvents must be used within a CalendarEventsProvider')
  }
  return context
}
