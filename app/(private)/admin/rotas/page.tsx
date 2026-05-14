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

  // MODAL GLOBAL
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
    const { data } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()
    setEmpresaId(data?.empresa_id)
  }

  async function carregarTudo() {
    await Promise.all([carregarRotas(), carregarClientes(), carregarFuncionarios()])
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
    const { data } = await supabase.from('clientes').select('*').eq('empresa_id', empresaId).eq('status', 'ativo')
    setClientes(data || [])
  }

  async function carregarFuncionarios() {
    const { data } = await supabase.from('funcionarios').select('*').eq('empresa_id', empresaId)
    setFuncionarios(data || [])
  }

  async function salvar() {
    if (!nome) return abrirErro('Informe o nome da rota')
    if (!empresaId) return abrirErro('Empresa não identificada')

    const { error } = await supabase.from('rotas').insert([{ nome, empresa_id: empresaId }])
    if (error) return abrirErro('Erro ao criar rota')

    setNome('')
    abrirSucesso('Rota criada com sucesso')
    carregarRotas()
  }

  function excluirRota(id: string) {
    abrirConfirmacao('Deseja excluir esta rota permanentemente?', async () => {
      await supabase.from('rota_clientes').delete().eq('rota_id', id)
      await supabase.from('rotas').delete().eq('id', id)
      abrirSucesso('Rota excluída')
      carregarRotas()
      setModalTipo('')
    })
  }

  async function abrirDetalhes(rota: any) {
    setRotaSelecionada(rota)
    setFuncionarioId(rota.funcionario_id || '')
    const { data } = await supabase.from('rota_clientes').select('cliente_id').eq('rota_id', rota.id)
    setClientesSelecionados(data?.map((i: any) => i.cliente_id) || [])
  }

  function toggleCliente(id: string) {
    setClientesSelecionados(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function salvarDetalhes() {
    if (!rotaSelecionada || !funcionarioId) return abrirErro('Selecione um funcionário')
    if (clientesSelecionados.length === 0) return abrirErro('Selecione pelo menos um cliente')

    setSalvando(true)
    try {
      await supabase.from('rota_clientes').delete().eq('rota_id', rotaSelecionada.id)
      await supabase.from('rota_clientes').insert(clientesSelecionados.map(id => ({ rota_id: rotaSelecionada.id, cliente_id: id })))
      await supabase.from('rotas').update({ funcionario_id: funcionarioId }).eq('id', rotaSelecionada.id)
      abrirSucesso('Rota atualizada')
      setRotaSelecionada(null)
      carregarRotas()
    } catch {
      abrirErro('Erro ao salvar rota')
    }
    setSalvando(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Rotas</h1>
      </div>

      {/* CARD DE CADASTRO */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nome da Nova Rota</label>
        <div className="flex gap-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Rota Centro - Segunda"
            className="border p-3 flex-1 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button
            onClick={salvar}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md shadow-blue-100"
          >
            Cadastrar
          </button>
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="grid grid-cols-1 gap-3">
        {rotas.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
            <div>
              <strong className="text-gray-800 text-lg block">{r.nome}</strong>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  ID: {r.id.split('-')[0]}
                </span>
                <span className="text-xs text-gray-500">
                  Responsável: <span className="font-semibold text-blue-600">{r.funcionarios?.nome || 'Pendente'}</span>
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => abrirDetalhes(r)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Configurar
              </button>
              <button
                onClick={() => excluirRota(r.id)}
                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                title="Excluir"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE FEEDBACK (ERRO/SUCESSO/CONFIRMAR) */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm text-center shadow-2xl">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              modalTipo === 'erro' ? 'bg-red-100 text-red-600' : 
              modalTipo === 'sucesso' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {modalTipo === 'erro' && '✕'}
              {modalTipo === 'sucesso' && '✓'}
              {modalTipo === 'confirmar' && '?'}
            </div>
            <p className="text-gray-700 font-medium mb-6">{modalMsg}</p>

            <div className="flex justify-center gap-3">
              {modalTipo === 'confirmar' ? (
                <>
                  <button onClick={() => setModalTipo('')} className="px-6 py-2 rounded-lg bg-gray-100 text-gray-600 font-semibold">Cancelar</button>
                  <button onClick={acaoConfirmar || (() => {})} className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold">Confirmar</button>
                </>
              ) : (
                <button onClick={() => setModalTipo('')} className="px-10 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-md shadow-blue-100">OK</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES (EDIÇÃO DA ROTA) */}
      {rotaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full md:max-w-xl rounded-t-2xl md:rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Configurar Rota: {rotaSelecionada.nome}</h2>
              <button onClick={() => setRotaSelecionada(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Funcionário Responsável</label>
              <select
                value={funcionarioId}
                onChange={(e) => setFuncionarioId(e.target.value)}
                className="border p-3 w-full mb-6 rounded-xl outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Selecione um funcionário...</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>

              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Selecionar Clientes desta Rota</label>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {clientes.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    clientesSelecionados.includes(c.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clientesSelecionados.includes(c.id)}
                      onChange={() => toggleCliente(c.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${clientesSelecionados.includes(c.id) ? 'text-blue-800' : 'text-gray-700'}`}>
                      {c.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex gap-3">
              <button
                onClick={() => setRotaSelecionada(null)}
                className="flex-1 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDetalhes}
                disabled={salvando}
                className="flex-[2] bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {salvando ? 'Processando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}