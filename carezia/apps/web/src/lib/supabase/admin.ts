import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role: se salta RLS.
 *
 * Sólo para código de servidor que ya verificó quién llama —webhooks de
 * pago y el motor de disponibilidad—. Nunca debe importarse desde un
 * componente cliente: la clave no lleva el prefijo NEXT_PUBLIC y Next
 * fallaría el build si se filtrara al bundle del navegador.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
