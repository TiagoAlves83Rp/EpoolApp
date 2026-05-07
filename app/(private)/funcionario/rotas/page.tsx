'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// 🔥 upload helper
async function uploadFoto(file: File) {
  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('visitas')
    .upload(fileName, file)

  if (error) {
    console.error(error)
    throw new Error('Erro ao enviar foto')
  }

  const { data } = supabase.storage
    .from('visitas')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export default function FuncionarioPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [rota, setRota] = useState<any>(null)
  const [funcionario, setFuncionario] = useState<any>(null)
  const [visitas, setVisitas] = useState<any[]>([])
  const [rotaIniciada, setRotaIniciada] = useState(false)

  const [fotos, setFotos] = useState<File[]>([])
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) return

    const { data: func } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('usuario_id', user.id)
      .single()

    if (!func) return

    setFuncionario(func)

    const { data: rotaData } = await supabase
      .from('rotas')
      .select('*')
      .eq('funcionario_id', func.id)
      .single()

    if (!rotaData) return

    setRota(rotaData)

    const { data: clientesRota } = await supabase
      .from('rota_clientes')
      .select(`clientes (id, nome)`)
      .eq('rota_id', rotaData.id)

    const lista = clientesRota?.map((i: any) => i.clientes) || []
    setClientes(lista)

    const hoje = new Date().toISOString().split('T')[0]

    const { data: visitasData } = await supabase
      .from('visitas_registro')
      .select('*')
      .eq('rota_id', rotaData.id)
      .eq('data_execucao', hoje)

    setVisitas(visitasData || [])
    setRotaIniciada((visitasData || []).length > 0)
  }

  async function checkIn(clienteId: string) {
    const hoje = new Date().toISOString().split('T')[0]

    let visita = visitas.find(v => v.cliente_id === clienteId)

    // 🔥 SE NÃO EXISTIR VISITA, CRIA
    if (!visita) {
      const { error } = await supabase
        .from('visitas_registro')
        .insert([
          {
            rota_id: rota.id,
            cliente_id: clienteId,
            funcionario_id: funcionario.id,
            empresa_id: funcionario.empresa_id,
            data_execucao: hoje,
            status: 'em_atendimento',
            checkin_at: new Date().toISOString()
          }
        ])

      if (error) {
        console.error(error)
        alert('Erro ao fazer check-in')
        return
      }

    } else {

      // 🔥 SE JÁ EXISTE, APENAS ATUALIZA
      const { error } = await supabase
        .from('visitas_registro')
        .update({
          status: 'em_atendimento',
          checkin_at: new Date().toISOString()
        })
        .eq('id', visita.id)

      if (error) {
        console.error(error)
        alert('Erro ao fazer check-in')
        return
      }
    }

    carregarDados()
  }

  async function checkOut(clienteId: string) {
    const visita = visitas.find(v => v.cliente_id === clienteId)

    if (!visita) return

    if (visita.status !== 'em_atendimento') {
      alert('Faça o check-in primeiro')
      return
    }

    // 🔥 VALIDAÇÃO
    if (fotos.length < 2) {
      alert('Envie no mínimo 2 fotos')
      return
    }

    if (!observacao) {
      alert('Preencha a observação')
      return
    }

    try {
      const urls: string[] = []

      for (const foto of fotos) {
        const url = await uploadFoto(foto)
        urls.push(url)
      }

      const { error } = await supabase
        .from('visitas_registro')
        .update({
          status: 'concluido',
          checkout_at: new Date().toISOString(),
          observacao,
          fotos: urls
        })
        .eq('id', visita.id)

      if (error) throw error

      alert('Checkout realizado')

      setFotos([])
      setObservacao('')

      carregarDados()

    } catch (err) {
      console.error(err)
      alert('Erro no checkout')
    }
  }

  function getStatus(clienteId: string) {
    return visitas.find(v => v.cliente_id === clienteId)?.status || 'pendente'
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Minha Rota</h1>

      {!rota && <p>Nenhuma rota atribuída</p>}

      {rota && (
        <>
          <h2 className="mb-3">Rota: {rota.nome}</h2>

          <ul className="space-y-3">
            {clientes.map(c => {
              const status = getStatus(c.id)

              return (
                <li key={c.id} className="bg-white p-3 rounded shadow">

                  <div className="flex justify-between">
                    <span>{c.nome} - {status}</span>
                  </div>

                  {status === 'pendente' && (
                    <button
                      onClick={() => checkIn(c.id)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded mt-2"
                    >
                      Check-in
                    </button>
                  )}

                  {status === 'em_atendimento' && (
                    <>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="mt-2"
                        onChange={(e) => {
                          if (!e.target.files) return
                          setFotos(Array.from(e.target.files))
                        }}
                      />

                      <textarea
                        placeholder="Observação obrigatória"
                        className="border p-2 w-full mt-2"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                      />

                      <button
                        onClick={() => checkOut(c.id)}
                        className="bg-green-600 text-white px-2 py-1 rounded mt-2"
                      >
                        Check-out
                      </button>
                    </>
                  )}

                  {status === 'concluido' && (
                    <span className="text-green-600 font-bold mt-2 block">
                      ✔ Concluído
                    </span>
                  )}

                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}