'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type DashboardDados = {
  clientesAtivos: number
  clientesInativos: number
  funcionarios: number
  rotas: number

  visitasAgendadas: number
  visitasPendentes: number
  visitasEmAtendimento: number
  visitasConcluidas: number
  visitasAtrasadas: number
  checkinsCancelados: number

  clientesVisitados: number
  rotasComVisita: number

  faturamento: number
  recebido: number
  pendente: number
}

function dataLocalHoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function DashboardPage() {
  const hoje = dataLocalHoje()

  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [visualizarValores, setVisualizarValores] = useState(true)

  const [dataInicial, setDataInicial] = useState(hoje)
  const [dataFinal, setDataFinal] = useState(hoje)

  const [dados, setDados] = useState<DashboardDados>({
    clientesAtivos: 0,
    clientesInativos: 0,
    funcionarios: 0,
    rotas: 0,

    visitasAgendadas: 0,
    visitasPendentes: 0,
    visitasEmAtendimento: 0,
    visitasConcluidas: 0,
    visitasAtrasadas: 0,
    checkinsCancelados: 0,

    clientesVisitados: 0,
    rotasComVisita: 0,

    faturamento: 0,
    recebido: 0,
    pendente: 0,
  })

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (empresaId) carregar()
  }, [dataInicial, dataFinal, empresaId])

  async function init() {
    setLoading(true)

    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      setLoading(false)
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', data.user.id)
      .single()

    if (!usuario?.empresa_id) {
      setLoading(false)
      return
    }

    setEmpresaId(usuario.empresa_id)

    const { data: empresa } = await supabase
      .from('empresas')
      .select('visualizar_valores')
      .eq('id', usuario.empresa_id)
      .single()

    setVisualizarValores(empresa?.visualizar_valores ?? true)
  }

  async function carregar() {
    if (!empresaId) return

    setLoading(true)

    try {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)

      const clientesLista = clientes || []

      const ativos = clientesLista.filter((c: any) => estaAtivo(c)).length
      const inativos = clientesLista.length - ativos

      const { count: funcionarios } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)

      const { count: rotas } = await supabase
        .from('rotas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)

      const { data: visitasData } = await supabase
        .from('visitas_registro')
        .select('*')
        .eq('empresa_id', empresaId)
        .or(
          `data_agendada.gte.${dataInicial},data_execucao.gte.${dataInicial}`
        )

      const visitasTodas = visitasData || []

      const visitasPeriodo = visitasTodas.filter((visita: any) => {
        const dataBase = getDataReferencia(visita)
        if (!dataBase) return false
        return dataBase >= dataInicial && dataBase <= dataFinal
      })

      const visitasAgendadas = visitasPeriodo.filter((v: any) =>
        ['pendente', 'em_atendimento', 'concluido'].includes(v.status)
      ).length

      const visitasPendentes = visitasPeriodo.filter(
        (v: any) => v.status === 'pendente'
      ).length

      const visitasEmAtendimento = visitasPeriodo.filter(
        (v: any) => v.status === 'em_atendimento'
      ).length

      const visitasConcluidas = visitasPeriodo.filter(
        (v: any) => v.status === 'concluido'
      ).length

      const visitasAtrasadas = visitasTodas.filter((v: any) => {
        const dataAgendada = getDataAgendada(v)

        return (
          v.status === 'pendente' &&
          dataAgendada &&
          dataAgendada < hoje
        )
      }).length

      const checkinsCancelados = visitasPeriodo.filter((v: any) => {
        return Boolean(v.observacao_cancelamento || v.checkin_cancelado_at)
      }).length

      const clientesVisitados = new Set(
        visitasPeriodo
          .filter((v: any) => v.status === 'concluido')
          .map((v: any) => v.cliente_id)
          .filter(Boolean)
      ).size

      const rotasComVisita = new Set(
        visitasPeriodo
          .filter((v: any) => ['em_atendimento', 'concluido'].includes(v.status))
          .map((v: any) => v.rota_id)
          .filter(Boolean)
      ).size

      const faturamento = clientesLista
        .filter((cliente: any) => estaAtivo(cliente))
        .reduce((total: number, cliente: any) => {
          return total + pegarValor(cliente, [
            'valor_mensal',
            'mensalidade',
            'valor',
            'preco',
            'preço',
            'valor_contrato',
          ])
        }, 0)

      const recebido = visitasPeriodo
        .filter((v: any) => v.status === 'concluido')
        .reduce((total: number, visita: any) => {
          return total + pegarValor(visita, [
            'valor',
            'valor_recebido',
            'total',
            'preco',
            'preço',
          ])
        }, 0)

      const pendente = Math.max(faturamento - recebido, 0)

      setDados({
        clientesAtivos: ativos,
        clientesInativos: inativos,
        funcionarios: funcionarios || 0,
        rotas: rotas || 0,

        visitasAgendadas,
        visitasPendentes,
        visitasEmAtendimento,
        visitasConcluidas,
        visitasAtrasadas,
        checkinsCancelados,

        clientesVisitados,
        rotasComVisita,

        faturamento,
        recebido,
        pendente,
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleVisualizacao() {
    if (!empresaId) return

    const novo = !visualizarValores
    setVisualizarValores(novo)

    await supabase
      .from('empresas')
      .update({ visualizar_valores: novo })
      .eq('id', empresaId)
  }

  function formatar(valor: number) {
    if (!visualizarValores) return 'R$ ****'

    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div className="p-4 md:p-0">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded shadow">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            className="border p-2 w-full rounded outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            className="border p-2 w-full rounded outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white p-5 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold">Financeiro</h2>
            <p className="text-xs text-gray-500">
              Baseado nos valores cadastrados e nas visitas concluídas.
            </p>
          </div>

          <button
            onClick={toggleVisualizacao}
            className="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            {visualizarValores ? '👁️ Ocultar' : '👁️ Mostrar'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceCard titulo="Faturamento previsto" valor={formatar(dados.faturamento)} cor="bg-blue-100" />
          <FinanceCard titulo="Recebido" valor={formatar(dados.recebido)} cor="bg-green-100" />
          <FinanceCard titulo="Pendente" valor={formatar(dados.pendente)} cor="bg-red-100" />
        </div>
      </div>

      {loading && (
        <p className="mb-4 text-blue-600 font-medium">
          Carregando dados...
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card titulo="Clientes Ativos" valor={dados.clientesAtivos} cor="bg-green-200" />
        <Card titulo="Clientes Inativos" valor={dados.clientesInativos} cor="bg-red-200" />
        <Card titulo="Funcionários" valor={dados.funcionarios} cor="bg-blue-200" />
        <Card titulo="Rotas Cadastradas" valor={dados.rotas} cor="bg-purple-200" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <Card titulo="Visitas Agendadas" valor={dados.visitasAgendadas} cor="bg-slate-200" />
        <Card titulo="Pendentes" valor={dados.visitasPendentes} cor="bg-yellow-200" />
        <Card titulo="Em Atendimento" valor={dados.visitasEmAtendimento} cor="bg-blue-200" />
        <Card titulo="Concluídas" valor={dados.visitasConcluidas} cor="bg-green-200" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <Card titulo="Atrasadas" valor={dados.visitasAtrasadas} cor="bg-red-300" />
        <Card titulo="Check-ins Cancelados" valor={dados.checkinsCancelados} cor="bg-orange-200" />
        <Card titulo="Clientes Visitados" valor={dados.clientesVisitados} cor="bg-emerald-200" />
        <Card titulo="Rotas com Visita" valor={dados.rotasComVisita} cor="bg-indigo-200" />
      </div>
    </div>
  )
}

function Card({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} p-4 rounded shadow text-center flex flex-col justify-center min-h-[100px]`}>
      <p className="text-xs md:text-sm font-medium mb-1">{titulo}</p>
      <strong className="text-xl md:text-2xl break-words">{valor}</strong>
    </div>
  )
}

function FinanceCard({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} p-4 rounded text-center`}>
      <p className="text-sm font-medium">{titulo}</p>
      <strong className="text-lg md:text-xl break-words">{valor}</strong>
    </div>
  )
}

function estaAtivo(cliente: any) {
  const status = String(cliente.status || '').toLowerCase()

  if (cliente.ativo === true) return true
  if (status === 'ativo' || status === 'ativa') return true

  return false
}

function getDataAgendada(visita: any) {
  return String(visita?.data_agendada || '').slice(0, 10)
}

function getDataExecucao(visita: any) {
  return String(
    visita?.data_execucao ||
      visita?.data_visita ||
      visita?.created_at ||
      ''
  ).slice(0, 10)
}

function getDataReferencia(visita: any) {
  if (visita.status === 'concluido') {
    return getDataExecucao(visita)
  }

  return getDataAgendada(visita) || getDataExecucao(visita)
}

function pegarValor(registro: any, campos: string[]) {
  for (const campo of campos) {
    const valor = registro[campo]

    if (valor !== undefined && valor !== null && valor !== '') {
      const numero = Number(String(valor).replace(',', '.'))

      if (!Number.isNaN(numero)) {
        return numero
      }
    }
  }

  return 0
}