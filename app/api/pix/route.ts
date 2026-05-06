import { NextResponse } from 'next/server'
import mercadopago from 'mercadopago'

mercadopago.configure({
  access_token: 'SEU_TOKEN_MP'
})

export async function POST(req: Request) {
  const body = await req.json()

  const payment = await mercadopago.payment.create({
    transaction_amount: body.valor,
    description: 'Mensalidade E-Pool',
    payment_method_id: 'pix',
    payer: {
      email: 'cliente@email.com'
    }
  })

  return NextResponse.json(payment.body)
}