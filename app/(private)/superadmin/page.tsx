'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminDashboard() {
  const [rotas, setRotas] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    abertas: 0,
    finalizadas: 0,
    progresso: 0
  })

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {

    // 🔥 BUSCA ROTAS + VISITAS NOVA TABELA
    const { data: rotasData, error } = await supabase
      .from('rotas')
      .select(`
        id,
        status,
        visitas_registro (
          id,
          status
        )
      `)

    if (error) {
      console.error(error)
      return
    }

    setRotas(rotasData || [])

    calcularStats(rotasData || [])
  }

  function calcularStats(rotas: any[]) {

    let total = rotas.length
    let abertas = 0
    let finalizadas = 0

    let totalVisitas = 0
    let visitasConcluidas = 0

    rotas.forEach(r => {

      if (r.status === 'em_andamento' || r.status === 'pendente') {
        abertas++
      }

      if (r.status === 'finalizada') {
        finalizadas++
      }

      const visitas = r.visitas_registro || []

      totalVisitas += visitas.length

      visitasConcluidas += visitas.filter(
        (v: any) => v.status === 'concluido'
      ).length
    })

    const progresso =
      totalVisitas > 0
        ? Math.round((visitasConcluidas / totalVisitas) * 100)
        : 0

    setStats({
      total,
      abertas,
      finalizadas,
      progresso
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Total de rotas</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Rotas em aberto</p>
          <p className="text-2xl font-bold">{stats.abertas}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Rotas finalizadas</p>
          <p className="text-2xl font-bold">{stats.finalizadas}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Progresso geral</p>
          <p className="text-2xl font-bold">{stats.progresso}%</p>
        </div>

      </div>
    </div>
  )
}

