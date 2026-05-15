'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

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

  const { data } = supabase.storage
    .from('visitas')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export default function FuncionarioPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [funcionario, setFuncionario] = useState<any>(null)
  const [visitas, setVisitas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rotaId, setRotaId] = useState<string | null>(null)

  const [fotos, setFotos] = useState<File[]>([])
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)

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
            id, nome, endereco, numero, bairro, telefone, frequencia, data_proxima_visita
          ),
          rotas (
            id, funcionario_id
          )
        `)
        .eq('rotas.funcionario_id', func.id)

      if (rotaError) throw rotaError

      if (rotaData && rotaData.length > 0) {
        setRotaId(rotaData[0].rota_id)
        const listaClientes = rotaData.map((item: any) => item.clientes).filter(c => c !== null)
        setClientes(listaClientes)
      }

      const hoje = new Date().toISOString().split('T')[0]
      const { data: visitasData } = await supabase
        .from('visitas_registro')
        .select('*')
        .eq('funcionario_id', func.id)
        .eq('data_execucao', hoje)

      setVisitas(visitasData || [])
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
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
    return data.toISOString().split('T')[0]
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  async function checkIn(clienteId: string) {
    if (!rotaId || !funcionario) return
    const hoje = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('visitas_registro')
      .insert([{
        cliente_id: clienteId,
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        rota_id: rotaId,
        data_execucao: hoje,
        status: 'em_atendimento',
        checkin_at: new Date().toISOString()
      }])
    if (error) alert('Erro ao iniciar atendimento.')
    else carregarDados()
  }

  async function checkOut(cliente: any) {
    const visita = visitas.find(v => v.cliente_id === cliente.id && v.status === 'em_atendimento')
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
      await supabase.from('visitas_registro').update({
        status: 'concluido',
        checkout_at: new Date().toISOString(),
        observacao,
        fotos: urls
      }).eq('id', visita.id)

      await supabase.from('clientes').update({ data_proxima_visita: novaData }).eq('id', cliente.id)

      setFotos([])
      setObservacao('')
      carregarDados()
    } catch (err) {
      alert('Erro ao salvar dados.')
    } finally {
      setEnviando(false)
    }
  }

  function getStatus(clienteId: string) {
    return visitas.find(v => v.cliente_id === clienteId)?.status || 'pendente'
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600 border-solid"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      {/* Container Centralizado com largura máxima */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <header className="py-8 border-b border-gray-200 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Roteiro de Visitas</h1>
            <p className="text-gray-500 mt-1">Olá, {funcionario?.nome || 'Funcionário'}! Gerencie suas tarefas hoje.</p>
          </div>
          <div className="mt-4 sm:mt-0 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm self-start">
             <span className="text-xs font-bold text-gray-400 uppercase">📅 {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </header>

        {clientes.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl text-center border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg">Nenhum cliente disponível para rota.</p>
          </div>
        ) : (
          /* GRID RESPONSIVO: 1 coluna no celular, 2 em tablets, 3 em notebooks */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((c, idx) => {
              const status = getStatus(c.id)
              const isConcluido = status === 'concluido'
              const isAtendimento = status === 'em_atendimento'

              return (
                <div key={c.id} className={`group relative flex flex-col bg-white rounded-3xl border transition-all duration-300 ${isConcluido ? 'border-gray-100 opacity-80' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200'}`}>
                  
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-6 left-0 w-1.5 h-12 rounded-r-full transition-colors ${isConcluido ? 'bg-green-500' : isAtendimento ? 'bg-blue-500' : 'bg-gray-200'}`} />

                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                        {c.frequencia || 'Recorrente'}
                      </span>
                      <span className="text-xl font-black text-gray-100 group-hover:text-gray-200 transition-colors">0{idx + 1}</span>
                    </div>

                    <h3 className={`text-xl font-bold leading-tight mb-2 ${isConcluido ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {c.nome}
                    </h3>

                    <div className="space-y-1 mb-6 flex-grow">
                       <p className="text-sm text-gray-500 flex items-start gap-2 italic font-medium">
                         📍 {c.endereco}, {c.numero}
                       </p>
                       <p className="text-xs text-gray-400 ml-5">{c.bairro}</p>
                    </div>

                    {/* ACTIONS SECTION */}
                    <div className="mt-auto pt-4 border-t border-gray-50">
                      {status === 'pendente' && (
                        <button 
                          onClick={() => checkIn(c.id)} 
                          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-md shadow-blue-100"
                        >
                          Iniciar Check-in
                        </button>
                      )}

                      {isAtendimento && (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3">
                            <input 
                              type="file" accept="image/*" capture="environment" className="hidden" 
                              id={`file-${c.id}`}
                              onChange={(e) => e.target.files?.[0] && setFotos(p => [...p, e.target.files![0]])} 
                            />
                            <label 
                              htmlFor={`file-${c.id}`}
                              className="w-full border-2 border-dashed border-blue-100 bg-blue-50/50 rounded-2xl py-4 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                              <span className="text-blue-600 text-sm font-bold">+ Foto do Serviço</span>
                              <span className="text-[10px] text-blue-400 font-medium">Mínimo 2 fotos</span>
                            </label>

                            {fotos.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {fotos.map((_, i) => (
                                  <div key={i} className="flex-shrink-0 bg-blue-100 text-blue-700 text-[10px] px-3 py-1 rounded-full font-bold">
                                    📷 FOTO {i+1}
                                  </div>
                                ))}
                              </div>
                            )}

                            <textarea 
                              className="w-full border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                              placeholder="Notas da visita..." 
                              rows={2} 
                              value={observacao} 
                              onChange={e => setObservacao(e.target.value)} 
                            />

                            <button 
                              onClick={() => checkOut(c)} 
                              disabled={enviando} 
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-100 disabled:bg-gray-200 transition-all"
                            >
                              {enviando ? 'PROCESSANDO...' : 'FINALIZAR VISITA'}
                            </button>
                          </div>
                        </div>
                      )}

                      {isConcluido && (
                        <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center text-center border border-green-100">
                          <div className="bg-green-500 text-white rounded-full p-1 mb-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                             </svg>
                          </div>
                          <span className="text-green-800 text-xs font-bold uppercase tracking-wider">Trabalho Concluído</span>
                          <span className="text-[10px] text-green-600 mt-1">
                            Retorno em: <strong className="underline">{formatarData(c.data_proxima_visita)}</strong>
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

        <footer className="mt-20 border-t border-gray-200 pt-8 flex flex-col items-center gap-4">
           <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-800">{clientes.length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
              </div>
              <div className="text-center border-x px-6">
                <p className="text-2xl font-black text-green-600">{visitas.filter(v => v.status === 'concluido').length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Feitas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{clientes.length - visitas.filter(v => v.status === 'concluido').length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Restam</p>
              </div>
           </div>
           <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">Route Master System</p>
        </footer>

      </div>
    </div>
  )
}