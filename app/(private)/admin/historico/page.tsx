'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function HistoricoPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [registros, setRegistros] = useState<any[]>([])

  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')

  const [clienteBusca, setClienteBusca] = useState('')
  const [funcionarioBusca, setFuncionarioBusca] = useState('')

  const [loading, setLoading] = useState(false)

  // 🔥 MODAL FOTO
  const [fotoModal, setFotoModal] = useState('')

  useEffect(() => {
    carregarEmpresa()
  }, [])

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

    if (!data?.empresa_id) return

    setEmpresaId(data.empresa_id)
  }

  async function filtrar() {
    if (!empresaId) return

    setLoading(true)

    let query = supabase
      .from('visitas_registro')
      .select(`
        *,
        clientes!visitas_registro_cliente_id_fkey (
          nome
        ),
        rotas!visitas_registro_rota_id_fkey (
          nome,
          funcionarios!rotas_funcionario_id_fkey (
            nome
          )
        )
      `)
      .eq('empresa_id', empresaId)
      .order('data_execucao', { ascending: false })

    if (dataInicial) {
      query = query.gte('data_execucao', dataInicial)
    }

    if (dataFinal) {
      query = query.lte('data_execucao', dataFinal)
    }

    const { data, error } = await query

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    let resultado = data || []

    if (clienteBusca) {
      resultado = resultado.filter((v: any) =>
        v.clientes?.nome
          ?.toLowerCase()
          .includes(clienteBusca.toLowerCase())
      )
    }

    if (funcionarioBusca) {
      resultado = resultado.filter((v: any) =>
        v.rotas?.funcionarios?.nome
          ?.toLowerCase()
          .includes(funcionarioBusca.toLowerCase())
      )
    }

    setRegistros(resultado)
    setLoading(false)
  }

  useEffect(() => {
    if (empresaId) {
      filtrar()
    }
  }, [empresaId])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Histórico de Visitas
      </h1>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm block mb-1">Data Inicial</label>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Data Final</label>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Cliente</label>
            <input
              value={clienteBusca}
              onChange={(e) => setClienteBusca(e.target.value)}
              placeholder="Buscar cliente"
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Funcionário</label>
            <input
              value={funcionarioBusca}
              onChange={(e) => setFuncionarioBusca(e.target.value)}
              placeholder="Buscar funcionário"
              className="border p-2 rounded w-full"
            />
          </div>
        </div>

        <button
          onClick={filtrar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-4"
        >
          {loading ? 'Filtrando...' : 'Filtrar'}
        </button>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {registros.length === 0 && (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">
            Nenhum registro encontrado
          </div>
        )}

        {registros.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded shadow">
            <div className="flex flex-col md:flex-row md:justify-between gap-2 mb-3">
              <div>
                <p className="font-bold">Cliente: {r.clientes?.nome || '-'}</p>
                <p className="text-sm text-gray-600">Funcionário: {r.rotas?.funcionarios?.nome || '-'}</p>
                <p className="text-sm text-gray-600">Rota: {r.rotas?.nome || '-'}</p>
              </div>
              <div className="text-sm">
                <p>Data: {r.data_execucao}</p>
                <p>
                  Status: 
                  <span className={r.status === 'concluido' ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'}>
                    {" "}{r.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="text-sm mb-3 text-gray-700">
              <p>Check-in: {r.checkin_at ? new Date(r.checkin_at).toLocaleString('pt-BR') : '-'}</p>
              <p>Check-out: {r.checkout_at ? new Date(r.checkout_at).toLocaleString('pt-BR') : '-'}</p>
            </div>

            {r.observacao && (
              <div className="bg-gray-100 p-3 rounded mb-3 text-sm">
                <strong>Observação:</strong><br />{r.observacao}
              </div>
            )}

            {/* FOTOS */}
            {r.fotos?.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Fotos</p>
                <div className="flex flex-wrap gap-3">
                  {r.fotos.map((foto: string, i: number) => {
                    // Limpa a URL antes de exibir
                    const urlLimpa = decodeURIComponent(foto);
                    return (
                      <img
                        key={i}
                        src={urlLimpa}
                        alt="foto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFotoModal(urlLimpa);
                        }}
                        className="w-24 h-24 object-cover rounded border hover:scale-105 transition cursor-pointer"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🔥 MODAL FOTO CORRIGIDO */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setFotoModal('')}
        >
          <div className="relative max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setFotoModal('')}
              className="absolute -top-12 right-0 text-white text-4xl font-bold hover:text-gray-300 transition"
            >
              &times;
            </button>
            <img
              src={fotoModal}
              alt="Foto ampliada"
              className="max-h-[85vh] max-w-full rounded shadow-2xl object-contain border-2 border-white/10"
              onError={(e) => {
                // Fallback caso o decode falhe
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('broken')) {
                   console.log("Erro ao carregar imagem tratada.");
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}