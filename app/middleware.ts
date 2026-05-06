import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()

  const isPrivateRoute =
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/funcionario') ||
    url.pathname.startsWith('/superadmin')

  // ❌ não logado tentando acessar área privada
  if (!user && isPrivateRoute) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 🔁 logado indo pra home → NÃO redireciona automaticamente
  // (deixa o front decidir via ProtectedRoute)
  if (user && url.pathname === '/') {
    return NextResponse.next()
  }

  return res
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/funcionario/:path*',
    '/superadmin/:path*',
  ],
}