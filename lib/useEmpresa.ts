'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setLoading(false)
        return
      }

      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single()

      if (error || !usuario?.empresa_id) {
        console.log('Sem empresa vinculada')
        setLoading(false)
        return
      }

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('nome')
        .eq('id', usuario.empresa_id)
        .single()

      setEmpresa(empresaData)
      setLoading(false)
    }

    carregar()
  }, [])

  return { empresa, loading }
}