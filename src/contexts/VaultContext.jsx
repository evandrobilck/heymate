import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const EMPTY_VAULT = { wifi: { name: '', password: '' }, memberPayments: {}, customFields: [] }

const VaultContext = createContext(null)

export function VaultProvider({ children }) {
  const { house } = useHouse()
  const [vault, setVault] = useState(EMPTY_VAULT)

  const memberIds = house?.members.map((member) => member.id) ?? []
  const memberIdsKey = memberIds.join(',')

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setVault(EMPTY_VAULT)
      return
    }

    const [{ data: wifiRow }, { data: profileRows }, { data: fieldRows }] = await Promise.all([
      supabase.from('house_wifi').select('*').eq('house_id', house.id).maybeSingle(),
      memberIds.length
        ? supabase
            .from('profiles')
            .select('id, email, phone, pay_id, bank_details, emergency_contact_name, emergency_contact_phone')
            .in('id', memberIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('vault_custom_fields')
        .select('*')
        .eq('house_id', house.id)
        .order('created_at', { ascending: true }),
    ])

    const memberPayments = {}
    ;(profileRows ?? []).forEach((row) => {
      memberPayments[row.id] = {
        email: row.email ?? '',
        phone: row.phone ?? '',
        payId: row.pay_id ?? '',
        bankDetails: row.bank_details ?? '',
        emergencyContactName: row.emergency_contact_name ?? '',
        emergencyContactPhone: row.emergency_contact_phone ?? '',
      }
    })

    setVault({
      wifi: { name: wifiRow?.name ?? '', password: wifiRow?.password ?? '' },
      memberPayments,
      customFields: (fieldRows ?? []).map((row) => ({ id: row.id, label: row.label, value: row.value })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house?.id, memberIdsKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`vault-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'house_wifi', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => refresh())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vault_custom_fields', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  async function updateWifi(name, password) {
    const { error } = await supabase
      .from('house_wifi')
      .upsert({ house_id: house.id, name, password }, { onConflict: 'house_id' })

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  async function addCustomField(label, value) {
    const { error } = await supabase.from('vault_custom_fields').insert({ house_id: house.id, label, value })

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  async function removeCustomField(id) {
    const { error } = await supabase.from('vault_custom_fields').delete().eq('id', id)

    if (error) {
      console.error(error)
      return
    }
    await refresh()
  }

  const value = useMemo(() => ({ vault, updateWifi, addCustomField, removeCustomField }), [vault])

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
