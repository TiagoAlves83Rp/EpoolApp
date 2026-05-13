import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🔐 CLIENTE ADMIN (SERVICE ROLE)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { nome, email } = body

    // 🔒 validação
    if (!nome || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // 🔥 BUSCAR PLANO PADRÃO (primeiro da tabela)
    const { data: plano, error: planoError } =
      await supabaseAdmin
        .from('planos')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (planoError || !plano) {
      console.error('Erro ao buscar plano:', planoError)

      return NextResponse.json(
        { error: 'Nenhum plano cadastrado no sistema' },
        { status: 400 }
      )
    }

    // 🔐 SENHA TEMPORÁRIA
    const senhaTemp =
      Math.random().toString(36).slice(-8)

    // 🔍 VERIFICA SE EMAIL JÁ EXISTE
    const { data: existingUsers } =
      await supabaseAdmin.auth.admin.listUsers()

    const jaExiste = existingUsers.users.find(
      (u) => u.email === email
    )

    if (jaExiste) {
      return NextResponse.json(
        { error: 'Email já cadastrado no sistema' },
        { status: 400 }
      )
    }

    // 🔥 CRIAR USUÁRIO NO AUTH
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senhaTemp,
        email_confirm: true
      })

    if (userError || !userData.user) {
      console.error('Erro ao criar usuário:', userError)

      return NextResponse.json(
        {
          error:
            userError?.message ||
            'Erro ao criar usuário'
        },
        { status: 400 }
      )
    }

    const userId = userData.user.id

    // 📅 DATA DE VENCIMENTO (30 dias)
    const hoje = new Date()

    const vencimento = new Date()

    vencimento.setDate(hoje.getDate() + 30)

    // 🏢 CRIAR EMPRESA
    const { data: empresa, error: empresaError } =
      await supabaseAdmin
        .from('empresas')
        .insert({
          nome,
          email,
          plano_id: plano.id,
          status: 'ativa',

          // ✅ CORREÇÃO
          data_vencimento: vencimento
            .toISOString()
            .split('T')[0]
        })
        .select()
        .single()

    if (empresaError || !empresa) {

      console.error(
        'Erro ao criar empresa:',
        empresaError
      )

      // 🔥 REMOVE USER AUTH
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        {
          error:
            empresaError?.message ||
            'Erro ao criar empresa'
        },
        { status: 400 }
      )
    }

    // 👤 VINCULAR USUÁRIO COMO ADMIN
    const { error: usuarioError } =
      await supabaseAdmin
        .from('usuarios')
        .insert({
          id: userId,
          email,
          tipo: 'admin',
          empresa_id: empresa.id
        })

    if (usuarioError) {

      console.error(
        'Erro ao vincular usuário:',
        usuarioError
      )

      // 🔥 REMOVE AUTH USER
      await supabaseAdmin.auth.admin.deleteUser(userId)

      // 🔥 REMOVE EMPRESA
      await supabaseAdmin
        .from('empresas')
        .delete()
        .eq('id', empresa.id)

      return NextResponse.json(
        { error: 'Erro ao vincular usuário' },
        { status: 400 }
      )
    }

    // ✅ SUCESSO
    return NextResponse.json({
      success: true,
      email,
      senha: senhaTemp
    })

  } catch (err) {

    console.error('Erro geral:', err)

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}