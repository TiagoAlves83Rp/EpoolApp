import { supabase } from './supabaseClient'

export async function getUser() {
  const { data } = await supabase.auth.getUser()

  if (!data.user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', data.user.id)
    .single()

  return usuario
}