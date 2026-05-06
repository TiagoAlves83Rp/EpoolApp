'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Header() {
  const [tipo, setTipo] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) return

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', data.user.id)
        .single()

      setTipo(usuario?.tipo || null)
    }

    carregar()
  }, [])

  function getBaseRoute() {
    if (tipo === 'super_admin') return '/superadmin'
    if (tipo === 'admin') return '/admin'
    if (tipo === 'funcionario') return '/funcionario'
    return ''
  }

  if (!tipo) return null

  return (
    <div className="bg-blue-900 text-white p-4 flex gap-4">

      <a href={`${getBaseRoute()}/dashboard`}>
        Dashboard
      </a>

      {tipo === 'super_admin' && (
        <>
          <a href="/superadmin/empresas">Empresas</a>
          <a href="/superadmin/planos">Planos</a>
        </>
      )}

      {tipo === 'admin' && (
        <>
          <a href="/admin/clientes">Clientes</a>
          <a href="/admin/funcionarios">Funcionários</a>
          <a href="/admin/rotas">Rotas</a>
        </>
      )}

      {tipo === 'funcionario' && (
        <a href="/funcionario/rotas">Minhas Rotas</a>
      )}

    </div>
  )
}