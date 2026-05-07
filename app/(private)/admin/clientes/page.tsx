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
    const {
      data: { user }
    } = await supabase.auth.getUser()

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
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)

    if (busca) {
      query = query.ilike('nome', `%${busca}%`)
    }

    const { data } = await query.order('created_at', { ascending: false })
    setLista(data || [])
  }

  function abrirModal(c?: any) {
    setErro('')

    if (c) {
      setEditando(c)

      setForm({
        ...c,

        data_inicio: c.data_inicio
          ? c.data_inicio.split('T')[0]
          : '',

        data_ultimo_pagamento: c.data_ultimo_pagamento
          ? c.data_ultimo_pagamento.split('T')[0]
          : '',

        valor_mensalidade: c.valor_mensalidade
          ? Number(c.valor_mensalidade).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })
          : ''
      })
    } else {
      setEditando(null)

      setForm({
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
    }

    setModal(true)
  }

  function formatTelefone(v: string) {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  function formatMoeda(v: string) {
    v = v.replace(/\D/g, '')
    const numero = Number(v) / 100

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatDocumento(v: string, tipo: string) {
    v = v.replace(/\D/g, '')

    if (tipo === 'CPF') {
      return v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14)
    }

    return v
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  function moedaParaNumero(v: string) {
    return Number(v.replace(/\D/g, '')) / 100
  }

  function validar() {
    if (!form.nome) return 'Nome é obrigatório'
    if (!form.telefone) return 'Telefone é obrigatório'
    if (!form.cidade) return 'Cidade é obrigatória'
    if (!form.uf) return 'UF é obrigatória'
    if (!form.data_inicio) return 'Data de início é obrigatória'
    if (!form.dia_vencimento) return 'Dia de vencimento é obrigatório'
    if (!form.documento) return 'Documento é obrigatório'
    return ''
  }

  async function salvar() {
    const erroValidacao = validar()

    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setErro('')
    setLoading(true)

    const payload = {
      ...form,
      empresa_id: empresaId,
      data_inicio: form.data_inicio || null,
      data_ultimo_pagamento: form.data_ultimo_pagamento || null,
      dia_vencimento: Number(form.dia_vencimento),
      valor_mensalidade: moedaParaNumero(form.valor_mensalidade)
    }

    let result

    if (editando) {
      result = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', editando.id)
    } else {
      result = await supabase
        .from('clientes')
        .insert([payload])
    }

    if (result.error) {
      setErro(result.error.message)
      setLoading(false)
      return
    }

    await carregar()
    setModal(false)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Clientes</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar cliente..."
          className="border p-1.5 text-sm w-full rounded"
        />

        <button
          onClick={() => abrirModal()}
          className="bg-blue-600 text-white px-3 text-sm rounded"
        >
          Novo
        </button>
      </div>

      <div className="space-y-2">
        {lista.map(c => (
          <div
            key={c.id}
            className="bg-white p-3 rounded shadow flex justify-between"
          >
            <div className="min-w-0">
              <strong className="text-sm break-words">{c.nome}</strong>

              <p className="text-xs">{c.telefone}</p>

              <p className="text-xs text-gray-500">
                Vence todo dia {c.dia_vencimento}
              </p>

              <p className="text-xs break-words">
                R$ {c.valor_mensalidade || 0}
              </p>

              <p
                className={`text-xs ${
                  c.status === 'ativo'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {c.status}
              </p>
            </div>

            <button
              onClick={() => abrirModal(c)}
              className="bg-blue-700 text-white px-2 py-1 rounded text-xs h-fit"
            >
              Detalhes
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white p-3 rounded w-full max-w-[560px] max-h-[90vh] overflow-y-auto">

            <h2 className="font-bold mb-3 text-sm">
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            {erro && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-xs break-words">
                {erro}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

              <div>
                <label className="text-xs">Data de Início *</label>

                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={e =>
                    setForm({
                      ...form,
                      data_inicio: e.target.value
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.data_inicio && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">Tipo</label>

                <select
                  value={form.tipo_documento}
                  onChange={e =>
                    setForm({
                      ...form,
                      tipo_documento: e.target.value,
                      documento: ''
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
              </div>

              <div>
                <label className="text-xs">Documento *</label>

                <input
                  value={form.documento}
                  onChange={e =>
                    setForm({
                      ...form,
                      documento: formatDocumento(
                        e.target.value,
                        form.tipo_documento
                      )
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.documento && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">Nome *</label>

                <input
                  value={form.nome}
                  onChange={e =>
                    setForm({
                      ...form,
                      nome: e.target.value
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.nome && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">Telefone *</label>

                <input
                  value={form.telefone}
                  onChange={e =>
                    setForm({
                      ...form,
                      telefone: formatTelefone(e.target.value)
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.telefone && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">Dia de Vencimento *</label>

                <input
                  type="number"
                  value={form.dia_vencimento}
                  onChange={e =>
                    setForm({
                      ...form,
                      dia_vencimento: e.target.value
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.dia_vencimento && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">Mensalidade</label>

                <input
                  value={form.valor_mensalidade}
                  onChange={e =>
                    setForm({
                      ...form,
                      valor_mensalidade: formatMoeda(e.target.value)
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                />
              </div>

              <div>
                <label className="text-xs">Cidade *</label>

                <input
                  value={form.cidade}
                  onChange={e =>
                    setForm({
                      ...form,
                      cidade: e.target.value
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.cidade && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-xs">UF *</label>

                <input
                  value={form.uf}
                  onChange={e =>
                    setForm({
                      ...form,
                      uf: e.target.value
                    })
                  }
                  className={`border p-1.5 text-sm w-full rounded ${
                    !form.uf && erro
                      ? 'border-red-500'
                      : ''
                  }`}
                />
              </div>

            </div>

            <textarea
              placeholder="Anotações"
              value={form.anotacoes}
              onChange={e =>
                setForm({
                  ...form,
                  anotacoes: e.target.value
                })
              }
              className="border p-1.5 text-sm w-full mt-3 h-20 rounded"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModal(false)}
                className="bg-gray-400 px-3 py-1.5 rounded text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}