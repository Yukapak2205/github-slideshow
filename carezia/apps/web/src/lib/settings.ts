import {
  DEFAULT_BOOKING,
  DEFAULT_BUSINESS,
  DEFAULT_HOME,
  type BookingSettings,
  type BusinessSettings,
  type HomeSettings,
} from '@carezia/core'
import { createClient } from './supabase/server'

export interface AppSettings {
  business: BusinessSettings
  booking: BookingSettings
  home: HomeSettings
}

/**
 * Lee la configuración editable desde la base de datos.
 *
 * Si una clave no existe todavía (base recién creada) se cae al valor por
 * defecto, para que la web nunca quede en blanco por un ajuste faltante.
 */
export async function getSettings(): Promise<AppSettings> {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('key, value')

  const map = new Map((data ?? []).map((row) => [row.key, row.value]))

  return {
    business: { ...DEFAULT_BUSINESS, ...(map.get('business') as Partial<BusinessSettings>) },
    booking: { ...DEFAULT_BOOKING, ...(map.get('booking') as Partial<BookingSettings>) },
    home: { ...DEFAULT_HOME, ...(map.get('home') as Partial<HomeSettings>) },
  }
}
