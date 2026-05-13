'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
// 🔥 Importação da Server Action para corrigir o erro 403
import { resetarSenhaAdmin } from '@/app/actions/adminActions'

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<any>(null)
  const [tipo, setTipo] = useState('')
  const [empresaId, setEmpresaId] = useState('')

  const [novaSenha, setNovaSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('')

  const [corSistema, setCorSistema] = useState('#1d4ed8')

  // 🔥 ESTADOS PARA O MODAL DE SENHA
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaTemp, setSenhaTemp] = useState('')
  const [funcionarioNome, setFuncionarioNome] = useState('')

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

    if (usuario.tipo === 'admin') {
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', usuario.empresa_id)

      setFuncionarios(funcs || [])
    }

    if (usuario.tipo === 'super_admin') {
      const corSalva = localStorage.getItem('cor_sistema')
      if (corSalva) setCorSistema(corSalva)
    }
  }

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

  // 🔵 ADMIN → RESETAR SENHA FUNCIONÁRIO (COM MODAL)
  async function resetarSenhaFuncionario() {
    if (!funcionarioSelecionado) {
      alert('Selecione um funcionário')
      return
    }

    const func = funcionarios.find(f => f.usuario_id === funcionarioSelecionado)
    const nomeExibir = func ? func.nome : 'Funcionário'

    const novaSenhaTemp = Math.random().toString(36).slice(-8)
    setLoading(true)

    try {
      // 🔥 Chama a Server Action
      const resultado = await resetarSenhaAdmin(funcionarioSelecionado, novaSenhaTemp)

      if (!resultado.success) {
        alert('Erro ao resetar senha: ' + resultado.message)
        setLoading(false)
        return
      }

      // força trocar senha no banco de dados
      await supabase
        .from('usuarios')
        .update({ precisa_trocar_senha: true })
        .eq('id', funcionarioSelecionado)

      // 🔥 EXIBE O MODAL EM VEZ DE ALERT
      setSenhaTemp(novaSenhaTemp)
      setFuncionarioNome(nomeExibir)
      setModalSenha(true)

    } catch (err) {
      console.error(err)
      alert('Erro inesperado ao resetar senha')
    } finally {
      setLoading(false)
    }
  }

  function salvarCor() {
    localStorage.setItem('cor_sistema', corSistema)
    alert('Cor atualizada (refresh para aplicar)')
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Configurações</h1>

      {/* 🔐 ALTERAR SENHA */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-semibold mb-2">Alterar senha</h2>
        <input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="border p-2 w-full mb-2 text-sm rounded"
        />
        <button
          onClick={alterarSenha}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Salvar
        </button>
      </div>

      {/* 🔵 ADMIN → RESET FUNCIONÁRIO */}
      {tipo === 'admin' && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-semibold mb-2">Resetar senha de funcionário</h2>
          <select
            value={funcionarioSelecionado}
            onChange={(e) => setFuncionarioSelecionado(e.target.value)}
            className="border p-2 w-full mb-2 text-sm rounded"
          >
            <option value="">Selecione um funcionário</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.usuario_id}>
                {f.nome}
              </option>
            ))}
          </select>
          <button
            onClick={resetarSenhaFuncionario}
            disabled={loading}
            className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 w-full md:w-auto"
          >
            {loading ? 'Processando...' : 'Gerar nova senha'}
          </button>
        </div>
      )}

      {/* 🟣 SUPER ADMIN → COR SISTEMA */}
      {tipo === 'super_admin' && (
        <div className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-semibold mb-2">Cor do sistema</h2>
          <input
            type="color"
            value={corSistema}
            onChange={(e) => setCorSistema(e.target.value)}
            className="mb-2 block cursor-pointer"
          />
          <button
            onClick={salvarCor}
            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
          >
            Salvar cor
          </button>
        </div>
      )}

      {/* 🔥 MODAL DE EXIBIÇÃO DE SENHA (PADRÃO EMPRESA) */}
      {modalSenha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              Senha Resetada!
            </h2>

            <div className="bg-gray-100 rounded-lg p-4 mb-4 text-sm">
              <p className="mb-2">
                <strong>Funcionário:</strong>
              </p>
              <div className="bg-white border rounded p-2 mb-4 text-gray-700">
                {funcionarioNome}
              </div>

              <p className="mb-2">
                <strong>Nova Senha Temporária:</strong>
              </p>
              <div className="bg-white border rounded p-2 font-bold text-blue-700 text-lg text-center tracking-wider">
                {senhaTemp}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4 text-center">
              O funcionário deverá utilizar esta senha no próximo login. 
              Ele será solicitado a trocá-la imediatamente.
            </p>

            <button
              onClick={() => setModalSenha(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
            >
              Fechar e Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}