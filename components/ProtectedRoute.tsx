'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Props = {
  children: React.ReactNode
  tipos?: string[]
}

export default function ProtectedRoute({ children, tipos = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.push('/')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo, empresa_id')
        .eq('id', authData.user.id)
        .single()

      if (!usuario) {
        router.push('/')
        return
      }

      // 🔒 bloqueio por tipo
      if (tipos.length > 0 && !tipos.includes(usuario.tipo)) {
        // redireciona corretamente
        if (usuario.tipo === 'admin') {
          router.push('/admin/dashboard')
        } else if (usuario.tipo === 'funcionario') {
          router.push('/funcionario/rotas')
        } else if (usuario.tipo === 'super_admin') {
          router.push('/superadmin/dashboard')
        } else {
          router.push('/')
        }
        return
      }

      // 🏢 valida empresa
      if (usuario.tipo !== 'super_admin') {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('status, data_vencimento')
          .eq('id', usuario.empresa_id)
          .single()

        if (!empresa) {
          router.push('/')
          return
        }

        const hoje = new Date()
        const vencimento = empresa.data_vencimento
          ? new Date(empresa.data_vencimento)
          : null

        if (
          empresa.status !== 'ativa' ||
          (vencimento && vencimento < hoje)
        ) {
          alert('Empresa bloqueada ou plano vencido')
          router.push('/')
          return
        }
      }

      setLoading(false)
    }

    check()
  }, [router, tipos])

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>
  }

  return <>{children}</>
}