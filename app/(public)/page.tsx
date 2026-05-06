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

        // 🔀 REDIRECIONAMENTO CORRETO
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

  // ⏳ LOADING INICIAL
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p>Verificando sessão...</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-900 to-blue-500">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-80">

        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          E-Pool
        </h1>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 mb-4 rounded"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          disabled={logando}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
          {logando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Sistema de gestão de rotas
        </p>

      </div>

    </div>
  )
}