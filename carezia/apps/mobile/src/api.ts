import Constants from 'expo-constants'
import { supabase } from './supabase'

/**
 * La app reutiliza los endpoints de la web en vez de duplicar el motor de
 * agendamiento: una sola fuente de verdad para disponibilidad, reservas y
 * cobros.
 */
const base =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000'

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const respuesta = await fetch(`${base}${ruta}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // El endpoint identifica al cliente por su sesión de Supabase.
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  })

  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    throw new ErrorApi(datos.error ?? 'Algo salió mal.', datos.code, respuesta.status)
  }
  return datos as T
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export interface DiaDisponible {
  date: string
  slots: Array<{ start: string; staffIds: string[] }>
}

export function obtenerDisponibilidad(params: {
  servicioId: string
  profesionalId?: string
  desde: string
  dias?: number
}) {
  const busqueda = new URLSearchParams({
    service: params.servicioId,
    from: params.desde,
    days: String(params.dias ?? 7),
  })
  if (params.profesionalId) busqueda.set('staff', params.profesionalId)

  return pedir<{ days: DiaDisponible[]; timezone: string }>(`/api/availability?${busqueda}`)
}

export interface RespuestaReserva {
  appointment: {
    id: string
    startsAt: string
    priceAmount: number
    status: string
    usedCredit: boolean
  }
  checkoutUrl: string | null
}

export function crearReserva(cuerpo: {
  serviceId: string
  staffId?: string
  startsAt: string
  purchaseId?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  clientNotes?: string
}) {
  return pedir<RespuestaReserva>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(cuerpo),
  })
}

export function cancelarReserva(id: string) {
  return pedir<{ ok: boolean }>(`/api/appointments/${id}/cancel`, { method: 'POST', body: '{}' })
}

export function comprarPaquete(packageId: string) {
  return pedir<{ purchaseId: string; provider: string; checkoutUrl: string | null }>(
    '/api/packages/checkout',
    { method: 'POST', body: JSON.stringify({ packageId }) },
  )
}
