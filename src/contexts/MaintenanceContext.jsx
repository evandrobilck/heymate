import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const MaintenanceContext = createContext(null)

function mapRequestRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    photoUrl: row.photo_url,
    occurredOn: row.occurred_on,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
  }
}

export function MaintenanceProvider({ children }) {
  const { house } = useHouse()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setRequests([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('house_id', house.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setRequests((data ?? []).map(mapRequestRow))
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`maintenance-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function uploadPhoto(file) {
    const extension = file.name.split('.').pop()
    const path = `${house.id}/${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('maintenance-photos').upload(path, file)
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('maintenance-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function addRequest({ title, description, occurredOn, photoFile, createdBy }) {
    const photoUrl = photoFile ? await uploadPhoto(photoFile) : null

    const { error } = await supabase.from('maintenance_requests').insert({
      house_id: house.id,
      title,
      description: description || null,
      photo_url: photoUrl,
      occurred_on: occurredOn || null,
      created_by: createdBy,
    })

    if (error) throw error
    await refresh()
  }

  async function resolveRequest(requestId, resolvedBy) {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'resolved', resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
      .eq('id', requestId)

    if (error) throw error
    await refresh()
  }

  async function reopenRequest(requestId) {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'open', resolved_by: null, resolved_at: null })
      .eq('id', requestId)

    if (error) throw error
    await refresh()
  }

  async function deleteRequest(requestId) {
    const { error } = await supabase.from('maintenance_requests').delete().eq('id', requestId)
    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({ requests, loading, addRequest, resolveRequest, reopenRequest, deleteRequest }),
    [requests, loading]
  )

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext)
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider')
  }
  return context
}
