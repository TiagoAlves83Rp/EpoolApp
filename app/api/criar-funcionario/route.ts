import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const body = await req.json()

  const { nome, email, empresa_id } = body

  const senhaTemporaria = Math.random().toString(36).slice(-8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1️⃣ cria usuário
  const { data: userData, error: errUser } =
    await supabase.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true
    })

  if (errUser) {
    return Response.json({ error: errUser.message }, { status: 400 })
  }

  // 2️⃣ tabela usuarios
  await supabase.from('usuarios').insert({
    id: userData.user.id,
    tipo: 'funcionario',
    empresa_id
  })

  // 3️⃣ tabela funcionarios
  await supabase.from('funcionarios').insert({
    nome,
    usuario_id: userData.user.id,
    empresa_id
  })

  return Response.json({
    ok: true,
    senhaTemporaria
  })
}