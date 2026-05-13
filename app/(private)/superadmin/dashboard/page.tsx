'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardSaaS() {
  const hoje = new Date().toISOString().split('T')[0]

  const [dataInicio, setDataInicio] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)
  const [loading, setLoading] = useState(true)

  const [empresas, setEmpresas] = useState<any[]>([])
  const [execucoes, setExecucoes] = useState<any[]>([])
  const [grafico, setGrafico] = useState<any>({})

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    try {
      const { data: empresasData } = await supabase
        .from('empresas')
        .select(`*, planos (valor)`)

      const { data: execData } = await supabase
        .from('rotas_execucao')
        .select('*')
        .gte('data', dataInicio)
        .lte('data', dataFim)

      setEmpresas(empresasData || [])
      setExecucoes(execData || [])
      gerarGrafico(execData || [])
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar dashboard')
    }
    setLoading(false)
  }

  function gerarGrafico(lista: any[]) {
    const agrupado: any = {}
    lista.forEach(e => {
      if (!agrupado[e.data]) agrupado[e.data] = 0
      agrupado[e.data]++
    })
    setGrafico(agrupado)
  }

  const faturamento = empresas.reduce((total, e) => {
    return total + (e.planos?.valor || 0)
  }, 0)

  const empresasAtivas = empresas.filter(e => e.status === 'ativa').length

  return (
    <div className="p-4 md:p-0">
      <h1 className="text-xl font-bold mb-4">Dashboard SaaS</h1>

      {/* 🔍 FILTRO - Responsivo: empilha no mobile, linha no desktop */}
      <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        <div className="flex-1">
          <p className="text-xs mb-1">Data início</p>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>

        <div className="flex-1">
          <p className="text-xs mb-1">Data fim</p>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          onClick={carregar}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
        >
          Filtrar
        </button>
      </div>

      {loading && <p className="mb-4 text-blue-600 animate-pulse">Carregando dados...</p>}

      {/* 📊 KPIs - 2 colunas no mobile, 4 no desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard titulo="Total Empresas" valor={empresas.length} />
        <KPICard titulo="Empresas Ativas" valor={empresasAtivas} cor="bg-green-200" />
        <KPICard titulo="Execuções" valor={execucoes.length} cor="bg-yellow-200" />
        <KPICard titulo="Faturamento" valor={`R$ ${faturamento.toFixed(2)}`} cor="bg-purple-200" />
      </div>

      {/* 📈 GRAFICO SIMPLES */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-4 text-gray-700">Execuções por dia</h2>
        <div className="space-y-4">
          {Object.keys(grafico).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum dado no período
            </p>
          )}

          {Object.entries(grafico).map(([data, valor]: any) => (
            <div key={data} className="group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600">{data}</span>
                <span className="font-bold">{valor}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{
                    // Cálculo simples para a barra não estourar 100%
                    width: `${Math.min((valor / (execucoes.length || 1)) * 100, 100)}%`,
                    minWidth: valor > 0 ? '5px' : '0'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Sub-componente para limpar o código principal
function KPICard({ titulo, valor, cor = "bg-white" }: any) {
  return (
    <div className={`${cor} p-4 rounded shadow text-center flex flex-col justify-center`}>
      <p className="text-xs md:text-sm text-gray-600 mb-1 leading-tight">{titulo}</p>
      <strong className="text-lg md:text-2xl truncate block">{valor}</strong>
    </div>
  )
}