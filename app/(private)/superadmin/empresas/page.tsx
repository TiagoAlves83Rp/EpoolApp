'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function EmpresasPage() {
  const [lista, setLista] = useState<any[]>([])
  const [planos, setPlanos] = useState<any[]>([])

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [planoId, setPlanoId] = useState('')
  const [status, setStatus] = useState('ativa')
  const [vencimento, setVencimento] = useState('')

  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [buscaDigitada, setBuscaDigitada] = useState('')

  const [loading, setLoading] = useState(false)

  // 🔥 MODAL SENHA
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaTemp, setSenhaTemp] = useState('')
  const [emailTemp, setEmailTemp] = useState('')

  // 🔎 debounce
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaDigitada), 400)
    return () => clearTimeout(t)
  }, [buscaDigitada])

  useEffect(() => {
    carregar()
    carregarPlanos()
  }, [busca])

  async function carregarPlanos() {
    const { data } = await supabase
      .from('planos')
      .select('*')

    setPlanos(data || [])
  }

  async function carregar() {
    let query = supabase
      .from('empresas')
      .select(`
        *,
        planos (nome, valor)
      `)

    if (busca) {
      query = query.ilike('nome', `%${busca}%`)
    }

    const { data } = await query
      .order('created_at', { ascending: false })

    setLista(data || [])
  }

  function limpar() {
    setNome('')
    setEmail('')
    setPlanoId('')
    setStatus('ativa')
    setVencimento('')
    setEditandoId(null)
  }

  function editar(e: any) {
    setEditandoId(e.id)

    setNome(e.nome)
    setEmail(e.email)
    setPlanoId(e.plano_id)
    setStatus(e.status)

    setVencimento(
      e.data_vencimento
        ? e.data_vencimento.slice(0, 10)
        : ''
    )
  }

  async function salvar() {

    if (!nome || !email || !planoId) {
      alert('Preencha nome, email e plano')
      return
    }

    setLoading(true)

    try {

      // 🔥 UPDATE
      if (editandoId) {

        const { error } = await supabase
          .from('empresas')
          .update({
            nome,
            email,
            plano_id: planoId,
            status,
            data_vencimento: vencimento || null
          })
          .eq('id', editandoId)

        if (error) {
          alert(error.message)
          setLoading(false)
          return
        }

      } else {

        // 🔥 INSERT VIA API
        const response = await fetch('/api/criar-empresa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome,
            email,
            plano_id: planoId,
            status,
            vencimento
          })
        })

        const data = await response.json()

        if (!response.ok) {
          alert(data.error || 'Erro ao criar empresa')
          setLoading(false)
          return
        }

        // 🔥 MOSTRAR SENHA TEMPORÁRIA
        setSenhaTemp(data.senha)
        setEmailTemp(data.email)
        setModalSenha(true)
      }

      await carregar()

      limpar()

    } catch (err) {
      console.error(err)
      alert('Erro ao salvar')
    }

    setLoading(false)
  }

  async function alterarStatus(id: string, atual: string) {

    const novo =
      atual === 'ativa'
        ? 'inativa'
        : 'ativa'

    await supabase
      .from('empresas')
      .update({
        status: novo
      })
      .eq('id', id)

    await carregar()
  }

  return (
    <div>

      <h1 className="text-xl font-bold mb-4">
        Empresas
      </h1>

      {/* 🔎 BUSCA */}
      <div className="mb-4 flex gap-2">

        <input
          value={buscaDigitada}
          onChange={(e) =>
            setBuscaDigitada(e.target.value)
          }
          placeholder="Buscar empresa..."
          className="border p-2 rounded w-full"
        />

      </div>

      {/* FORM */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 bg-white p-4 rounded shadow">

        <div>
          <label className="text-xs">
            Nome
          </label>

          <input
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            className="border p-2 w-full text-sm rounded"
          />
        </div>

        <div>
          <label className="text-xs">
            Email
          </label>

          <input
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="border p-2 w-full text-sm rounded"
          />
        </div>

        <div>
          <label className="text-xs">
            Plano
          </label>

          <select
            value={planoId}
            onChange={(e) =>
              setPlanoId(e.target.value)
            }
            className="border p-2 w-full text-sm rounded"
          >
            <option value="">
              Selecione
            </option>

            {planos.map(p => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.nome} (R$ {p.valor})
              </option>
            ))}

          </select>
        </div>

        <div>
          <label className="text-xs">
            Vencimento
          </label>

          <input
            type="date"
            value={vencimento}
            onChange={(e) =>
              setVencimento(e.target.value)
            }
            className="border p-2 w-full text-sm rounded"
          />
        </div>

        <div>
          <label className="text-xs">
            Status
          </label>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            className="border p-2 w-full text-sm rounded"
          >
            <option value="ativa">
              Ativa
            </option>

            <option value="inativa">
              Inativa
            </option>

          </select>
        </div>

      </div>

      <div className="mb-6 flex gap-2">

        <button
          onClick={salvar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded"
        >
          {loading
            ? 'Salvando...'
            : editandoId
              ? 'Atualizar'
              : 'Incluir'}
        </button>

        <button
          onClick={limpar}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 text-sm rounded"
        >
          Limpar
        </button>

      </div>

      {/* LISTA */}
      <div className="space-y-2">

        {lista.map(e => (

          <div
            key={e.id}
            className="bg-white p-3 rounded shadow flex justify-between items-center"
          >

            <div className="text-sm">

              <strong>{e.nome}</strong>

              <p>{e.email}</p>

              <p>
                {e.planos?.nome}
                {' '}-{' '}
                R$ {e.planos?.valor}
              </p>

              <p>
                Venc:
                {' '}
                {e.data_vencimento
                  ? new Date(e.data_vencimento)
                      .toLocaleDateString()
                  : '-'}
              </p>

              <p
                className={
                  e.status === 'ativa'
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {e.status}
              </p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => editar(e)}
                className="bg-yellow-500 text-white px-2 py-1 text-xs rounded"
              >
                Editar
              </button>

              <button
                onClick={() =>
                  alterarStatus(e.id, e.status)
                }
                className="bg-gray-600 text-white px-2 py-1 text-xs rounded"
              >
                Status
              </button>

            </div>

          </div>

        ))}

      </div>

      {/* 🔥 MODAL SENHA */}
      {modalSenha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

            <h2 className="text-xl font-bold mb-4 text-center">
              Empresa criada com sucesso
            </h2>

            <div className="bg-gray-100 rounded-lg p-4 mb-4 text-sm">

              <p className="mb-2">
                <strong>Email:</strong>
              </p>

              <div className="bg-white border rounded p-2 mb-4 break-all">
                {emailTemp}
              </div>

              <p className="mb-2">
                <strong>Senha temporária:</strong>
              </p>

              <div className="bg-white border rounded p-2 font-bold text-blue-700 text-base">
                {senhaTemp}
              </div>

            </div>

            <p className="text-xs text-gray-500 mb-4 text-center">
              Guarde essa senha. Depois você poderá enviar por e-mail automaticamente.
            </p>

            <button
              onClick={() => setModalSenha(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
            >
              Fechar
            </button>

          </div>

        </div>
      )}

    </div>
  )
}