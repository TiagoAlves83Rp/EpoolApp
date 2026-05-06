'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TrocarSenha() {
  const [senha, setSenha] = useState('')

  async function salvar() {
    const { error } = await supabase.auth.updateUser({
      password: senha
    })

    if (error) {
      alert(error.message)
      return
    }

    const { data } = await supabase.auth.getUser()

    await supabase
      .from('usuarios')
      .update({ senha_temporaria: false })
      .eq('id', data.user?.id)

    alert('Senha alterada!')
    window.location.href = '/'
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-80">
        <h1 className="mb-4 font-bold">Trocar senha</h1>

        <input
          type="password"
          className="border w-full p-2 mb-3"
          placeholder="Nova senha"
          onChange={e => setSenha(e.target.value)}
        />

        <button
          onClick={salvar}
          className="bg-blue-600 text-white w-full p-2 rounded"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}