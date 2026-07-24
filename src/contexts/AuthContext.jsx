import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, avatar_url, pay_id, bank_details, emergency_contact_name, emergency_contact_phone'
      )
      .eq('id', session.user.id)
      .single()

    setProfile(data)
  }, [session?.user?.id])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  async function register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return { needsEmailConfirmation: !data.session }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.heyflat.com.au/redefinir-senha',
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function updateProfile(updates) {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.name,
        phone: updates.phone,
        pay_id: updates.payId,
        bank_details: updates.bankDetails,
        emergency_contact_name: updates.emergencyContactName,
        emergency_contact_phone: updates.emergencyContactPhone,
      })
      .eq('id', session.user.id)

    if (error) throw error
    await refreshProfile()
  }

  async function uploadAvatar(file) {
    const extension = file.name.split('.').pop()
    const path = `${session.user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', session.user.id)
    if (updateError) throw updateError

    await refreshProfile()
  }

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: profile?.full_name ?? session.user.email,
        phone: profile?.phone ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        payId: profile?.pay_id ?? '',
        bankDetails: profile?.bank_details ?? '',
        emergencyContactName: profile?.emergency_contact_name ?? '',
        emergencyContactPhone: profile?.emergency_contact_phone ?? '',
      }
    : null

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      register,
      login,
      logout,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      uploadAvatar,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
