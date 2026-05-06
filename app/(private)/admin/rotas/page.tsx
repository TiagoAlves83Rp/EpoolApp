'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RotasPage() {
  const [rotas, setRotas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])

  const [nome, setNome] = useState('')
  const [rotaSelecionada, setRotaSelecionada] = useState<any>(null)
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')

  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // 🔥 MODAL GLOBAL
  const [modalMsg, setModalMsg] = useState('')
  const [modalTipo, setModalTipo] = useState<'erro' | 'sucesso' | 'confirmar' | ''>('')
  const [acaoConfirmar, setAcaoConfirmar] = useState<null | (() => void)>(null)

  useEffect(() => {
    carregarEmpresa()
  }, [])

  useEffect(() => {
    if (empresaId) carregarTudo()
  }, [empresaId])

  function abrirErro(msg: string) {
    setModalMsg(msg)
    setModalTipo('erro')
  }

  function abrirSucesso(msg: string) {
    setModalMsg(msg)
    setModalTipo('sucesso')
  }

  function abrirConfirmacao(msg: string, acao: () => void) {
    setModalMsg(msg)
    setModalTipo('confirmar')
    setAcaoConfirmar(() => acao)
  }

  async function carregarEmpresa() {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) return

    const { data } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    setEmpresaId(data?.empresa_id)
  }

  async function carregarTudo() {
    await Promise.all([
      carregarRotas(),
      carregarClientes(),
      carregarFuncionarios()
    ])
  }

  async function carregarRotas() {
    const { data } = await supabase
      .from('rotas')
      .select(`*, funcionarios (nome)`)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    setRotas(data || [])
  }

  async function carregarClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)

    setClientes(data || [])
  }

  async function carregarFuncionarios() {
    const { data } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('empresa_id', empresaId)

    setFuncionarios(data || [])
  }

  // 🚀 CRIAR ROTA
  async function salvar() {
    if (!nome) return abrirErro('Informe o nome da rota')
    if (!empresaId) return abrirErro('Empresa não identificada')

    const { error } = await supabase.from('rotas').insert([{
      nome,
      empresa_id: empresaId
    }])

    if (error) {
      abrirErro('Erro ao criar rota')
      return
    }

    setNome('')
    abrirSucesso('Rota criada com sucesso')
    carregarRotas()
  }

  // ❌ EXCLUIR ROTA
  function excluirRota(id: string) {
    abrirConfirmacao('Deseja excluir esta rota?', async () => {
      await supabase.from('rota_clientes').delete().eq('rota_id', id)
      await supabase.from('rotas').delete().eq('id', id)

      abrirSucesso('Rota excluída')
      carregarRotas()
      setModalTipo('')
    })
  }

  // 🔍 ABRIR MODAL
  async function abrirDetalhes(rota: any) {
    setRotaSelecionada(rota)
    setFuncionarioId(rota.funcionario_id || '')

    const { data } = await supabase
      .from('rota_clientes')
      .select('cliente_id')
      .eq('rota_id', rota.id)

    setClientesSelecionados(data?.map((i: any) => i.cliente_id) || [])
  }

  function toggleCliente(id: string) {
    if (clientesSelecionados.includes(id)) {
      setClientesSelecionados(clientesSelecionados.filter(c => c !== id))
    } else {
      setClientesSelecionados([...clientesSelecionados, id])
    }
  }

  // 💾 SALVAR DETALHES
  async function salvarDetalhes() {
    if (!rotaSelecionada) return

    if (!funcionarioId) {
      abrirErro('Selecione um funcionário')
      return
    }

    if (clientesSelecionados.length === 0) {
      abrirErro('Selecione pelo menos um cliente')
      return
    }

    setSalvando(true)

    try {
      await supabase
        .from('rota_clientes')
        .delete()
        .eq('rota_id', rotaSelecionada.id)

      await supabase
        .from('rota_clientes')
        .insert(
          clientesSelecionados.map(cliente_id => ({
            rota_id: rotaSelecionada.id,
            cliente_id
          }))
        )

      await supabase
        .from('rotas')
        .update({ funcionario_id: funcionarioId })
        .eq('id', rotaSelecionada.id)

      abrirSucesso('Rota atualizada')

      setRotaSelecionada(null)
      carregarRotas()

    } catch {
      abrirErro('Erro ao salvar rota')
    }

    setSalvando(false)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Rotas</h1>

      {/* CADASTRO */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <p className="text-sm mb-1">Nome da rota</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="border p-2 w-full mb-2 rounded"
        />

        <button
          onClick={salvar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Cadastrar
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {rotas.map(r => (
          <div key={r.id} className="bg-white p-4 rounded shadow flex justify-between items-center">

            <div>
              <strong>{r.nome}</strong>
              <p className="text-xs text-gray-500">
                Funcionário: {r.funcionarios?.nome || 'Não definido'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => abrirDetalhes(r)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs rounded"
              >
                Detalhes
              </button>              

              <button
                onClick={() => excluirRota(r.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded"
              >
                Excluir
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* MODAL FEEDBACK */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded w-[320px] text-center">

            <p className={`mb-4 ${
              modalTipo === 'erro' ? 'text-red-600' :
              modalTipo === 'sucesso' ? 'text-green-600' :
              'text-gray-800'
            }`}>
              {modalMsg}
            </p>

            {modalTipo === 'confirmar' ? (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setModalTipo('')}
                  className="bg-gray-400 text-white px-3 py-1 rounded"
                >
                  Não
                </button>

                <button
                  onClick={acaoConfirmar || (() => {})}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Sim
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModalTipo('')}
                className="bg-blue-600 text-white px-4 py-1 rounded"
              >
                OK
              </button>
            )}

          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {rotaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">

          <div className="bg-white w-full md:max-w-lg rounded-t-xl md:rounded p-4 max-h-[90vh] overflow-y-auto">

            <h2 className="font-bold mb-3">
              Editar: {rotaSelecionada.nome}
            </h2>

            <p className="text-sm">Funcionário</p>
            <select
              value={funcionarioId}
              onChange={(e) => setFuncionarioId(e.target.value)}
              className="border p-2 w-full mb-3 rounded"
            >
              <option value="">Selecione</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>

            <p className="text-sm mb-1">Clientes</p>

            <div className="border p-2 max-h-60 overflow-y-auto mb-3 rounded">
              {clientes.map(c => (
                <label key={c.id} className="flex gap-2 text-sm mb-1">
                  <input
                    type="checkbox"
                    checked={clientesSelecionados.includes(c.id)}
                    onChange={() => toggleCliente(c.id)}
                  />
                  {c.nome}
                </label>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setRotaSelecionada(null)}
                className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
              >
                Fechar
              </button>

              <button
                onClick={salvarDetalhes}
                disabled={salvando}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}