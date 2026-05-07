'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [logando, setLogando] = useState(false)

  // 🔥 VERIFICA SESSÃO AO ABRIR
  useEffect(() => {
    async function checkUser() {
      try {
        const { data } = await supabase.auth.getUser()

        // 🔓 NÃO LOGADO → MOSTRA LOGIN
        if (!data.user) {
          setLoading(false)
          return
        }

        // 🔍 BUSCA USUÁRIO NA TABELA
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('tipo')
          .eq('id', data.user.id)
          .single()

        // 🚨 SE DER ERRO → LIMPA SESSÃO
        if (error || !usuario) {
          console.error('Usuário não encontrado na tabela usuarios')

          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // 🔀 REDIRECIONAMENTO
        if (usuario.tipo === 'super_admin') {
          window.location.href = '/superadmin/dashboard'
        } else if (usuario.tipo === 'admin') {
          window.location.href = '/admin/dashboard'
        } else if (usuario.tipo === 'funcionario') {
          window.location.href = '/funcionario/rotas'
        }

      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  // 🔐 LOGIN
  async function login() {
    if (!email || !password) {
      alert('Preencha email e senha')
      return
    }

    setLogando(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        alert('Email ou senha inválidos')
        setLogando(false)
        return
      }

      // 🔍 BUSCA USUÁRIO
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', data.user.id)
        .single()

      if (userError || !usuario) {
        alert('Usuário não encontrado no sistema')
        await supabase.auth.signOut()
        setLogando(false)
        return
      }

      // 🔀 REDIRECIONA
      if (usuario.tipo === 'super_admin') {
        window.location.href = '/superadmin/dashboard'
      } else if (usuario.tipo === 'admin') {
        window.location.href = '/admin/dashboard'
      } else if (usuario.tipo === 'funcionario') {
        window.location.href = '/funcionario/rotas'
      }

    } catch (err) {
      console.error(err)
      alert('Erro ao fazer login')
      setLogando(false)
    }
  }

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white px-8 py-6 rounded-2xl shadow-lg">
          <p className="text-gray-700 font-medium">
            Verificando sessão...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 relative overflow-hidden">

        <div className="absolute inset-0 bg-black/10"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">

          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-3xl mb-6">
              🏊
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              E-Pool
            </h1>

            <p className="text-blue-100 text-lg mt-4 max-w-md leading-relaxed">
              Plataforma profissional para gestão de clientes, funcionários, rotas e atendimentos.
            </p>
          </div>

          <div className="space-y-4 text-blue-100">

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-300"></div>
              <span>Controle de rotas em tempo real</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-300"></div>
              <span>Check-in e check-out com fotos</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-300"></div>
              <span>Gestão completa da empresa</span>
            </div>

          </div>

        </div>

      </div>

      {/* LADO DIREITO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-100 px-4">

        <div className="w-full max-w-md">

          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">

            {/* MOBILE LOGO */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-700 text-white flex items-center justify-center text-3xl mb-4">
                🏊
              </div>

              <h1 className="text-3xl font-bold text-gray-800">
                E-Pool
              </h1>
            </div>

            <div className="mb-8">

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Bem-vindo
              </h2>

              <p className="text-gray-500">
                Faça login para acessar o sistema
              </p>

            </div>

            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>

                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <button
                onClick={login}
                disabled={logando}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-md"
              >
                {logando ? 'Entrando...' : 'Entrar'}
              </button>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">

              <p className="text-center text-sm text-gray-400">
                Sistema inteligente de gestão de rotas e serviços
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}