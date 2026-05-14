'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ClientesPage() {
  const [lista, setLista] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const [form, setForm] = useState<any>({
    nome: '',
    telefone: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    anotacoes: '',
    data_inicio: '',
    data_ultimo_pagamento: '',
    dia_vencimento: '',
    valor_mensalidade: '',
    tipo_documento: 'CPF',
    documento: '',
    status: 'ativo'
  })

  useEffect(() => {
    carregarEmpresa()
  }, [])

  useEffect(() => {
    if (empresaId) {
      carregar()
    }
  }, [busca, empresaId])

  async function carregarEmpresa() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    if (data?.empresa_id) {
      setEmpresaId(data.empresa_id)
    }
  }

  async function carregar() {
    if (!empresaId) return
    let query = supabase.from('clientes').select('*').eq('empresa_id', empresaId)
    if (busca) query = query.ilike('nome', `%${busca}%`)
    const { data } = await query.order('created_at', { ascending: false })
    setLista(data || [])
  }

  function abrirModal(c?: any) {
    setErro('')
    if (c) {
      setEditando(c)
      // Garantia de preenchimento dos campos para evitar inputs vazios
      setForm({
        nome: c.nome || '',
        telefone: c.telefone || '',
        endereco: c.endereco || '',
        numero: c.numero || '',
        bairro: c.bairro || '',
        cep: c.cep || '',
        cidade: c.cidade || '',
        uf: c.uf || '',
        anotacoes: c.anotacoes || '',
        dia_vencimento: c.dia_vencimento || '',
        tipo_documento: c.tipo_documento || 'CPF',
        documento: c.documento || '',
        status: c.status || 'ativo',
        data_inicio: c.data_inicio ? c.data_inicio.split('T')[0] : '',
        data_ultimo_pagamento: c.data_ultimo_pagamento ? c.data_ultimo_pagamento.split('T')[0] : '',
        valor_mensalidade: c.valor_mensalidade 
          ? Number(c.valor_mensalidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
          : ''
      })
    } else {
      setEditando(null)
      setForm({
        nome: '', telefone: '', endereco: '', numero: '', bairro: '', cep: '', cidade: '', uf: '',
        anotacoes: '', data_inicio: '', data_ultimo_pagamento: '', dia_vencimento: '',
        valor_mensalidade: '', tipo_documento: 'CPF', documento: '', status: 'ativo'
      })
    }
    setModal(true)
  }

  function formatTelefone(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)
  }

  function formatMoeda(v: string) {
    v = v.replace(/\D/g, '')
    const numero = Number(v) / 100
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDocumento(v: string, tipo: string) {
    v = v.replace(/\D/g, '')
    if (tipo === 'CPF') {
      return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14)
    }
    return v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)
  }

  function moedaParaNumero(v: string) {
    if (!v) return 0
    return Number(v.replace(/\D/g, '')) / 100
  }

  async function salvar() {
    if (!form.nome || !form.documento || !form.data_inicio) {
      setErro('Nome, Documento e Data de Início são obrigatórios')
      return
    }
    setErro('')
    setLoading(true)

    const payload = {
      ...form,
      empresa_id: empresaId,
      dia_vencimento: Number(form.dia_vencimento),
      valor_mensalidade: moedaParaNumero(form.valor_mensalidade)
    }

    try {
      if (editando) {
        await supabase.from('clientes').update(payload).eq('id', editando.id)
      } else {
        await supabase.from('clientes').insert([payload])
      }
      await carregar()
      setModal(false)
    } catch (err: any) {
      setErro(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => abrirModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all"
        >
          + Novo
        </button>
      </div>

      <div className="mb-6">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="border p-3 w-full rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {lista.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
            <div className="min-w-0 pr-4">
              <strong className="text-gray-800 text-lg block truncate">{c.nome}</strong>
              <span className="text-gray-500 text-sm block">{c.telefone}</span>
              <div className="flex gap-2 mt-1 items-center flex-wrap">
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  Venc. dia {c.dia_vencimento}
                </span>
                <span className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded-full ${c.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => abrirModal(c)}
              className="bg-gray-100 hover:bg-gray-200 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              Detalhes
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{editando ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">{erro}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Data de Início *</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                    <select value={form.tipo_documento} onChange={e => setForm({ ...form, tipo_documento: e.target.value, documento: '' })} className="border p-2.5 w-full rounded-lg outline-none bg-white">
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Documento *</label>
                    <input value={form.documento} onChange={e => setForm({ ...form, documento: formatDocumento(e.target.value, form.tipo_documento) })} className="border p-2.5 w-full rounded-lg outline-none" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome do Cliente *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="border p-2.5 w-full rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Telefone *</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })} className="border p-2.5 w-full rounded-lg outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Vencimento</label>
                    <input type="number" value={form.dia_vencimento} onChange={e => setForm({ ...form, dia_vencimento: e.target.value })} className="border p-2.5 w-full rounded-lg outline-none" />
                   </div>
                   <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor</label>
                    <input value={form.valor_mensalidade} onChange={e => setForm({ ...form, valor_mensalidade: formatMoeda(e.target.value) })} className="border p-2.5 w-full rounded-lg outline-none font-mono text-blue-600" />
                   </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="border p-2.5 w-full rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border p-2.5 w-full rounded-lg outline-none bg-white">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Anotações</label>
                  <textarea value={form.anotacoes} onChange={e => setForm({ ...form, anotacoes: e.target.value })} className="border p-2.5 w-full h-20 rounded-lg outline-none resize-none" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex flex-col md:flex-row justify-end gap-3">
              <button onClick={() => setModal(false)} className="bg-white border border-gray-300 px-6 py-2.5 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={salvar} disabled={loading} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? 'Processando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}