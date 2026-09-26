import 'server-only'

import {
  DEFAULT_BOOKING,
  DEFAULT_BUSINESS,
  addDaysISO,
  computeAvailability,
  mergeAvailability,
  toLocalDateISO,
  type BookingSettings,
  type BusinessSettings,
  type DayAvailability,
  type WorkShift,
} from '@carezia/core'
import { createAdminClient } from './supabase/admin'

export interface MergedDay {
  date: string
  slots: Array<{ start: string; staffIds: string[] }>
}

export interface AvailabilityRequest {
  serviceId: string
  /** Profesional específico, o undefined para "cualquiera disponible". */
  staffId?: string
  locationId?: string
  fromDate: string
  toDate: string
}

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

async function loadSettings(): Promise<{
  booking: BookingSettings
  business: BusinessSettings
}> {
  const admin = createAdminClient()
  const { data } = await admin.from('settings').select('key, value').in('key', ['booking', 'business'])
  const map = new Map((data ?? []).map((r) => [r.key, r.value]))
  return {
    booking: { ...DEFAULT_BOOKING, ...(map.get('booking') as Partial<BookingSettings>) },
    business: { ...DEFAULT_BUSINESS, ...(map.get('business') as Partial<BusinessSettings>) },
  }
}

/**
 * Disponibilidad real de un servicio.
 *
 * Usa el cliente service role a propósito: para saber si una hora está
 * libre hay que mirar las citas de todos los clientes, algo que RLS
 * (correctamente) le niega a una visita anónima. Lo que se devuelve son
 * sólo horas, nunca datos de otras personas.
 */
export async function getAvailability(req: AvailabilityRequest): Promise<{
  days: MergedDay[]
  timezone: string
}> {
  const admin = createAdminClient()
  const { booking, business } = await loadSettings()

  const { data: service, error: serviceError } = await admin
    .from('services')
    .select('id, duration_min, buffer_min, is_active')
    .eq('id', req.serviceId)
    .single()

  if (serviceError || !service) {
    throw new BookingError('El servicio no existe.', 'SERVICE_NOT_FOUND', 404)
  }
  if (!service.is_active) {
    throw new BookingError('El servicio no está disponible.', 'SERVICE_INACTIVE')
  }

  // Profesionales habilitados para este servicio.
  let staffQuery = admin
    .from('staff_services')
    .select('staff_id, staff!inner(id, is_active)')
    .eq('service_id', req.serviceId)
    .eq('staff.is_active', true)

  if (req.staffId) staffQuery = staffQuery.eq('staff_id', req.staffId)

  const { data: staffRows } = await staffQuery
  const staffIds = (staffRows ?? []).map((r) => r.staff_id)
  if (staffIds.length === 0) {
    return { days: [], timezone: business.timezone }
  }

  // La agenda no se abre más allá de la ventana configurada.
  const today = toLocalDateISO(new Date(), business.timezone)
  const horizon = addDaysISO(today, booking.max_advance_days)
  const fromDate = req.fromDate < today ? today : req.fromDate
  const toDate = req.toDate > horizon ? horizon : req.toDate

  const rangeStart = new Date(`${fromDate}T00:00:00Z`)
  const rangeEnd = new Date(`${addDaysISO(toDate, 2)}T00:00:00Z`)

  const [{ data: shifts }, { data: appointments }, { data: timeOff }] = await Promise.all([
    admin
      .from('work_shifts')
      .select('staff_id, location_id, weekday, start_time, end_time')
      .in('staff_id', staffIds),
    admin
      .from('appointments')
      .select('staff_id, starts_at, blocked_until')
      .in('staff_id', staffIds)
      .in('status', ['pending', 'confirmed', 'completed'])
      .lt('starts_at', rangeEnd.toISOString())
      .gt('blocked_until', rangeStart.toISOString()),
    admin
      .from('time_off')
      .select('staff_id, starts_at, ends_at')
      .lt('starts_at', rangeEnd.toISOString())
      .gt('ends_at', rangeStart.toISOString()),
  ])

  const perStaff = staffIds.map((staffId) => {
    const staffShifts: WorkShift[] = (shifts ?? [])
      .filter((s) => s.staff_id === staffId)
      .filter((s) => !req.locationId || s.location_id === req.locationId)
      .map((s) => ({
        weekday: s.weekday,
        start_time: String(s.start_time).slice(0, 5),
        end_time: String(s.end_time).slice(0, 5),
      }))

    const busy = [
      ...(appointments ?? [])
        .filter((a) => a.staff_id === staffId)
        .map((a) => ({ start: a.starts_at, end: a.blocked_until })),
      // staff_id nulo en time_off = cierre de todo el local.
      ...(timeOff ?? [])
        .filter((t) => t.staff_id === null || t.staff_id === staffId)
        .map((t) => ({ start: t.starts_at, end: t.ends_at })),
    ]

    const days: DayAvailability[] = computeAvailability({
      timezone: business.timezone,
      fromDate,
      toDate,
      shifts: staffShifts,
      busy,
      durationMin: service.duration_min,
      bufferMin: service.buffer_min,
      slotIntervalMin: booking.slot_interval_min,
      minLeadHours: booking.min_lead_hours,
    })

    return { staffId, days }
  })

  return { days: mergeAvailability(perStaff), timezone: business.timezone }
}

export interface CreateAppointmentInput {
  serviceId: string
  staffId?: string
  locationId?: string
  startsAt: string
  clientId?: string | null
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  clientNotes?: string
  /** Compra de paquete con la que se quiere pagar la sesión. */
  purchaseId?: string
}

export interface CreatedAppointment {
  id: string
  startsAt: string
  endsAt: string
  staffId: string
  priceAmount: number
  status: string
  paymentStatus: string
  usedCredit: boolean
}

/**
 * Crea la cita.
 *
 * La comprobación de que la hora sigue libre no se hace aquí sino en la
 * base de datos, con la restricción de exclusión `appointments_no_overlap`.
 * Dos personas que aprieten "reservar" en el mismo segundo no pueden
 * quedarse con la misma hora: una de las dos inserciones es rechazada.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreatedAppointment> {
  const admin = createAdminClient()
  const { booking } = await loadSettings()

  const { data: service } = await admin
    .from('services')
    .select('id, name, duration_min, buffer_min, price_amount, deposit_amount, is_active')
    .eq('id', input.serviceId)
    .single()

  if (!service || !service.is_active) {
    throw new BookingError('El servicio no está disponible.', 'SERVICE_UNAVAILABLE')
  }

  const startsAt = new Date(input.startsAt)
  if (Number.isNaN(startsAt.getTime())) {
    throw new BookingError('La hora enviada no es válida.', 'INVALID_START')
  }
  if (startsAt.getTime() < Date.now() + booking.min_lead_hours * 3_600_000) {
    throw new BookingError(
      `Las reservas necesitan al menos ${booking.min_lead_hours} h de anticipación.`,
      'TOO_SOON',
    )
  }

  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000)
  const blockedUntil = new Date(endsAt.getTime() + service.buffer_min * 60_000)

  // Si el cliente no eligió profesional, se toma la primera con la hora libre.
  const staffId = input.staffId ?? (await pickStaff(input.serviceId, startsAt, blockedUntil))
  if (!staffId) {
    throw new BookingError('Esa hora ya no está disponible.', 'SLOT_TAKEN', 409)
  }

  const locationId = input.locationId ?? (await defaultLocationId(staffId))
  if (!locationId) {
    throw new BookingError('No hay sucursal configurada.', 'NO_LOCATION', 500)
  }

  const { data: appointment, error } = await admin
    .from('appointments')
    .insert({
      client_id: input.clientId ?? null,
      staff_id: staffId,
      service_id: service.id,
      location_id: locationId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      blocked_until: blockedUntil.toISOString(),
      status: booking.auto_confirm ? 'confirmed' : 'pending',
      payment_status: 'unpaid',
      price_amount: service.price_amount,
      guest_name: input.guestName ?? null,
      guest_email: input.guestEmail ?? null,
      guest_phone: input.guestPhone ?? null,
      client_notes: input.clientNotes ?? null,
    })
    .select('id, starts_at, ends_at, staff_id, price_amount, status, payment_status')
    .single()

  if (error) {
    // 23P01 = violación de la restricción de exclusión: alguien se adelantó.
    if (error.code === '23P01') {
      throw new BookingError('Esa hora acaba de ser tomada.', 'SLOT_TAKEN', 409)
    }
    throw new BookingError(error.message, 'INSERT_FAILED', 500)
  }

  let usedCredit = false
  let priceAmount = appointment.price_amount
  let paymentStatus = appointment.payment_status

  if (input.purchaseId && input.clientId) {
    await redeemCredit(input.purchaseId, input.clientId, service.id, appointment.id)
    usedCredit = true
    priceAmount = 0
    paymentStatus = 'paid'
  }

  return {
    id: appointment.id,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
    staffId: appointment.staff_id,
    priceAmount,
    status: appointment.status,
    paymentStatus,
    usedCredit,
  }
}

async function pickStaff(
  serviceId: string,
  startsAt: Date,
  blockedUntil: Date,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('staff_services')
    .select('staff_id, staff!inner(is_active)')
    .eq('service_id', serviceId)
    .eq('staff.is_active', true)

  const candidates = (rows ?? []).map((r) => r.staff_id)
  if (candidates.length === 0) return null

  const { data: taken } = await admin
    .from('appointments')
    .select('staff_id')
    .in('staff_id', candidates)
    .in('status', ['pending', 'confirmed', 'completed'])
    .lt('starts_at', blockedUntil.toISOString())
    .gt('blocked_until', startsAt.toISOString())

  const busy = new Set((taken ?? []).map((t) => t.staff_id))
  return candidates.find((id) => !busy.has(id)) ?? null
}

async function defaultLocationId(staffId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('staff_locations')
    .select('location_id')
    .eq('staff_id', staffId)
    .limit(1)
    .maybeSingle()
  if (data?.location_id) return data.location_id

  const { data: fallback } = await admin
    .from('locations')
    .select('id')
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  return fallback?.id ?? null
}

/**
 * Descuenta una sesión del paquete comprado.
 *
 * Verifica que la compra sea de quien reserva y que el paquete cubra ese
 * servicio; el descuento en sí lo hace una función de Postgres que toma
 * un lock sobre la fila, para que dos reservas simultáneas no gasten el
 * mismo crédito.
 */
async function redeemCredit(
  purchaseId: string,
  clientId: string,
  serviceId: string,
  appointmentId: string,
): Promise<void> {
  const admin = createAdminClient()

  const { data: purchase } = await admin
    .from('package_purchases')
    .select('id, client_id, package_id, status')
    .eq('id', purchaseId)
    .maybeSingle()

  if (!purchase || purchase.client_id !== clientId) {
    await admin.from('appointments').delete().eq('id', appointmentId)
    throw new BookingError('El paquete no te pertenece.', 'PACKAGE_FORBIDDEN', 403)
  }

  const { data: covers } = await admin
    .from('package_services')
    .select('service_id')
    .eq('package_id', purchase.package_id)
    .eq('service_id', serviceId)
    .maybeSingle()

  if (!covers) {
    await admin.from('appointments').delete().eq('id', appointmentId)
    throw new BookingError('Ese paquete no cubre este servicio.', 'PACKAGE_MISMATCH')
  }

  const { error } = await admin.rpc('redeem_package_credit', {
    p_purchase_id: purchaseId,
    p_appointment_id: appointmentId,
  })

  if (error) {
    // Si el crédito no se pudo usar, la cita no debe quedar reservada.
    await admin.from('appointments').delete().eq('id', appointmentId)
    const messages: Record<string, string> = {
      PACKAGE_EXPIRED: 'Tu paquete está vencido.',
      PACKAGE_EXHAUSTED: 'Ya usaste todas las sesiones de ese paquete.',
      PACKAGE_NOT_ACTIVE: 'Ese paquete aún no está activo.',
    }
    const code = Object.keys(messages).find((k) => error.message.includes(k))
    throw new BookingError(
      code ? messages[code]! : 'No se pudo usar el paquete.',
      code ?? 'REDEEM_FAILED',
    )
  }
}
