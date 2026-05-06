'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PlanosPage() {
  const [planos, setPlanos] = useState<any[]>([])

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [limiteFuncionarios, setLimiteFuncionarios] = useState('')
  const [limiteClientes, setLimiteClientes] = useState('')
  const [status, setStatus] = useState('ativo')

  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [buscaDigitada, setBuscaDigitada] = useState('')

  const [loading, setLoading] = useState(false)

  // 🔥 debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      setBusca(buscaDigitada)
    }, 400)

    return () => clearTimeout(timeout)
  }, [buscaDigitada])

  useEffect(() => {
    carregar()
  }, [busca])

  async function carregar() {
    let query = supabase
      .from('planos')
      .select('*')

    if (busca) {
      query = query.ilike('nome', `%${busca}%`)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setPlanos(data || [])
  }

  function limpar() {
    setNome('')
    setValor('')
    setLimiteFuncionarios('')
    setLimiteClientes('')
    setStatus('ativo')
    setEditandoId(null)
  }

  function editar(p: any) {
    setEditandoId(p.id)
    setNome(p.nome)
    setValor(p.valor)
    setLimiteFuncionarios(p.limite_funcionarios)
    setLimiteClientes(p.limite_clientes)
    setStatus(p.status)
  }

  async function salvar() {
    if (!nome || !valor) {
      alert('Preencha nome e valor')
      return
    }

    setLoading(true)

    const payload = {
      nome,
      valor: Number(valor),
      limite_funcionarios: Number(limiteFuncionarios) || 0,
      limite_clientes: Number(limiteClientes) || 0,
      status
    }

    let result

    if (editandoId) {
      result = await supabase
        .from('planos')
        .update(payload)
        .eq('id', editandoId)
    } else {
      result = await supabase
        .from('planos')
        .insert([payload])
    }

    if (result.error) {
      alert(result.error.message)
      setLoading(false)
      return
    }

    await carregar()
    limpar()
    setLoading(false)
  }

  async function alterarStatus(id: string, statusAtual: string) {
    const novo = statusAtual === 'ativo' ? 'inativo' : 'ativo'

    await supabase
      .from('planos')
      .update({ status: novo })
      .eq('id', id)

    await carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir plano?')) return

    await supabase
      .from('planos')
      .delete()
      .eq('id', id)

    await carregar()
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Planos</h1>

      {/* 🔎 BUSCA */}
      <div className="mb-4 flex gap-2">
        <input
          value={buscaDigitada}
          onChange={(e) => setBuscaDigitada(e.target.value)}
          placeholder="Buscar plano..."
          className="border p-2 rounded w-full"
        />

        <button
          onClick={() => {
            setBuscaDigitada('')
            setBusca('')
          }}
          className="bg-gray-500 text-white px-3 rounded text-sm"
        >
          Limpar
        </button>
      </div>

      {/* FORM */}
      <div className="grid grid-cols-5 gap-3 mb-6">

        <div>
          <label className="text-sm text-gray-600">Nome do plano</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Valor (R$)</label>
          <input
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Limite Funcionários</label>
          <input
            value={limiteFuncionarios}
            onChange={e => setLimiteFuncionarios(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Limite Clientes</label>
          <input
            value={limiteClientes}
            onChange={e => setLimiteClientes(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

      </div>

      <div className="mb-6">
        <button
          onClick={salvar}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          {loading ? 'Salvando...' : editandoId ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-2">
        {planos.map(p => (
          <div key={p.id} className="bg-white p-3 rounded shadow flex justify-between">

            <div>
              <strong>{p.nome}</strong>
              <p className="text-sm">R$ {p.valor}</p>
              <p className="text-sm">Funcionários: {p.limite_funcionarios}</p>
              <p className="text-sm">Clientes: {p.limite_clientes}</p>
              <p className={p.status === 'ativo' ? 'text-green-600' : 'text-red-600'}>
                {p.status}
              </p>
            </div>

            <div className="flex gap-2 items-center">

              <button
                onClick={() => editar(p)}
                className="bg-yellow-500 text-white px-2 py-1 text-xs rounded"
              >
                Editar
              </button>

              <button
                onClick={() => alterarStatus(p.id, p.status)}
                className="bg-gray-500 text-white px-2 py-1 text-xs rounded"
              >
                Status
              </button>

              <button
                onClick={() => excluir(p.id)}
                className="bg-red-600 text-white px-2 py-1 text-xs rounded"
              >
                Excluir
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}