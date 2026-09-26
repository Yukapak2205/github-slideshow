import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Cliente con la sesión del usuario. Respeta las políticas RLS,
 * así que es el que se usa para todo lo que toque datos de un cliente.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Los Server Components no pueden escribir cookies; el middleware
            // ya refrescó la sesión, así que se puede ignorar.
          }
        },
      },
    },
  )
}

/**
 * Usuario de la petición, venga de donde venga.
 *
 * La web manda la sesión en cookies; la app móvil, en una cabecera
 * `Authorization: Bearer`. Los endpoints comparten esta función para no
 * tener dos caminos de autenticación con reglas distintas.
 */
export async function getRequestUser(request?: Request) {
  const cabecera = request?.headers.get('authorization')

  if (cabecera?.toLowerCase().startsWith('bearer ')) {
    const token = cabecera.slice(7).trim()
    const { createClient: createTokenClient } = await import('@supabase/supabase-js')
    const cliente = createTokenClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    // getUser valida la firma del token contra Supabase, no confía en él.
    const { data } = await cliente.auth.getUser(token)
    if (data.user) return data.user
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
