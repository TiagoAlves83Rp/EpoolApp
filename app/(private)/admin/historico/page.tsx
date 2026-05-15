'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function HistoricoPage() {
  // --- LÓGICA PARA DATA DE HOJE COMO DEFAULT ---
  const hoje = new Date().toISOString().split('T')[0]

  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [dataInicial, setDataInicial] = useState(hoje) // Default Hoje
  const [dataFinal, setDataFinal] = useState(hoje)     // Default Hoje
  const [clienteBusca, setClienteBusca] = useState('')
  const [funcionarioBusca, setFuncionarioBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [fotoModal, setFotoModal] = useState('')

  // 🔥 Estado para controlar quais cards estão expandidos
  const [expandidos, setExpandidos] = useState<string[]>([])

  useEffect(() => {
    carregarEmpresa()
  }, [])

  async function carregarEmpresa() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()
    if (data?.empresa_id) setEmpresaId(data.empresa_id)
  }

  async function filtrar() {
    if (!empresaId) return
    setLoading(true)
    let query = supabase.from('visitas_registro').select(`
        *,
        clientes!visitas_registro_cliente_id_fkey (nome),
        rotas!visitas_registro_rota_id_fkey (
          nome,
          funcionarios!rotas_funcionario_id_fkey (nome)
        )
      `).eq('empresa_id', empresaId).order('data_execucao', { ascending: false })

    if (dataInicial) query = query.gte('data_execucao', dataInicial)
    if (dataFinal) query = query.lte('data_execucao', dataFinal)

    const { data, error } = await query
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    let resultado = data || []
    if (clienteBusca) {
      resultado = resultado.filter((v: any) => v.clientes?.nome?.toLowerCase().includes(clienteBusca.toLowerCase()))
    }
    if (funcionarioBusca) {
      resultado = resultado.filter((v: any) => v.rotas?.funcionarios?.nome?.toLowerCase().includes(funcionarioBusca.toLowerCase()))
    }
    setRegistros(resultado)
    setLoading(false)
  }

  useEffect(() => {
    if (empresaId) filtrar()
  }, [empresaId])

  // 🔥 Alternar expansão do card
  const toggleExpandir = (id: string) => {
    setExpandidos(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Histórico de Visitas</h1>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm block mb-1">Data Inicial</label>
            <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="text-sm block mb-1">Data Final</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="text-sm block mb-1">Cliente</label>
            <input value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} placeholder="Buscar cliente" className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="text-sm block mb-1">Funcionário</label>
            <input value={funcionarioBusca} onChange={(e) => setFuncionarioBusca(e.target.value)} placeholder="Buscar funcionário" className="border p-2 rounded w-full" />
          </div>
        </div>
        <button onClick={filtrar} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-4 w-full md:w-auto">
          {loading ? 'Filtrando...' : 'Filtrar'}
        </button>
      </div>

      {/* LISTA COMPACTA COM DROPDOWN */}
      <div className="space-y-2">
        {registros.length === 0 && <div className="bg-white p-6 rounded shadow text-center text-gray-500">Nenhum registro encontrado para este período</div>}
        
        {registros.map((r) => {
          const isExpandido = expandidos.includes(r.id);
          
          return (
            <div key={r.id} className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              {/* CABEÇALHO CLICÁVEL (Sempre visível) */}
              <div 
                onClick={() => toggleExpandir(r.id)}
                className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <p className="text-sm font-semibold truncate"><span className="text-gray-500 font-normal">Cliente:</span> {r.clientes?.nome || '-'}</p>
                  <p className="text-sm text-gray-600 truncate"><span className="text-gray-500">Func:</span> {r.rotas?.funcionarios?.nome || '-'}</p>
                  <p className="text-sm text-gray-600"><span className="text-gray-500">Data:</span> {r.data_execucao}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${r.status === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.status}
                  </span>
                  <span className={`text-gray-400 transition-transform duration-200 ${isExpandido ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {/* CONTEÚDO DETALHADO (Abre no Dropdown) */}
              {isExpandido && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
                    <p><strong>Check-in:</strong> {r.checkin_at ? new Date(r.checkin_at).toLocaleString('pt-BR') : '-'}</p>
                    <p><strong>Check-out:</strong> {r.checkout_at ? new Date(r.checkout_at).toLocaleString('pt-BR') : '-'}</p>
                    <p className="md:col-span-2"><strong>Rota:</strong> {r.rotas?.nome || '-'}</p>
                  </div>

                  {r.observacao && (
                    <div className="bg-white p-2 rounded border border-gray-200 mb-3 text-sm italic text-gray-700">
                      "{r.observacao}"
                    </div>
                  )}

                  {r.fotos?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Evidências Fotográficas</p>
                      <div className="flex flex-wrap gap-2">
                        {r.fotos.map((url: string, i: number) => (
                          <img
                            key={i}
                            src={url}
                            alt="foto"
                            onClick={(e) => {
                                e.stopPropagation(); // Evita fechar o dropdown ao clicar na foto
                                setFotoModal(url);
                            }}
                            className="w-16 h-16 object-cover rounded-md border border-gray-300 hover:brightness-75 transition cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* MODAL FOTO */}
      {fotoModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setFotoModal('')}>
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setFotoModal('')} 
              className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300"
            >
              &times;
            </button>
            <img src={fotoModal} alt="Foto ampliada" className="max-h-[80vh] max-w-full rounded shadow-2xl object-contain border-2 border-white/20" />
          </div>
        </div>
      )}
    </div>
  )
}