export default function CanceladoPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow text-center">
        <h1 className="text-xl font-bold mb-2 text-red-600">
          Conta cancelada
        </h1>

        <p className="text-gray-600">
          Sua empresa está com acesso suspenso.
        </p>

        <p className="text-sm mt-2 text-gray-400">
          Nosso suporte entrará em contato.
        </p>
      </div>
    </div>
  )
}