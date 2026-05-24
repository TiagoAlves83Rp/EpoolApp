'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function dataLocalHoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function criarDataLocal(dataISO: string) {
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

async function uploadFoto(file: File) {
  const nomeLimpo = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '')

  const fileName = `${Date.now()}-${nomeLimpo}`

  const { error } = await supabase.storage
    .from('visitas')
    .upload(fileName, file)

  if (error) throw new Error('Erro ao enviar foto')

  const { data } = supabase.storage.from('visitas').getPublicUrl(fileName)

  return data.publicUrl
}

export default function FuncionarioPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [funcionario, setFuncionario] = useState<any>(null)
  const [visitas, setVisitas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [fotos, setFotos] = useState<File[]>([])
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)

  const hoje = dataLocalHoje()

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: func } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      if (!func) return
      setFuncionario(func)

      const { data: rotaData, error: rotaError } = await supabase
        .from('rota_clientes')
        .select(`
          rota_id,
          clientes (
            id,
            nome,
            endereco,
            numero,
            bairro,
            telefone,
            frequencia,
            data_proxima_visita
          ),
          rotas (
            id,
            funcionario_id
          )
        `)
        .eq('rotas.funcionario_id', func.id)

      if (rotaError) throw rotaError

      const listaClientes =
        rotaData
          ?.map((item: any) => ({
            ...item.clientes,
            rota_id: item.rota_id,
          }))
          .filter((cliente: any) => cliente?.id)
          .filter((cliente: any) => {
            if (!cliente.data_proxima_visita) return false
            return String(cliente.data_proxima_visita).slice(0, 10) <= hoje
          }) || []

      listaClientes.sort((a: any, b: any) =>
        String(a.data_proxima_visita).localeCompare(
          String(b.data_proxima_visita)
        )
      )

      setClientes(listaClientes)

      const { data: visitasData, error: visitasError } = await supabase
        .from('visitas_registro')
        .select('*')
        .eq('funcionario_id', func.id)
        .order('data_execucao', { ascending: false })
        .order('created_at', { ascending: false })

      if (visitasError) throw visitasError

      setVisitas(visitasData || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function calcularProximaData(frequencia: string) {
    const data = new Date()
    const f = frequencia?.toLowerCase()

    if (f === 'semanal') data.setDate(data.getDate() + 7)
    else if (f === 'quinzenal') data.setDate(data.getDate() + 15)
    else if (f === 'mensal') data.setDate(data.getDate() + 30)
    else data.setDate(data.getDate() + 1)

    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return 'Sem data'
    const [ano, mes, dia] = String(dataISO).slice(0, 10).split('-')
    return `${dia}/${mes}/${ano}`
  }

  function calcularDiasAtraso(dataISO: string) {
    if (!dataISO) return 0

    const dataAgendada = criarDataLocal(dataISO)
    const dataHoje = criarDataLocal(hoje)

    const diferenca = dataHoje.getTime() - dataAgendada.getTime()
    return Math.max(0, Math.floor(diferenca / (1000 * 60 * 60 * 24)))
  }

  function getDataVisita(visita: any) {
    return String(
      visita?.data_execucao ||
        visita?.data_visita ||
        visita?.created_at ||
        ''
    ).slice(0, 10)
  }

  function getUltimaVisitaConcluida(clienteId: string) {
    return visitas.find(
      (v) => v.cliente_id === clienteId && v.status === 'concluido'
    )
  }

  function getStatusAtual(cliente: any) {
    const dataProximaVisita = String(cliente.data_proxima_visita).slice(0, 10)

    const visitaEmAtendimento = visitas.find(
      (v) => v.cliente_id === cliente.id && v.status === 'em_atendimento'
    )

    if (visitaEmAtendimento) return 'em_atendimento'

    const visitaConcluidaDaDataAtual = visitas.find((v) => {
      const dataVisita = getDataVisita(v)

      return (
        v.cliente_id === cliente.id &&
        v.status === 'concluido' &&
        dataVisita >= dataProximaVisita
      )
    })

    if (visitaConcluidaDaDataAtual) return 'concluido'

    return 'pendente'
  }

  async function checkIn(cliente: any) {
    if (!funcionario || !cliente?.rota_id) return

    const { error } = await supabase.from('visitas_registro').insert([
      {
        cliente_id: cliente.id,
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        rota_id: cliente.rota_id,
        data_execucao: hoje,
        status: 'em_atendimento',
        checkin_at: new Date().toISOString(),
      },
    ])

    if (error) alert('Erro ao iniciar atendimento.')
    else carregarDados()
  }

  async function checkOut(cliente: any) {
    const visita = visitas.find(
      (v) => v.cliente_id === cliente.id && v.status === 'em_atendimento'
    )

    if (!visita) return
    if (fotos.length < 2) return alert('Por favor, tire pelo menos 2 fotos.')
    if (!observacao) return alert('Descreva brevemente o serviço.')

    setEnviando(true)

    try {
      const urls: string[] = []

      for (const foto of fotos) {
        const url = await uploadFoto(foto)
        urls.push(url)
      }

      const novaData = calcularProximaData(cliente.frequencia)

      await supabase
        .from('visitas_registro')
        .update({
          status: 'concluido',
          checkout_at: new Date().toISOString(),
          observacao,
          fotos: urls,
        })
        .eq('id', visita.id)

      await supabase
        .from('clientes')
        .update({ data_proxima_visita: novaData })
        .eq('id', cliente.id)

      setFotos([])
      setObservacao('')
      carregarDados()
    } catch (err) {
      alert('Erro ao salvar dados.')
    } finally {
      setEnviando(false)
    }
  }

  const resumo = useMemo(() => {
    const concluidas = clientes.filter((c) => getStatusAtual(c) === 'concluido')
      .length

    const emAtendimento = clientes.filter(
      (c) => getStatusAtual(c) === 'em_atendimento'
    ).length

    const atrasadas = clientes.filter(
      (c) =>
        String(c.data_proxima_visita).slice(0, 10) < hoje &&
        getStatusAtual(c) !== 'concluido'
    ).length

    return {
      total: clientes.length,
      concluidas,
      emAtendimento,
      atrasadas,
      pendentes: clientes.length - concluidas - emAtendimento,
    }
  }, [clientes, visitas])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600 border-solid"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="py-8 border-b border-slate-300 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Roteiro de Visitas
            </h1>
            <p className="text-slate-600 mt-1">
              Olá, {funcionario?.nome || 'Funcionário'}! Veja suas visitas de
              hoje e pendências atrasadas.
            </p>
          </div>

          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-300 shadow-sm self-start">
            <span className="text-xs font-black text-slate-700 uppercase">
              📅 Hoje: {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <ResumoCard titulo="Total" valor={resumo.total} cor="text-slate-900" />
          <ResumoCard titulo="Atrasadas" valor={resumo.atrasadas} cor="text-red-700" />
          <ResumoCard titulo="Pendentes" valor={resumo.pendentes} cor="text-amber-700" />
          <ResumoCard titulo="Em atendimento" valor={resumo.emAtendimento} cor="text-blue-700" />
          <ResumoCard titulo="Concluídas" valor={resumo.concluidas} cor="text-green-700" />
        </section>

        {clientes.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-300 shadow-sm">
            <p className="text-slate-600 text-lg font-semibold">
              Nenhuma visita pendente para hoje.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((c, idx) => {
              const status = getStatusAtual(c)
              const isConcluido = status === 'concluido'
              const isAtendimento = status === 'em_atendimento'
              const diasAtraso = calcularDiasAtraso(c.data_proxima_visita)
              const isAtrasado = diasAtraso > 0 && !isConcluido
              const ultimaVisita = getUltimaVisitaConcluida(c.id)

              const cardStyle = isConcluido
                ? 'bg-green-50 border-green-300'
                : isAtendimento
                ? 'bg-blue-50 border-blue-300 shadow-md'
                : isAtrasado
                ? 'bg-red-50 border-red-300 shadow-md'
                : 'bg-white border-slate-300 shadow-sm hover:shadow-md'

              const barraStyle = isConcluido
                ? 'bg-green-600'
                : isAtendimento
                ? 'bg-blue-600'
                : isAtrasado
                ? 'bg-red-600'
                : 'bg-amber-500'

              return (
                <div
                  key={c.id}
                  className={`group relative flex flex-col rounded-3xl border-2 transition-all duration-300 ${cardStyle}`}
                >
                  <div
                    className={`absolute top-6 left-0 w-2 h-16 rounded-r-full ${barraStyle}`}
                  />

                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                          {c.frequencia || 'Recorrente'}
                        </span>

                        {isConcluido ? (
                          <span className="bg-green-700 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            Concluída
                          </span>
                        ) : isAtendimento ? (
                          <span className="bg-blue-700 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            Em atendimento
                          </span>
                        ) : isAtrasado ? (
                          <span className="bg-red-700 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            Em atraso
                          </span>
                        ) : (
                          <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                            Hoje
                          </span>
                        )}
                      </div>

                      <span className="text-xl font-black text-slate-300">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3
                      className={`text-xl font-bold leading-tight mb-3 ${
                        isConcluido
                          ? 'text-green-800 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {c.nome}
                    </h3>

                    <div className="mb-5 rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500 mb-1">
                          Próxima visita
                        </p>

                        <p
                          className={`text-sm font-black ${
                            isAtrasado ? 'text-red-700' : 'text-blue-700'
                          }`}
                        >
                          {isAtrasado
                            ? `Atrasada desde ${formatarData(c.data_proxima_visita)}`
                            : `Agendada para ${formatarData(c.data_proxima_visita)}`}
                        </p>

                        {isAtrasado && (
                          <p className="text-xs text-red-600 font-semibold mt-1">
                            {diasAtraso === 1
                              ? '1 dia de atraso'
                              : `${diasAtraso} dias de atraso`}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-xs font-black uppercase text-slate-500 mb-1">
                          Última visita
                        </p>

                        <p className="text-sm font-bold text-slate-700">
                          {ultimaVisita
                            ? formatarData(getDataVisita(ultimaVisita))
                            : 'Nenhuma visita concluída'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 mb-6 flex-grow">
                      <p className="text-sm text-slate-700 flex items-start gap-2 font-semibold">
                        📍 {c.endereco}, {c.numero}
                      </p>

                      <p className="text-xs text-slate-500 ml-5 font-medium">
                        {c.bairro}
                      </p>

                      {c.telefone && (
                        <p className="text-xs text-slate-500 ml-5 font-medium">
                          📞 {c.telefone}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-200">
                      {status === 'pendente' && (
                        <button
                          onClick={() => checkIn(c)}
                          className={`w-full ${
                            isAtrasado
                              ? 'bg-red-700 hover:bg-red-800 shadow-red-100'
                              : 'bg-blue-700 hover:bg-blue-800 shadow-blue-100'
                          } active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-md`}
                        >
                          Iniciar Check-in
                        </button>
                      )}

                      {isAtendimento && (
                        <div className="space-y-4">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            id={`file-${c.id}`}
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              setFotos((p) => [...p, e.target.files![0]])
                            }
                          />

                          <label
                            htmlFor={`file-${c.id}`}
                            className="w-full border-2 border-dashed border-blue-300 bg-white rounded-2xl py-4 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <span className="text-blue-700 text-sm font-bold">
                              + Foto do Serviço
                            </span>
                            <span className="text-[10px] text-blue-600 font-medium">
                              Mínimo 2 fotos
                            </span>
                          </label>

                          {fotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {fotos.map((_, i) => (
                                <div
                                  key={i}
                                  className="flex-shrink-0 bg-blue-700 text-white text-[10px] px-3 py-1 rounded-full font-bold"
                                >
                                  📷 FOTO {i + 1}
                                </div>
                              ))}
                            </div>
                          )}

                          <textarea
                            className="w-full border border-slate-300 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            placeholder="Notas da visita..."
                            rows={2}
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                          />

                          <button
                            onClick={() => checkOut(c)}
                            disabled={enviando}
                            className="w-full bg-green-700 hover:bg-green-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 disabled:bg-slate-300 transition-all"
                          >
                            {enviando ? 'PROCESSANDO...' : 'FINALIZAR VISITA'}
                          </button>
                        </div>
                      )}

                      {isConcluido && (
                        <div className="bg-green-100 rounded-2xl p-4 flex flex-col items-center text-center border border-green-300">
                          <span className="text-green-900 text-xs font-bold uppercase tracking-wider">
                            Trabalho Concluído
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ResumoCard({
  titulo,
  valor,
  cor,
}: {
  titulo: string
  valor: number
  cor: string
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-500 uppercase">
        {titulo}
      </p>
      <p className={`text-2xl font-black mt-1 ${cor}`}>{valor}</p>
    </div>
  )
}