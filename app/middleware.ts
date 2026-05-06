import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set(name, value, options)
        },
        remove(name, options) {
          res.cookies.set(name, '', options)
        },
      },
    }
  )

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
  if (user && url.pathname === '/') {
    return res
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