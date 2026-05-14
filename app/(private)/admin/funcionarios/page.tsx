'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function FuncionariosPage() {
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
    salario: '',
    anotacoes: '',
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
    let query = supabase.from('funcionarios').select('*').eq('empresa_id', empresaId)
    if (busca) query = query.ilike('nome', `%${busca}%`)
    const { data } = await query.order('created_at', { ascending: false })
    setLista(data || [])
  }

  function abrirModal(f?: any) {
    setErro('')
    if (f) {
      setEditando(f)
      // Correção: Mapeamento explícito para garantir que os dados carreguem nos inputs
      setForm({
        nome: f.nome || '',
        telefone: f.telefone || '',
        endereco: f.endereco || '',
        numero: f.numero || '',
        bairro: f.bairro || '',
        cep: f.cep || '',
        cidade: f.cidade || '',
        uf: f.uf || '',
        anotacoes: f.anotacoes || '',
        status: f.status || 'ativo',
        salario: f.salario 
          ? Number(f.salario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
          : ''
      })
    } else {
      setEditando(null)
      setForm({
        nome: '', telefone: '', endereco: '', numero: '', bairro: '',
        cep: '', cidade: '', uf: '', salario: '', anotacoes: '', status: 'ativo'
      })
    }
    setModal(true)
  }

  function fecharModal() { setModal(false) }

  // Funções de máscara
  function formatTelefone(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15)
  }
  function formatCEP(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9)
  }
  function formatMoeda(v: string) {
    v = v.replace(/\D/g, '')
    const numero = Number(v) / 100
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  function moedaParaNumero(v: string) {
    if (!v) return 0
    return Number(v.replace(/\D/g, '')) / 100
  }

  async function salvar() {
    if (!form.nome || !form.telefone) {
      setErro('Nome e Telefone são obrigatórios')
      return
    }
    setErro('')
    setLoading(true)

    try {
      const payload = {
        ...form,
        empresa_id: empresaId,
        salario: moedaParaNumero(form.salario)
      }

      if (editando) {
        const { error } = await supabase.from('funcionarios').update(payload).eq('id', editando.id)
        if (error) throw error
      } else {
        // Lógica de criação via API conforme seu código original
        const { data: empresa } = await supabase.from('empresas').select('nome').eq('id', empresaId).single()
        const email = `${empresa.nome.replace(/\s/g, '').toLowerCase()}.${form.nome.replace(/\s/g, '.').toLowerCase()}@epool.com`
        
        const response = await fetch('/api/criar-funcionario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: form.nome, email, empresa_id: empresaId })
        })
        const resData = await response.json()
        if (!response.ok) throw new Error(resData.error)

        const { data: novoFunc } = await supabase.from('funcionarios').select('id').eq('usuario_id', resData.userId).single()
        if (novoFunc) {
          await supabase.from('funcionarios').update(payload).eq('id', novoFunc.id)
        }
        alert(`Sucesso!\nEmail: ${email}\nSenha: ${resData.senhaTemporaria}`)
      }
      await carregar()
      fecharModal()
    } catch (err: any) {
      setErro(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Funcionários</h1>
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
          placeholder="Pesquisar por nome..."
          className="border p-3 w-full rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {lista.map(f => (
          <div key={f.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
            <div>
              <strong className="text-gray-800 text-lg block">{f.nome}</strong>
              <span className="text-gray-500 text-sm">{f.telefone}</span>
              <div className="mt-1">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${f.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {f.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => abrirModal(f)}
              className="bg-gray-100 hover:bg-gray-200 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
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
              <h2 className="text-xl font-bold text-gray-800">{editando ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">{erro}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo *</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Telefone *</label>
                  <input
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">CEP</label>
                  <input
                    value={form.cep}
                    onChange={e => setForm({ ...form, cep: formatCEP(e.target.value) })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Endereço</label>
                  <input
                    value={form.endereco}
                    onChange={e => setForm({ ...form, endereco: e.target.value })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                    <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none" />
                   </div>
                   <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">UF</label>
                    <input value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none" maxLength={2} />
                   </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Salário</label>
                  <input
                    value={form.salario}
                    onChange={e => setForm({ ...form, salario: formatMoeda(e.target.value) })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="border p-2.5 w-full rounded-lg focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Anotações Internas</label>
                  <textarea
                    value={form.anotacoes}
                    onChange={e => setForm({ ...form, anotacoes: e.target.value })}
                    className="border p-2.5 w-full h-24 rounded-lg focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex flex-col md:flex-row justify-end gap-3">
              <button
                onClick={fecharModal}
                className="bg-white border border-gray-300 px-6 py-2.5 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}