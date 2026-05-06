'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<any>(null)
  const [tipo, setTipo] = useState('')
  const [empresaId, setEmpresaId] = useState('')

  const [novaSenha, setNovaSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('')

  const [corSistema, setCorSistema] = useState('#1d4ed8')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return

    setUser(data.user)

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tipo, empresa_id')
      .eq('id', data.user.id)
      .single()

    if (!usuario) return

    setTipo(usuario.tipo)
    setEmpresaId(usuario.empresa_id)

    // 🔵 ADMIN → carrega funcionários
    if (usuario.tipo === 'admin') {
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', usuario.empresa_id)

      setFuncionarios(funcs || [])
    }

    // 🟣 SUPER ADMIN → cor do sistema
    if (usuario.tipo === 'super_admin') {
      const corSalva = localStorage.getItem('cor_sistema')
      if (corSalva) setCorSistema(corSalva)
    }
  }

  // 🔐 ALTERAR PRÓPRIA SENHA
  async function alterarSenha() {
    if (!novaSenha) {
      alert('Digite a nova senha')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: novaSenha
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Senha alterada com sucesso')
      setNovaSenha('')
    }

    setLoading(false)
  }

  // 🔵 ADMIN → RESETAR SENHA FUNCIONÁRIO
  async function resetarSenhaFuncionario() {
    if (!funcionarioSelecionado) {
      alert('Selecione um funcionário')
      return
    }

    const novaSenhaTemp = Math.random().toString(36).slice(-8)

    // 🔥 atualiza senha via admin API (simples versão)
    const { error } = await supabase.auth.admin.updateUserById(
      funcionarioSelecionado,
      { password: novaSenhaTemp }
    )

    if (error) {
      alert('Erro ao resetar senha')
      return
    }

    // força trocar senha
    await supabase
      .from('usuarios')
      .update({ precisa_trocar_senha: true })
      .eq('id', funcionarioSelecionado)

    alert(`Nova senha temporária: ${novaSenhaTemp}`)
  }

  // 🟣 SUPER ADMIN → ALTERAR COR
  function salvarCor() {
    localStorage.setItem('cor_sistema', corSistema)
    alert('Cor atualizada (refresh para aplicar)')
  }

  return (
    <div className="max-w-xl mx-auto">

      <h1 className="text-xl font-bold mb-6">
        Configurações
      </h1>

      {/* 🔐 ALTERAR SENHA */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-semibold mb-2">Alterar senha</h2>

        <input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="border p-2 w-full mb-2"
        />

        <button
          onClick={alterarSenha}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Salvar
        </button>
      </div>

      {/* 🔵 ADMIN → RESET FUNCIONÁRIO */}
      {tipo === 'admin' && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-semibold mb-2">
            Resetar senha de funcionário
          </h2>

          <select
            value={funcionarioSelecionado}
            onChange={(e) => setFuncionarioSelecionado(e.target.value)}
            className="border p-2 w-full mb-2"
          >
            <option value="">Selecione</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.usuario_id}>
                {f.nome}
              </option>
            ))}
          </select>

          <button
            onClick={resetarSenhaFuncionario}
            className="bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Gerar nova senha
          </button>
        </div>
      )}

      {/* 🟣 SUPER ADMIN → COR SISTEMA */}
      {tipo === 'super_admin' && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-semibold mb-2">
            Cor do sistema
          </h2>

          <input
            type="color"
            value={corSistema}
            onChange={(e) => setCorSistema(e.target.value)}
            className="mb-2"
          />

          <button
            onClick={salvarCor}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Salvar cor
          </button>
        </div>
      )}

    </div>
  )
}