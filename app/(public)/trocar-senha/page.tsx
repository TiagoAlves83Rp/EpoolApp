'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function TrocarSenhaPage() {
  const router = useRouter()

  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  async function salvar() {
    if (senha.length < 6) {
      alert('Senha muito curta')
      return
    }

    setLoading(true)

    // 🔐 atualiza senha no auth
    const { error } = await supabase.auth.updateUser({
      password: senha
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // 🔥 remove flag
    const { data } = await supabase.auth.getUser()

    await supabase
      .from('usuarios')
      .update({ precisa_trocar_senha: false })
      .eq('id', data.user?.id)

    alert('Senha alterada com sucesso')

    router.push('/dashboard')
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="bg-white p-6 rounded shadow w-80">

        <h1 className="text-xl font-bold mb-4">
          Trocar Senha
        </h1>

        <input
          type="password"
          placeholder="Nova senha"
          className="w-full border p-2 mb-3"
          value={senha}
          onChange={e => setSenha(e.target.value)}
        />

        <button
          onClick={salvar}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>

      </div>

    </div>
  )
}