'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Todas las acciones del panel usan el cliente con la sesión del usuario,
 * no el de service role. Así quien manda es RLS: si la política dice que
 * sólo un admin escribe servicios, aquí no hay forma de saltárselo.
 */
async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/ingresar?volver=/admin')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.role !== 'admin' && perfil?.role !== 'staff') redirect('/mi-cuenta')
  return { supabase, user, role: perfil.role as 'admin' | 'staff' }
}

export type EstadoAccion = { ok: boolean; mensaje?: string } | null

function slugify(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// =============================================================
// Servicios
// =============================================================
const servicioSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, 'El nombre es muy corto.'),
  category_id: z.uuid().nullable(),
  description: z.string().trim().max(1000).nullable(),
  price_amount: z.coerce.number().int().min(0),
  duration_min: z.coerce.number().int().min(5).max(600),
  buffer_min: z.coerce.number().int().min(0).max(120),
  deposit_amount: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
})

function leerFormulario(formData: FormData) {
  const bruto = Object.fromEntries(formData)
  return {
    ...bruto,
    category_id: bruto.category_id ? String(bruto.category_id) : null,
    description: bruto.description ? String(bruto.description) : null,
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
  }
}

export async function guardarServicio(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { supabase } = await requireStaff()
  const parsed = servicioSchema.safeParse(leerFormulario(formData))

  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message ?? 'Revisa los datos.' }
  }

  const { id, ...datos } = parsed.data
  const fila = { ...datos, slug: slugify(datos.name) }

  const { error } = id
    ? await supabase.from('services').update(fila).eq('id', id)
    : await supabase.from('services').insert(fila)

  if (error) {
    const mensaje = error.code === '23505'
      ? 'Ya existe un servicio con ese nombre.'
      : 'No se pudo guardar el servicio.'
    return { ok: false, mensaje }
  }

  revalidatePath('/admin/servicios')
  revalidatePath('/servicios')
  revalidatePath('/')
  return { ok: true, mensaje: 'Servicio guardado.' }
}

export async function archivarServicio(formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()
  const id = String(formData.get('id'))

  // No se borra: un servicio eliminado dejaría citas históricas sin referencia.
  await supabase.from('services').update({ is_active: false }).eq('id', id)

  revalidatePath('/admin/servicios')
  revalidatePath('/servicios')
  redirect('/admin/servicios')
}

// =============================================================
// Paquetes
// =============================================================
const paqueteSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2),
  description: z.string().trim().max(1000).nullable(),
  price_amount: z.coerce.number().int().min(0),
  sessions_count: z.coerce.number().int().min(1).max(100),
  validity_days: z.union([z.coerce.number().int().min(1), z.literal('')]).transform((v) => (v === '' ? null : v)),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
})

export async function guardarPaquete(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { supabase } = await requireStaff()
  const parsed = paqueteSchema.safeParse(leerFormulario(formData))

  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message ?? 'Revisa los datos.' }
  }

  const { id, ...datos } = parsed.data
  const fila = { ...datos, slug: slugify(datos.name) }

  const { data: guardado, error } = id
    ? await supabase.from('packages').update(fila).eq('id', id).select('id').single()
    : await supabase.from('packages').insert(fila).select('id').single()

  if (error || !guardado) {
    return { ok: false, mensaje: 'No se pudo guardar el paquete.' }
  }

  // Servicios que el paquete permite canjear: se reescribe el vínculo completo.
  const serviciosElegidos = formData.getAll('service_ids').map(String)
  await supabase.from('package_services').delete().eq('package_id', guardado.id)
  if (serviciosElegidos.length > 0) {
    await supabase.from('package_services').insert(
      serviciosElegidos.map((service_id) => ({ package_id: guardado.id, service_id })),
    )
  }

  revalidatePath('/admin/paquetes')
  revalidatePath('/paquetes')
  return { ok: true, mensaje: 'Paquete guardado.' }
}

export async function archivarPaquete(formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()
  await supabase.from('packages').update({ is_active: false }).eq('id', String(formData.get('id')))
  revalidatePath('/admin/paquetes')
  revalidatePath('/paquetes')
  redirect('/admin/paquetes')
}

// =============================================================
// Equipo
// =============================================================
const profesionalSchema = z.object({
  id: z.uuid().optional(),
  display_name: z.string().trim().min(2),
  title: z.string().trim().max(120).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
})

export async function guardarProfesional(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { supabase } = await requireStaff()
  const bruto = Object.fromEntries(formData)
  const parsed = profesionalSchema.safeParse({
    ...bruto,
    title: bruto.title ? String(bruto.title) : null,
    bio: bruto.bio ? String(bruto.bio) : null,
    is_active: formData.get('is_active') === 'on',
  })

  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message ?? 'Revisa los datos.' }
  }

  const { id, ...datos } = parsed.data
  const { data: guardado, error } = id
    ? await supabase.from('staff').update(datos).eq('id', id).select('id').single()
    : await supabase.from('staff').insert(datos).select('id').single()

  if (error || !guardado) return { ok: false, mensaje: 'No se pudo guardar.' }

  const servicios = formData.getAll('service_ids').map(String)
  await supabase.from('staff_services').delete().eq('staff_id', guardado.id)
  if (servicios.length > 0) {
    await supabase
      .from('staff_services')
      .insert(servicios.map((service_id) => ({ staff_id: guardado.id, service_id })))
  }

  revalidatePath('/admin/equipo')
  revalidatePath('/equipo')
  return { ok: true, mensaje: 'Profesional guardado.' }
}

/**
 * Reemplaza el horario semanal completo.
 *
 * Se manda un par de horas por día; un día sin horas queda sin turno, que
 * es la forma natural de marcar "no trabaja ese día".
 */
export async function guardarHorario(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { supabase } = await requireStaff()
  const staffId = String(formData.get('staff_id'))
  const locationId = String(formData.get('location_id'))

  if (!staffId || !locationId) {
    return { ok: false, mensaje: 'Falta la sucursal.' }
  }

  const turnos: Array<{
    staff_id: string
    location_id: string
    weekday: number
    start_time: string
    end_time: string
  }> = []

  for (let weekday = 0; weekday < 7; weekday++) {
    const inicio = String(formData.get(`start_${weekday}`) ?? '')
    const fin = String(formData.get(`end_${weekday}`) ?? '')
    if (!inicio || !fin) continue
    if (fin <= inicio) {
      return { ok: false, mensaje: 'La hora de término debe ser posterior a la de inicio.' }
    }
    turnos.push({ staff_id: staffId, location_id: locationId, weekday, start_time: inicio, end_time: fin })
  }

  await supabase.from('work_shifts').delete().eq('staff_id', staffId)
  if (turnos.length > 0) {
    const { error } = await supabase.from('work_shifts').insert(turnos)
    if (error) return { ok: false, mensaje: 'No se pudo guardar el horario.' }
  }

  revalidatePath('/admin/equipo')
  return { ok: true, mensaje: 'Horario actualizado.' }
}

// =============================================================
// Agenda
// =============================================================
export async function cambiarEstadoCita(formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()
  const id = String(formData.get('id'))
  const estado = String(formData.get('status'))

  const permitidos = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
  if (!permitidos.includes(estado)) return

  const extra =
    estado === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}

  // Cancelar desde el panel devuelve el crédito del paquete sin importar el
  // plazo: si el local cancela, la clienta no pierde la sesión.
  if (estado === 'cancelled') {
    await supabase.rpc('refund_package_credit', { p_appointment_id: id })
  }

  await supabase.from('appointments').update({ status: estado, ...extra }).eq('id', id)
  revalidatePath('/admin')
}

export async function bloquearHorario(formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()
  const staffId = formData.get('staff_id')

  await supabase.from('time_off').insert({
    // Vacío = bloqueo para todo el local (feriado, cierre).
    staff_id: staffId ? String(staffId) : null,
    starts_at: new Date(String(formData.get('starts_at'))).toISOString(),
    ends_at: new Date(String(formData.get('ends_at'))).toISOString(),
    reason: formData.get('reason') ? String(formData.get('reason')) : null,
  })

  revalidatePath('/admin')
}

export async function eliminarBloqueo(formData: FormData): Promise<void> {
  const { supabase } = await requireStaff()
  await supabase.from('time_off').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin')
}

// =============================================================
// Ajustes
// =============================================================
export async function guardarAjustes(
  _estado: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { supabase, role } = await requireStaff()
  if (role !== 'admin') return { ok: false, mensaje: 'Sólo un administrador puede cambiar esto.' }

  const business = {
    name: String(formData.get('name') ?? ''),
    tagline: String(formData.get('tagline') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    instagram: String(formData.get('instagram') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    currency: String(formData.get('currency') ?? 'CLP').toUpperCase(),
    timezone: String(formData.get('timezone') ?? 'America/Santiago'),
  }

  const booking = {
    slot_interval_min: Number(formData.get('slot_interval_min')),
    min_lead_hours: Number(formData.get('min_lead_hours')),
    max_advance_days: Number(formData.get('max_advance_days')),
    cancel_window_hours: Number(formData.get('cancel_window_hours')),
    require_account: formData.get('require_account') === 'on',
    auto_confirm: formData.get('auto_confirm') === 'on',
  }

  const numerosValidos =
    booking.slot_interval_min >= 5 &&
    booking.slot_interval_min <= 120 &&
    booking.min_lead_hours >= 0 &&
    booking.max_advance_days >= 1 &&
    booking.max_advance_days <= 365 &&
    booking.cancel_window_hours >= 0

  if (!numerosValidos) {
    return { ok: false, mensaje: 'Revisa los números de la agenda.' }
  }

  // La zona horaria mal escrita rompería el cálculo de disponibilidad entero.
  try {
    new Intl.DateTimeFormat('es', { timeZone: business.timezone })
  } catch {
    return { ok: false, mensaje: 'La zona horaria no es válida.' }
  }

  const home = {
    hero_title: String(formData.get('hero_title') ?? ''),
    hero_subtitle: String(formData.get('hero_subtitle') ?? ''),
    hero_cta: String(formData.get('hero_cta') ?? 'Reservar hora'),
    about_title: String(formData.get('about_title') ?? ''),
    about_body: String(formData.get('about_body') ?? ''),
    values: [0, 1, 2]
      .map((i) => ({
        title: String(formData.get(`value_title_${i}`) ?? '').trim(),
        body: String(formData.get(`value_body_${i}`) ?? '').trim(),
      }))
      .filter((v) => v.title.length > 0),
  }

  const { error } = await supabase.from('settings').upsert(
    [
      { key: 'business', value: business },
      { key: 'booking', value: booking },
      { key: 'home', value: home },
    ],
    { onConflict: 'key' },
  )

  if (error) return { ok: false, mensaje: 'No se pudieron guardar los ajustes.' }

  revalidatePath('/', 'layout')
  return { ok: true, mensaje: 'Ajustes guardados.' }
}
