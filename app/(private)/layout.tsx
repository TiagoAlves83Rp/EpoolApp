'use client'

import '../globals.css'
import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [userTipo, setUserTipo] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState(false)

  async function carregar() {
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
        window.location.replace('/cancelado')
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
        setUser(null)
        setEmpresa(null)
        setUserTipo('')

        localStorage.clear()
        sessionStorage.clear()

        window.location.replace('/')
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()

    localStorage.clear()
    sessionStorage.clear()

    window.location.replace('/')
  }

  // Componente de Links para evitar repetição
  const NavLinks = () => (
    <>
      {userTipo === 'super_admin' && (
        <>
          <Link href="/superadmin/dashboard" className="p-2 hover:bg-blue-700 rounded transition">Dashboard SaaS</Link>
          <Link href="/superadmin/empresas" className="p-2 hover:bg-blue-700 rounded transition">Empresas</Link>
          <Link href="/superadmin/planos" className="p-2 hover:bg-blue-700 rounded transition">Planos</Link>
        </>
      )}

      {userTipo === 'admin' && (
        <>
          <Link href="/admin/dashboard" className="p-2 hover:bg-blue-700 rounded transition">Dashboard</Link>
          <Link href="/admin/clientes" className="p-2 hover:bg-blue-700 rounded transition">Clientes</Link>
          <Link href="/admin/funcionarios" className="p-2 hover:bg-blue-700 rounded transition">Funcionários</Link>
          <Link href="/admin/rotas" className="p-2 hover:bg-blue-700 rounded transition">Rotas</Link>
        </>
      )}

      {userTipo === 'funcionario' && (
        <Link href="/funcionario/rotas" className="p-2 hover:bg-blue-700 rounded transition">
          Minhas Rotas
        </Link>
      )}
    </>
  )

  return (
    <html lang="pt-br" className="h-full">
      <body className="bg-gray-100 h-full overflow-hidden">
        <div className="flex h-screen overflow-hidden">

          {/* SIDEBAR DESKTOP */}
          <aside className="hidden md:flex w-64 bg-blue-900 text-white flex-col flex-shrink-0">

            <div className="p-6">
              <h1 className="text-2xl font-bold tracking-tight">E-Pool</h1>
            </div>

            <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto custom-scrollbar">
              <NavLinks />
            </nav>

            {/* CONFIGURAÇÕES */}
            <div className="px-4 pb-2 border-t border-blue-800 pt-4">
              <Link
                href="/configuracoes"
                className="p-2 hover:bg-blue-700 rounded transition block text-sm"
              >
                ⚙️ Configurações
              </Link>
            </div>

            <div className="p-4 border-t border-blue-800">
              <p className="text-xs text-blue-300">
                Logado como:
                <br />
                {user?.email}
              </p>
            </div>

          </aside>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* HEADER */}
            <header className="bg-white shadow-sm z-10 px-4 h-16 flex justify-between items-center flex-shrink-0">

              <div className="flex items-center gap-4">
                <button
                  className="md:hidden text-2xl p-2 rounded-md hover:bg-gray-100"
                  onClick={() => setMenuOpen(true)}
                >
                  ☰
                </button>

                <div className="leading-tight">
                  <h2 className="font-bold text-gray-800 truncate max-w-[150px] md:max-w-none">
                    {empresa?.nome || 'Sistema E-Pool'}
                  </h2>

                  {userTipo !== 'super_admin' && (
                    <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">
                      Unidade Ativa
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 hidden lg:block italic">
                  {user?.email}
                </span>

                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
                >
                  Sair
                </button>
              </div>

            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>

          </div>
        </div>

        {/* MENU MOBILE */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">

            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setMenuOpen(false)}
            />

            <div className="absolute inset-y-0 left-0 w-72 bg-blue-900 text-white shadow-xl flex flex-col">

              <div className="p-6 flex justify-between items-center border-b border-blue-800">
                <span className="text-xl font-bold">Menu</span>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl"
                >
                  &times;
                </button>
              </div>

              <nav
                className="flex-1 flex flex-col gap-2 p-4"
                onClick={() => setMenuOpen(false)}
              >
                <NavLinks />

                {/* CONFIGURAÇÕES MOBILE */}
                <div className="border-t border-blue-800 pt-4 mt-4">
                  <Link
                    href="/configuracoes"
                    className="p-2 hover:bg-blue-700 rounded transition block text-sm"
                  >
                    ⚙️ Configurações
                  </Link>
                </div>

              </nav>

            </div>
          </div>
        )}

      </body>
    </html>
  )
}