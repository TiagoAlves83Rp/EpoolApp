'use server'

import { createClient } from '@supabase/supabase-js'

export async function resetarSenhaAdmin(userId: string, novaSenha: string) {
  // Inicializa o cliente com a chave de serviço (Server Side Only)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: novaSenha }
  )

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, data }
}