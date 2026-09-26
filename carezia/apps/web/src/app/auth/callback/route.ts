import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Canjea el código del enlace mágico por una sesión. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/mi-cuenta'
  // Nunca se redirige fuera del sitio, venga lo que venga en la URL.
  const destino = next.startsWith('/') && !next.startsWith('//') ? next : '/mi-cuenta'

  if (!code) {
    return NextResponse.redirect(`${origin}/ingresar?error=sin-codigo`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/ingresar?error=enlace-invalido`)
  }

  return NextResponse.redirect(`${origin}${destino}`)
}
