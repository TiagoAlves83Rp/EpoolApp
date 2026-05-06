'use client'

import '../globals.css'
import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [userTipo, setUserTipo] = useState<string>('')

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
        .select('nome')
        .eq('id', usuario.empresa_id)
        .single()

      setEmpresa(empresaData)
    } else {
      setEmpresa(null)
    }
  }

  useEffect(() => {
    carregar()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          carregar()
        } else {
          setUser(null)
          setEmpresa(null)
          setUserTipo('')
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <html lang="pt-br">
      <body className="bg-gray-100">

        <div className="flex min-h-screen">

          {/* SIDEBAR */}
          <aside className="w-64 bg-blue-900 text-white p-5 flex flex-col justify-between">

            <div>
              <h1 className="text-2xl font-bold mb-6">E-Pool</h1>

              <nav className="flex flex-col gap-2 text-sm">

                {/* SUPER ADMIN */}
                {userTipo === 'super_admin' && (
                  <>
                    <Link href="/superadmin/dashboard" className="p-2 hover:bg-blue-700 rounded">
                      Dashboard SaaS
                    </Link>

                    <Link href="/superadmin/empresas" className="p-2 hover:bg-blue-700 rounded">
                      Empresas
                    </Link>

                    <Link href="/superadmin/planos" className="p-2 hover:bg-blue-700 rounded">
                      Planos
                    </Link>
                  </>
                )}

                {/* ADMIN */}
                {userTipo === 'admin' && (
                  <>
                    <Link href="/admin/dashboard" className="p-2 hover:bg-blue-700 rounded">
                      Dashboard
                    </Link>

                    <Link href="/admin/clientes" className="p-2 hover:bg-blue-700 rounded">
                      Clientes
                    </Link>

                    <Link href="/admin/funcionarios" className="p-2 hover:bg-blue-700 rounded">
                      Funcionários
                    </Link>

                    <Link href="/admin/rotas" className="p-2 hover:bg-blue-700 rounded">
                      Rotas
                    </Link>
                  </>
                )}

                {/* FUNCIONÁRIO */}
                {userTipo === 'funcionario' && (
                  <Link href="/funcionario/rotas" className="p-2 hover:bg-blue-700 rounded">
                    Minhas Rotas
                  </Link>
                )}

              </nav>
            </div>

            {/* CONFIGURAÇÕES - SEM CONDIÇÃO */}
            <div className="mt-6 border-t border-blue-700 pt-4">
              <Link
                href="/configuracoes"
                className="p-2 hover:bg-blue-700 rounded block text-sm"
              >
                ⚙️ Configurações
              </Link>
            </div>

          </aside>

          {/* CONTEÚDO */}
          <main className="flex-1 flex flex-col">

            {/* HEADER */}
            <div className="bg-white shadow px-6 py-3 flex justify-between items-center">

              <div>
                <h2 className="font-semibold text-gray-800">
                  Sistema E-Pool
                </h2>

                {userTipo !== 'super_admin' && (
                  <>
                    <p className="text-xs text-gray-500">
                      Empresa conectada
                    </p>

                    <p className="font-bold text-gray-800">
                      {empresa?.nome || '---'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">

                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>

                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Sair
                </button>

              </div>

            </div>

            {/* CONTEÚDO */}
            <div className="p-6">
              {children}
            </div>

          </main>

        </div>

      </body>
    </html>
  )
}