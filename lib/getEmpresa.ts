import { supabase } from './supabaseClient'

export async function getEmpresaId() {
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', userData.user.id)
    .single()

  return data?.empresa_id
}