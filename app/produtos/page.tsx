'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Produtos() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [abrirModal, setAbrirModal] = useState(false)

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('produtos').select('*')

    if (!error) {
      setProdutos(data || [])
    }
  }

  async function salvar() {
    if (!nome || !preco) {
      alert('Preencha todos os campos')
      return
    }

    const { error } = await supabase.from('produtos').insert({
      nome,
      preco: Number(preco)
    })

    if (!error) {
      setNome('')
      setPreco('')
      setAbrirModal(false)
      carregar()
    } else {
      alert(error.message)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <div>

      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>

        <button
          onClick={() => setAbrirModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Novo Produto
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {produtos.map(p => (
          <div
            key={p.id}
            className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold">{p.nome}</h2>

            <p className="text-green-600 font-bold mt-2">
              R$ {p.preco}
            </p>

            <button
              className="mt-4 bg-green-600 text-white px-3 py-1 rounded"
              onClick={() => alert('Aqui vai registrar venda')}
            >
              Vender
            </button>
          </div>
        ))}

      </div>

      {/* MODAL */}
      {abrirModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-80">

            <h2 className="text-xl mb-4">Novo Produto</h2>

            <input
              className="border w-full p-2 mb-3"
              placeholder="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />

            <input
              className="border w-full p-2 mb-4"
              placeholder="Preço"
              type="number"
              value={preco}
              onChange={e => setPreco(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setAbrirModal(false)}>
                Cancelar
              </button>

              <button
                onClick={salvar}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Salvar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}