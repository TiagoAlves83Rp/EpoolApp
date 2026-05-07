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
    if (!empresaId) return

    let query = supabase
      .from('funcionarios')
      .select('*')
      .eq('empresa_id', empresaId)

    if (busca) {
      query = query.ilike('nome', `%${busca}%`)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setLista(data || [])
  }

  function abrirModal(f?: any) {
    setErro('')

    if (f) {
      setEditando(f)

      setForm({
        ...f,
        salario: f.salario
          ? Number(f.salario).toLocaleString('pt-BR', {
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
        salario: '',
        anotacoes: '',
        status: 'ativo'
      })
    }

    setModal(true)
  }

  function fecharModal() {
    setModal(false)
  }

  function formatTelefone(v: string) {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  function formatCEP(v: string) {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9)
  }

  function formatMoeda(v: string) {
    v = v.replace(/\D/g, '')
    const numero = Number(v) / 100

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function moedaParaNumero(v: string) {
    return Number(v.replace(/\D/g, '')) / 100
  }

  function validar() {
    if (!form.nome) return 'Nome é obrigatório'
    if (!form.telefone) return 'Telefone é obrigatório'
    if (!form.cidade) return 'Cidade é obrigatória'
    if (!form.uf) return 'UF é obrigatória'
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

    try {

      // EDITAR
      if (editando) {

        const payload = {
          ...form,
          empresa_id: empresaId,
          salario: moedaParaNumero(form.salario)
        }

        const result = await supabase
          .from('funcionarios')
          .update(payload)
          .eq('id', editando.id)

        if (result.error) {
          setErro(result.error.message)
          setLoading(false)
          return
        }

      } else {

        // BUSCA EMPRESA
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nome')
          .eq('id', empresaId)
          .single()

        if (!empresa) {
          setErro('Empresa não encontrada')
          setLoading(false)
          return
        }

        // GERA LOGIN
        const nomeEmpresa = empresa.nome
          .replace(/\s/g, '')
          .toLowerCase()

        const nomeFuncionario = form.nome
          .replace(/\s/g, '.')
          .toLowerCase()

        const email = `${nomeEmpresa}.${nomeFuncionario}@epool.com`

        // CHAMA API
        const response = await fetch('/api/criar-funcionario', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: form.nome,
            email,
            empresa_id: empresaId
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setErro(data.error || 'Erro ao criar funcionário')
          setLoading(false)
          return
        }

        // ATUALIZA DADOS
        const { data: funcionarioCriado } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('usuario_id', data.userId)
          .single()

        if (funcionarioCriado) {

          await supabase
            .from('funcionarios')
            .update({
              telefone: form.telefone,
              endereco: form.endereco,
              numero: form.numero,
              bairro: form.bairro,
              cep: form.cep,
              cidade: form.cidade,
              uf: form.uf,
              salario: moedaParaNumero(form.salario),
              anotacoes: form.anotacoes,
              status: form.status
            })
            .eq('id', funcionarioCriado.id)

        }

        alert(
`Funcionário criado com sucesso!

Login:
${email}

Senha temporária:
${data.senhaTemporaria}`
        )
      }

      await carregar()
      fecharModal()

    } catch (err: any) {
      setErro(err.message || 'Erro inesperado')
    }

    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Funcionários</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar..."
          className="border p-1.5 text-sm w-full rounded"
        />

        <button
          onClick={() => abrirModal()}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Novo
        </button>
      </div>

      <div className="space-y-2">
        {lista.map(f => (
          <div
            key={f.id}
            className="bg-white p-4 rounded shadow flex justify-between"
          >
            <div>
              <strong>{f.nome}</strong>

              <p className="text-sm">{f.telefone}</p>

              <p
                className={
                  f.status === 'ativo'
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {f.status}
              </p>
            </div>

            <button
              onClick={() => abrirModal(f)}
              className="bg-blue-700 text-white px-3 py-1 rounded text-xs"
            >
              Detalhes
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">

          <div className="bg-white p-4 rounded w-full max-w-[560px] max-h-[90vh] overflow-y-auto">

            <h2 className="font-bold mb-4">
              {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
            </h2>

            {erro && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm break-words">
                {erro}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <div>
                <label className="text-sm">
                  Nome <span className="text-red-500">*</span>
                </label>

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
                <label className="text-sm">
                  Telefone <span className="text-red-500">*</span>
                </label>

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
                <label className="text-sm">CEP</label>

                <input
                  value={form.cep}
                  onChange={e =>
                    setForm({
                      ...form,
                      cep: formatCEP(e.target.value)
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                />
              </div>

              <div>
                <label className="text-sm">Endereço</label>

                <input
                  value={form.endereco}
                  onChange={e =>
                    setForm({
                      ...form,
                      endereco: e.target.value
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                />
              </div>

              <div>
                <label className="text-sm">
                  Cidade <span className="text-red-500">*</span>
                </label>

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
                <label className="text-sm">
                  UF <span className="text-red-500">*</span>
                </label>

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

              <div>
                <label className="text-sm">Salário</label>

                <input
                  value={form.salario}
                  onChange={e =>
                    setForm({
                      ...form,
                      salario: formatMoeda(e.target.value)
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                />
              </div>

              <div>
                <label className="text-sm">Status</label>

                <select
                  value={form.status}
                  onChange={e =>
                    setForm({
                      ...form,
                      status: e.target.value
                    })
                  }
                  className="border p-1.5 text-sm w-full rounded"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
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
                onClick={fecharModal}
                className="bg-gray-400 px-4 py-2 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="bg-blue-600 text-white px-4 py-2 rounded"
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