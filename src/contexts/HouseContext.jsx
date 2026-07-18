import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './AuthContext'

const HouseContext = createContext(null)

function mapHouseRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export function HouseProvider({ children }) {
  const { user } = useAuth()
  const [house, setHouse] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setHouse(null)
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: membership } = await supabase
      .from('house_members')
      .select('house_id')
      .eq('user_id', user.id)
      .is('left_at', null)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      setHouse(null)
      setMembers([])
      setLoading(false)
      return
    }

    const [{ data: houseRow }, { data: memberRows }] = await Promise.all([
      supabase.from('houses').select('*').eq('id', membership.house_id).single(),
      supabase
        .from('house_members')
        .select('id, user_id, role, joined_at, left_at, profiles(full_name)')
        .eq('house_id', membership.house_id),
    ])

    setHouse(mapHouseRow(houseRow))
    setMembers(
      (memberRows ?? []).map((row) => ({
        id: row.user_id,
        name: row.profiles?.full_name ?? 'Unknown',
        role: row.role,
        joinedAt: row.joined_at,
        leftAt: row.left_at,
      }))
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Live-update membership (e.g. a roommate joining/leaving) without requiring a manual refresh.
  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`house-members-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'house_members', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  const isAdmin = members.some((member) => member.id === user?.id && member.role === 'admin' && !member.leftAt)

  async function createHouse(name) {
    const { data, error } = await supabase.rpc('create_house', { house_name: name })
    if (error) throw error
    await refresh()
    return mapHouseRow(data)
  }

  async function joinHouse(code) {
    const { data, error } = await supabase.rpc('join_house', { code })
    if (error) throw error
    await refresh()
    return mapHouseRow(data)
  }

  async function markMemberAsLeft(memberId) {
    if (!house) return
    const { error } = await supabase
      .from('house_members')
      .update({ left_at: new Date().toISOString().slice(0, 10) })
      .eq('house_id', house.id)
      .eq('user_id', memberId)
    if (error) throw error
    await refresh()
  }

  async function regenerateInviteCode() {
    if (!house) return
    const { data, error } = await supabase.rpc('regenerate_invite_code', { target_house_id: house.id })
    if (error) throw error
    setHouse(mapHouseRow(data))
  }

  const value = useMemo(
    () => ({
      house: house ? { ...house, members } : null,
      hasHouse: Boolean(house),
      isAdmin,
      loading,
      createHouse,
      joinHouse,
      markMemberAsLeft,
      regenerateInviteCode,
    }),
    [house, members, isAdmin, loading]
  )

  return <HouseContext.Provider value={value}>{children}</HouseContext.Provider>
}

export function useHouse() {
  const context = useContext(HouseContext)
  if (!context) {
    throw new Error('useHouse must be used within a HouseProvider')
  }
  return context
}
