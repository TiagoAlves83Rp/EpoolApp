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
  const [modalNovo, setModalNovo] = useState(false)

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
    if (!userData.user) return
    const { data } = await supabase.from('usuarios').select('empresa_id').eq('id', userData.user.id).single()
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
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return abrirErro('Informe o nome da rota')
    if (!empresaId) return abrirErro('Empresa não identificada')

    setSalvando(true)

    const { data: existente } = await supabase
      .from('rotas')
      .select('id')
      .eq('empresa_id', empresaId)
      .ilike('nome', nomeLimpo)

    if (existente && existente.length > 0) {
      setSalvando(false)
      return abrirErro('Já existe uma rota com este nome!')
    }

    const { error } = await supabase.from('rotas').insert([{ nome: nomeLimpo, empresa_id: empresaId }])
    
    if (error) {
      setSalvando(false)
      return abrirErro('Erro ao criar rota')
    }

    setNome('')
    setModalNovo(false)
    setSalvando(false)
    abrirSucesso('Rota criada com sucesso')
    carregarRotas()
  }

  function excluirRota(id: string) {
    abrirConfirmacao('Deseja excluir esta rota?', async () => {
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
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rotas</h1>
        <button
          onClick={() => setModalNovo(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
        >
          + Nova Rota
        </button>
      </div>

      <div className="space-y-3">
        {rotas.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <strong className="text-gray-800">{r.nome}</strong>
              <p className="text-xs text-gray-500 mt-1">
                Funcionário: <span className="text-blue-600 font-medium">{r.funcionarios?.nome || 'Não definido'}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => abrirDetalhes(r)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-1.5 text-xs rounded-lg font-bold transition-all"
              >
                Detalhes
              </button>
              <button
                onClick={() => excluirRota(r.id)}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-1.5 text-xs rounded-lg font-bold transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Cadastrar Rota</h2>
              <button onClick={() => setModalNovo(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nome da rota</p>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border p-2.5 w-full mb-6 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Rota Centro"
              />
              <div className="flex gap-3">
                <button onClick={() => setModalNovo(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-semibold">Cancelar</button>
                <button onClick={salvar} disabled={salvando} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {rotaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Editar: {rotaSelecionada.nome}</h2>
            <div className="overflow-y-auto pr-1 flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Funcionário</p>
              <select
                value={funcionarioId}
                onChange={(e) => setFuncionarioId(e.target.value)}
                className="border p-2.5 w-full mb-4 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Clientes da Rota</p>
              <div className="border border-gray-100 p-2 max-h-60 overflow-y-auto mb-6 rounded-lg bg-gray-50">
                {clientes.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={clientesSelecionados.includes(c.id)}
                      onChange={() => toggleCliente(c.id)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{c.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setRotaSelecionada(null)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg font-semibold">Fechar</button>
              <button onClick={salvarDetalhes} disabled={salvando} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACKS */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-xs text-center shadow-2xl">
            <p className={`mb-6 font-medium ${modalTipo === 'erro' ? 'text-red-600' : modalTipo === 'sucesso' ? 'text-green-600' : 'text-gray-800'}`}>{modalMsg}</p>
            <div className="flex justify-center gap-3">
              {modalTipo === 'confirmar' ? (
                <>
                  <button onClick={() => setModalTipo('')} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg font-semibold">Não</button>
                  <button onClick={acaoConfirmar || (() => {})} className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold">Sim</button>
                </>
              ) : (
                <button onClick={() => setModalTipo('')} className="bg-blue-600 text-white px-10 py-2 rounded-lg font-semibold">OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}