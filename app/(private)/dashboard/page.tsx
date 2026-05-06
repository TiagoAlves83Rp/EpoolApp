'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function redirecionar() {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) {
        router.push('/')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', user.id)
        .single()

      if (!usuario) {
        router.push('/')
        return
      }

      console.log('TIPO LOGADO:', usuario.tipo)

      if (usuario.tipo === 'super_admin') {
        router.push('/superadmin/dashboard')
      } else if (usuario.tipo === 'admin') {
        router.push('/admin/dashboard')
      } else if (usuario.tipo === 'funcionario') {
        router.push('/funcionario/rotas')
      } else {
        router.push('/')
      }
    }

    redirecionar()
  }, [router])

  return <p>Redirecionando...</p>
}