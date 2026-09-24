import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refresca la sesión en cada navegación y cierra el paso a /admin y
 * /mi-cuenta a quien no corresponda.
 *
 * La comprobación de rol también vive en las políticas RLS de la base de
 * datos: esto es conveniencia para el usuario, no la única defensa.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const protegida = pathname.startsWith('/admin') || pathname.startsWith('/mi-cuenta')

  if (protegida && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/ingresar'
    url.search = `?volver=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      const url = request.nextUrl.clone()
      url.pathname = '/mi-cuenta'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Todo menos estáticos, imágenes y los webhooks de pago (que llegan
    // sin cookies y no deben pasar por aquí).
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
