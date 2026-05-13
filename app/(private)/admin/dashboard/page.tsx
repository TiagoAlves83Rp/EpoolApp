'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [visualizarValores, setVisualizarValores] = useState(true)

  const hoje = new Date().toISOString().slice(0, 10)
  const [dataInicial, setDataInicial] = useState(hoje)
  const [dataFinal, setDataFinal] = useState(hoje)

  const [dados, setDados] = useState({
    clientesAtivos: 0,
    clientesInativos: 0,
    funcionarios: 0,
    rotas: 0,
    rotasExecutadas: 0,
    faturamento: 0,
    recebido: 0,
    pendente: 0
  })

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (empresaId) carregar()
  }, [dataInicial, dataFinal, empresaId])

  async function init() {
    const { data } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', data.user?.id)
      .single()

    setEmpresaId(usuario?.empresa_id)

    const { data: empresa } = await supabase
      .from('empresas')
      .select('visualizar_valores')
      .eq('id', usuario?.empresa_id)
      .single()

    setVisualizarValores(empresa?.visualizar_valores ?? true)
  }

  async function carregar() {
    setLoading(true)
    const { data: clientes } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)

    const ativos = clientes?.filter(c => c.status === 'ativo').length || 0
    const inativos = clientes?.filter(c => c.status !== 'ativo').length || 0

    const { count: funcionarios } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)

    const { count: rotas } = await supabase
      .from('rotas')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)

    const { data: execucoes } = await supabase
      .from('rotas_execucao')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data', dataInicial)
      .lte('data', dataFinal)

    const rotasExecutadas = execucoes?.length || 0

    const valorMensal = 100
    const faturamento = ativos * valorMensal
    const recebido = faturamento * 0.7
    const pendente = faturamento - recebido

    setDados({
      clientesAtivos: ativos,
      clientesInativos: inativos,
      funcionarios: funcionarios || 0,
      rotas: rotas || 0,
      rotasExecutadas,
      faturamento,
      recebido,
      pendente
    })
    setLoading(false)
  }

  async function toggleVisualizacao() {
    const novo = !visualizarValores
    setVisualizarValores(novo)
    await supabase
      .from('empresas')
      .update({ visualizar_valores: novo })
      .eq('id', empresaId)
  }

  function formatar(valor: number) {
    if (!visualizarValores) return '****'
    return `R$ ${valor.toFixed(2)}`
  }

  return (
    <div className="p-4 md:p-0">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* 💰 FINANCEIRO (TOPO) - Ajustado para grid responsivo */}
      <div className="bg-white p-5 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Financeiro</h2>
          <button
            onClick={toggleVisualizacao}
            className="text-sm bg-gray-800 text-white px-3 py-1 rounded"
          >
            {visualizarValores ? '👁️ Ocultar' : '👁️ Mostrar'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceCard titulo="Faturamento" valor={formatar(dados.faturamento)} cor="bg-blue-100" />
          <FinanceCard titulo="Recebido" valor={formatar(dados.recebido)} cor="bg-green-100" />
          <FinanceCard titulo="Pendente" valor={formatar(dados.pendente)} cor="bg-red-100" />
        </div>
      </div>

      {/* 📅 FILTRO - Ajustado para empilhar no celular */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded shadow">
        <div className="flex-1">
          <label className="text-xs block mb-1">Data Inicial</label>
          <input
            type="date"
            value={dataInicial}
            onChange={e => setDataInicial(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs block mb-1">Data Final</label>
          <input
            type="date"
            value={dataFinal}
            onChange={e => setDataFinal(e.target.value)}
            className="border p-2 w-full"
          />
        </div>
      </div>

      {loading && <p className="mb-4">Carregando...</p>}

      {/* 📊 KPIs - Ajustado: 2 colunas no celular, 4 no desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card titulo="Clientes Ativos" valor={dados.clientesAtivos} cor="bg-green-200" />
        <Card titulo="Clientes Inativos" valor={dados.clientesInativos} cor="bg-red-200" />
        <Card titulo="Funcionários" valor={dados.funcionarios} cor="bg-blue-200" />
        <Card titulo="Rotas Cadastradas" valor={dados.rotas} cor="bg-purple-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card titulo="Rotas Executadas" valor={dados.rotasExecutadas} cor="bg-yellow-200" />
      </div>
    </div>
  )
}

// COMPONENTES

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