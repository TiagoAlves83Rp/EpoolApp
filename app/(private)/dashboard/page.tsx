'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type DashboardDados = {
  clientesAtivos: number
  clientesInativos: number
  totalClientes: number
  funcionarios: number
  rotas: number
  visitasTotal: number
  visitasRealizadas: number
  visitasPendentes: number
  visitasCanceladas: number
  clientesVisitados: number
  rotasComVisita: number
  faturamentoPrevisto: number
  valorRecebido: number
  valorPendente: number
}

const dadosIniciais: DashboardDados = {
  clientesAtivos: 0,
  clientesInativos: 0,
  totalClientes: 0,
  funcionarios: 0,
  rotas: 0,
  visitasTotal: 0,
  visitasRealizadas: 0,
  visitasPendentes: 0,
  visitasCanceladas: 0,
  clientesVisitados: 0,
  rotasComVisita: 0,
  faturamentoPrevisto: 0,
  valorRecebido: 0,
  valorPendente: 0,
}

export default function DashboardPage() {
  const hoje = new Date().toISOString().slice(0, 10)

  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [visualizarValores, setVisualizarValores] = useState(true)
  const [dataInicial, setDataInicial] = useState(hoje)
  const [dataFinal, setDataFinal] = useState(hoje)
  const [dados, setDados] = useState<DashboardDados>(dadosIniciais)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (empresaId) carregarDashboard()
  }, [empresaId, dataInicial, dataFinal])

  async function init() {
    setErro(null)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setErro('Usuário não autenticado.')
      setLoading(false)
      return
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    if (usuarioError || !usuario?.empresa_id) {
      setErro('Não foi possível localizar a empresa do usuário.')
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

  async function carregarDashboard() {
    if (!empresaId) return

    setLoading(true)
    setErro(null)

    try {
      const [
        clientesResponse,
        funcionariosResponse,
        rotasResponse,
        visitasResponse,
      ] = await Promise.all([
        supabase.from('clientes').select('*').eq('empresa_id', empresaId),
        supabase
          .from('funcionarios')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
        supabase
          .from('rotas')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaId),
        supabase.from('visitas_registro').select('*').eq('empresa_id', empresaId),
      ])

      if (clientesResponse.error) throw clientesResponse.error
      if (funcionariosResponse.error) throw funcionariosResponse.error
      if (rotasResponse.error) throw rotasResponse.error
      if (visitasResponse.error) throw visitasResponse.error

      const clientes = clientesResponse.data || []
      const visitasTodas = visitasResponse.data || []

      const visitasPeriodo = visitasTodas.filter((visita: any) => {
        const dataVisita = pegarData(visita)
        if (!dataVisita) return false
        return dataVisita >= dataInicial && dataVisita <= dataFinal
      })

      const clientesAtivos = clientes.filter((cliente: any) =>
        estaAtivo(cliente)
      ).length

      const clientesInativos = clientes.length - clientesAtivos

      const visitasRealizadas = visitasPeriodo.filter((visita: any) =>
        statusInclui(visita, ['realizada', 'concluida', 'concluída', 'finalizada'])
      ).length

      const visitasCanceladas = visitasPeriodo.filter((visita: any) =>
        statusInclui(visita, ['cancelada', 'cancelado'])
      ).length

      const visitasPendentes =
        visitasPeriodo.length - visitasRealizadas - visitasCanceladas

      const clientesVisitados = new Set(
        visitasPeriodo
          .map((visita: any) => visita.cliente_id || visita.id_cliente)
          .filter(Boolean)
      ).size

      const rotasComVisita = new Set(
        visitasPeriodo
          .map((visita: any) => visita.rota_id || visita.id_rota)
          .filter(Boolean)
      ).size

      const faturamentoPrevisto = clientes
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

      const valorRecebido = visitasPeriodo.reduce((total: number, visita: any) => {
        if (
          statusInclui(visita, ['pago', 'recebido', 'quitado']) ||
          visita.pago === true ||
          visita.recebido === true
        ) {
          return (
            total +
            pegarValor(visita, [
              'valor',
              'valor_recebido',
              'preco',
              'preço',
              'total',
            ])
          )
        }

        return total
      }, 0)

      const valorPendente = Math.max(faturamentoPrevisto - valorRecebido, 0)

      setDados({
        clientesAtivos,
        clientesInativos,
        totalClientes: clientes.length,
        funcionarios: funcionariosResponse.count || 0,
        rotas: rotasResponse.count || 0,
        visitasTotal: visitasPeriodo.length,
        visitasRealizadas,
        visitasPendentes,
        visitasCanceladas,
        clientesVisitados,
        rotasComVisita,
        faturamentoPrevisto,
        valorRecebido,
        valorPendente,
      })
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error)
      setErro(error?.message || 'Erro ao carregar os dados do dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleVisualizacao() {
    if (!empresaId) return

    const novoValor = !visualizarValores
    setVisualizarValores(novoValor)

    await supabase
      .from('empresas')
      .update({ visualizar_valores: novoValor })
      .eq('id', empresaId)
  }

  const taxaConclusao = useMemo(() => {
    if (dados.visitasTotal === 0) return 0
    return Math.round((dados.visitasRealizadas / dados.visitasTotal) * 100)
  }, [dados.visitasTotal, dados.visitasRealizadas])

  function formatarMoeda(valor: number) {
    if (!visualizarValores) return 'R$ ****'

    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Admin</h1>
        <p className="text-sm text-gray-500">
          Resumo geral da empresa com base nos clientes, funcionários, rotas e
          registros de visitas.
        </p>
      </div>

      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Data inicial
            </label>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="border p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Data final
            </label>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="border p-2 w-full rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={carregarDashboard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2 transition"
            >
              Atualizar dashboard
            </button>
          </div>
        </div>
      </section>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {erro}
        </div>
      )}

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4">
          Carregando dados...
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card titulo="Clientes ativos" valor={dados.clientesAtivos} />
        <Card titulo="Clientes inativos" valor={dados.clientesInativos} />
        <Card titulo="Funcionários" valor={dados.funcionarios} />
        <Card titulo="Rotas cadastradas" valor={dados.rotas} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card titulo="Visitas no período" valor={dados.visitasTotal} />
        <Card titulo="Visitas realizadas" valor={dados.visitasRealizadas} />
        <Card titulo="Visitas pendentes" valor={dados.visitasPendentes} />
        <Card titulo="Taxa de conclusão" valor={`${taxaConclusao}%`} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card titulo="Clientes visitados" valor={dados.clientesVisitados} />
        <Card titulo="Rotas com visitas" valor={dados.rotasComVisita} />
        <Card titulo="Visitas canceladas" valor={dados.visitasCanceladas} />
      </section>

      <section className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Financeiro</h2>
            <p className="text-sm text-gray-500">
              Baseado nos valores cadastrados nos clientes e nos registros de
              visitas.
            </p>
          </div>

          <button
            onClick={toggleVisualizacao}
            className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition"
          >
            {visualizarValores ? 'Ocultar valores' : 'Mostrar valores'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceCard
            titulo="Faturamento previsto"
            valor={formatarMoeda(dados.faturamentoPrevisto)}
          />
          <FinanceCard
            titulo="Valor recebido"
            valor={formatarMoeda(dados.valorRecebido)}
          />
          <FinanceCard
            titulo="Valor pendente"
            valor={formatarMoeda(dados.valorPendente)}
          />
        </div>
      </section>
    </main>
  )
}

function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-gray-800 mt-2">{valor}</p>
    </div>
  )
}

function FinanceCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-gray-50 border rounded-xl p-4">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-gray-800 mt-2">{valor}</p>
    </div>
  )
}

function estaAtivo(registro: any) {
  const status = String(registro.status || '').toLowerCase()

  if (registro.ativo === true) return true
  if (status === 'ativo' || status === 'ativa') return true

  return false
}

function statusInclui(registro: any, statusPossiveis: string[]) {
  const status = String(
    registro.status ||
      registro.situacao ||
      registro.situação ||
      registro.status_visita ||
      ''
  ).toLowerCase()

  return statusPossiveis.some((item) => status.includes(item))
}

function pegarData(registro: any) {
  const data =
    registro.data ||
    registro.data_visita ||
    registro.data_registro ||
    registro.created_at

  if (!data) return null

  return String(data).slice(0, 10)
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