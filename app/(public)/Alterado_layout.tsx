'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Lock, Mail, Loader2 } from 'lucide-react' // Opcional: instale lucide-react

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [logando, setLogando] = useState(false)

  useEffect(() => {
    async function checkUser() {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          setLoading(false)
          return
        }

        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('id', data.user.id)
          .single()

        if (error || !usuario) {
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        const rotas = {
          super_admin: '/superadmin/dashboard',
          admin: '/admin/dashboard',
          funcionario: '/funcionario/rotas'
        }

        window.location.href = rotas[usuario.tipo as keyof typeof rotas] || '/'
      } catch (err) {
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return alert('Preencha todos os campos')

    setLogando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Credenciais inválidas')

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', data.user.id)
        .single()

      if (usuario) {
        const rotas = {
          super_admin: '/superadmin/dashboard',
          admin: '/admin/dashboard',
          funcionario: '/funcionario/rotas'
        }
        window.location.href = rotas[usuario.tipo as keyof typeof rotas]
      }
    } catch (err: any) {
      alert(err.message)
      setLogando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-600 font-medium">Carregando e-Pool...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700 via-blue-800 to-gray-900">
      
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8/ md:p-10">
          
          {/* Header do Card */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <span className="text-3xl">🏊‍♂️</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              E-Pool
            </h1>
            <p className="text-slate-500 mt-2">Gestão inteligente de rotas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Input Senha */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={logando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {logando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Acessar Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} e-Pool - Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}