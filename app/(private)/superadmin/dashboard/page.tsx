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
  const [planos, setPlanos] = useState<any[]>([])

  const [grafico, setGrafico] = useState<any>({})

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    try {
      // 🏢 empresas + planos
      const { data: empresasData } = await supabase
        .from('empresas')
        .select(`
          *,
          planos (valor)
        `)

      // 🚀 execuções
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

  // 📊 GRAFICO POR DIA
  function gerarGrafico(lista: any[]) {
    const agrupado: any = {}

    lista.forEach(e => {
      if (!agrupado[e.data]) {
        agrupado[e.data] = 0
      }
      agrupado[e.data]++
    })

    setGrafico(agrupado)
  }

  // 💰 faturamento estimado
  const faturamento = empresas.reduce((total, e) => {
    return total + (e.planos?.valor || 0)
  }, 0)

  const empresasAtivas = empresas.filter(e => e.status === 'ativa').length

  return (
    <div>

      <h1 className="text-xl font-bold mb-4">
        Dashboard SaaS
      </h1>

      {/* 🔍 FILTRO */}
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end">

        <div>
          <p className="text-sm">Data início</p>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border p-2"
          />
        </div>

        <div>
          <p className="text-sm">Data fim</p>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border p-2"
          />
        </div>

        <button
          onClick={carregar}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Filtrar
        </button>

      </div>

      {loading && <p>Carregando...</p>}

      {/* 📊 KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white p-4 rounded shadow text-center">
          <p>Total Empresas</p>
          <strong className="text-2xl">
            {empresas.length}
          </strong>
        </div>

        <div className="bg-green-200 p-4 rounded shadow text-center">
          <p>Empresas Ativas</p>
          <strong className="text-2xl">
            {empresasAtivas}
          </strong>
        </div>

        <div className="bg-yellow-200 p-4 rounded shadow text-center">
          <p>Execuções</p>
          <strong className="text-2xl">
            {execucoes.length}
          </strong>
        </div>

        <div className="bg-purple-200 p-4 rounded shadow text-center">
          <p>Faturamento</p>
          <strong className="text-2xl">
            R$ {faturamento.toFixed(2)}
          </strong>
        </div>

      </div>

      {/* 📈 GRAFICO SIMPLES */}
      <div className="bg-white p-4 rounded shadow">

        <h2 className="font-bold mb-3">
          Execuções por dia
        </h2>

        <div className="space-y-2">

          {Object.keys(grafico).length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum dado no período
            </p>
          )}

          {Object.entries(grafico).map(([data, valor]: any) => (
            <div key={data}>

              <div className="flex justify-between text-xs">
                <span>{data}</span>
                <span>{valor}</span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded">
                <div
                  className="bg-blue-600 h-2 rounded"
                  style={{
                    width: `${valor * 10}%`
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