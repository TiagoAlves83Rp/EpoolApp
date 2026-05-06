'use client'

import '../globals.css'
import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type User = {
  id: string
  email?: string
}

type Empresa = {
  nome: string
  status: string
}

// 🔥 COMPONENTE FORA (CORRETO)
function NavLinks({ userTipo }: { userTipo: string }) {
  return (
    <>
      {userTipo === 'super_admin' && (
        <>
          <Link href="/superadmin/dashboard" className="p-2 hover:bg-blue-700 rounded">Dashboard SaaS</Link>
          <Link href="/superadmin/empresas" className="p-2 hover:bg-blue-700 rounded">Empresas</Link>
          <Link href="/superadmin/planos" className="p-2 hover:bg-blue-700 rounded">Planos</Link>
        </>
      )}

      {userTipo === 'admin' && (
        <>
          <Link href="/admin/dashboard" className="p-2 hover:bg-blue-700 rounded">Dashboard</Link>
          <Link href="/admin/clientes" className="p-2 hover:bg-blue-700 rounded">Clientes</Link>
          <Link href="/admin/funcionarios" className="p-2 hover:bg-blue-700 rounded">Funcionários</Link>
          <Link href="/admin/rotas" className="p-2 hover:bg-blue-700 rounded">Rotas</Link>
        </>
      )}

      {userTipo === 'funcionario' && (
        <Link href="/funcionario/rotas" className="p-2 hover:bg-blue-700 rounded">Minhas Rotas</Link>
      )}
    </>
  )
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [userTipo, setUserTipo] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  // 🔥 FUNÇÃO SEGURA
  const carregar = async () => {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      setUser(null)
      setEmpresa(null)
      setUserTipo('')
      return
    }

    setUser(data.user)

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tipo, empresa_id')
      .eq('id', data.user.id)
      .single()

    if (!usuario) return

    setUserTipo(usuario.tipo)

    if (usuario.empresa_id) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('nome, status')
        .eq('id', usuario.empresa_id)
        .single()

      if (empresaData?.status === 'inativa') {
        window.location.replace('/cancelado') // 🔥 replace evita voltar
        return
      }

      setEmpresa(empresaData)
    }
  }

  useEffect(() => {
    carregar()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        carregar()
      } else {
        // 🔥 LIMPA TUDO
        setUser(null)
        setEmpresa(null)
        setUserTipo('')
        localStorage.clear()
        sessionStorage.clear()

        window.location.replace('/') // 🔥 evita voltar
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // 🔥 LOGOUT PROFISSIONAL
  const logout = async () => {
    await supabase.auth.signOut()

    localStorage.clear()
    sessionStorage.clear()

    window.location.replace('/') // 🔥 mais seguro que href
  }

  return (
    <html lang="pt-br">
      <body className="bg-gray-100 h-screen overflow-hidden">
        <div className="flex h-screen">

          {/* SIDEBAR */}
          <aside className="hidden md:flex w-64 bg-blue-900 text-white flex-col">
            <div className="p-6">
              <h1 className="text-2xl font-bold">E-Pool</h1>
            </div>

            <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
              <NavLinks userTipo={userTipo} />
            </nav>

            <div className="p-4 border-t border-blue-800">
              <p className="text-xs">{user?.email}</p>
            </div>
          </aside>

          {/* CONTEÚDO */}
          <div className="flex-1 flex flex-col">

            <header className="bg-white shadow px-4 h-16 flex justify-between items-center">
              <div>
                <h2 className="font-bold">{empresa?.nome || 'Sistema'}</h2>
              </div>

              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Sair
              </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
              {children}
            </main>

          </div>
        </div>
      </body>
    </html>
  )
}