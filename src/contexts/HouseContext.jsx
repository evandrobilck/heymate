import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './AuthContext'

const HouseContext = createContext(null)

function mapHouseRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url,
    address: row.address,
    currency: row.currency ?? 'AUD',
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export function HouseProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [house, setHouse] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Realtime's postgres_changes filter can only match a column on the
  // table being watched — profiles has no house_id, so "did a member of
  // MY house change their profile" can't be expressed as a Realtime
  // filter. Kept in a ref (not state) so the channel subscription below
  // doesn't need to resubscribe every time membership changes.
  const membersRef = useRef(members)
  useEffect(() => {
    membersRef.current = members
  }, [members])

  const refresh = useCallback(async () => {
    // Wait for AuthContext to finish resolving the session before deciding
    // there's no user — otherwise a fresh page load briefly treats "not
    // loaded yet" as "logged out" and bounces an authenticated user with a
    // house back to onboarding.
    if (authLoading) return

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
        .select('id, user_id, role, joined_at, left_at, profiles(full_name, avatar_url)')
        .eq('house_id', membership.house_id),
    ])

    setHouse(mapHouseRow(houseRow))
    setMembers(
      (memberRows ?? []).map((row) => ({
        id: row.user_id,
        name: row.profiles?.full_name ?? 'Unknown',
        avatarUrl: row.profiles?.avatar_url ?? null,
        role: row.role,
        joinedAt: row.joined_at,
        leftAt: row.left_at,
      }))
    )
    setLoading(false)
    // Depend on user?.id, not the whole user object — a new object with
    // the same id (e.g. profile fields changing) shouldn't re-trigger a
    // full house refetch (and the loading flip that briefly unmounts
    // RequireHouse's children, see AuthContext's setSession comment).
  }, [user?.id, authLoading])

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (membersRef.current.some((member) => member.id === payload.new?.id)) refresh()
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'houses', filter: `id=eq.${house.id}` },
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

  async function makeAdmin(memberId) {
    if (!house) return
    const { error } = await supabase
      .from('house_members')
      .update({ role: 'admin' })
      .eq('house_id', house.id)
      .eq('user_id', memberId)
    if (error) throw error
    await refresh()
  }

  async function updateMemberJoinedAt(memberId, joinedAt) {
    if (!house) return
    const { error } = await supabase
      .from('house_members')
      .update({ joined_at: joinedAt })
      .eq('house_id', house.id)
      .eq('user_id', memberId)
    if (error) throw error
    await refresh()
  }

  async function renameHouse(name) {
    if (!house) return
    const { error } = await supabase.from('houses').update({ name }).eq('id', house.id)
    if (error) throw error
    await refresh()
  }

  async function uploadHousePhoto(file) {
    if (!house) return
    const extension = file.name.split('.').pop()
    const path = `${house.id}/photo-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('house-photos').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('house-photos').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('houses')
      .update({ photo_url: publicUrlData.publicUrl })
      .eq('id', house.id)
    if (updateError) throw updateError

    await refresh()
  }

  async function updateHouseAddress(address) {
    if (!house) return
    const { error } = await supabase.from('houses').update({ address }).eq('id', house.id)
    if (error) throw error
    await refresh()
  }

  async function updateHouseCurrency(currency) {
    if (!house) return
    const { error } = await supabase.from('houses').update({ currency }).eq('id', house.id)
    if (error) throw error
    await refresh()
  }

  async function transferAdmin(memberId) {
    if (!house) return
    const { error } = await supabase.rpc('transfer_admin', { target_house_id: house.id, new_admin_id: memberId })
    if (error) throw error
    await refresh()
  }

  async function regenerateInviteCode() {
    if (!house) return
    const { data, error } = await supabase.rpc('regenerate_invite_code', { target_house_id: house.id })
    if (error) throw error
    setHouse(mapHouseRow(data))
  }

  async function leaveHouse() {
    const { error } = await supabase.rpc('leave_house')
    if (error) throw error
    await refresh()
  }

  async function resetHouseData() {
    if (!house) return
    const { error } = await supabase.rpc('reset_house_data', { target_house_id: house.id })
    if (error) throw error
  }

  async function deleteHouse() {
    if (!house) return
    const { error } = await supabase.rpc('delete_house', { target_house_id: house.id })
    if (error) throw error
    await refresh()
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
      makeAdmin,
      updateMemberJoinedAt,
      renameHouse,
      uploadHousePhoto,
      updateHouseAddress,
      updateHouseCurrency,
      transferAdmin,
      regenerateInviteCode,
      leaveHouse,
      resetHouseData,
      deleteHouse,
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
