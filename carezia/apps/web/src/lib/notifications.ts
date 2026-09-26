import 'server-only'

import { Resend } from 'resend'
import { formatLocalTime, formatMoney, zonedParts } from '@carezia/core'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatLongDate(iso: string, timezone: string): string {
  const p = zonedParts(new Date(iso), timezone)
  return `${p.day} de ${MONTHS[p.month - 1]} de ${p.year}`
}

interface AppointmentEmail {
  to: string
  clientName: string
  serviceName: string
  staffName: string
  locationName: string
  locationAddress?: string | null
  startsAt: string
  timezone: string
  priceAmount: number
  currency: string
  paidWithPackage: boolean
  businessName: string
  cancelWindowHours: number
  manageUrl: string
}

/**
 * Envía la confirmación de la cita.
 *
 * Si Resend no está configurado no falla: registra y sigue. Una reserva
 * nunca debe perderse porque el correo no salió.
 */
export async function sendAppointmentConfirmation(data: AppointmentEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.info('[correo] Resend no configurado; se omite la confirmación para', data.to)
    return false
  }

  const fecha = formatLongDate(data.startsAt, data.timezone)
  const hora = formatLocalTime(new Date(data.startsAt), data.timezone)
  const precio = data.paidWithPackage
    ? 'Pagado con tu paquete de sesiones'
    : formatMoney(data.priceAmount, data.currency)

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;color:#2A2422">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 4px">Tu hora está reservada</h1>
      <p style="color:#6B5F58;margin:0 0 24px">Te esperamos, ${escapeHtml(data.clientName)}.</p>
      <table style="width:100%;border-collapse:collapse;background:#FBF7F2;border-radius:12px">
        ${row('Servicio', data.serviceName)}
        ${row('Fecha', `${fecha} · ${hora} h`)}
        ${row('Profesional', data.staffName)}
        ${row('Lugar', [data.locationName, data.locationAddress].filter(Boolean).join(' — '))}
        ${row('Valor', precio)}
      </table>
      <p style="color:#6B5F58;font-size:14px;margin:24px 0 8px">
        Si necesitas cambiar o cancelar, hazlo con al menos ${data.cancelWindowHours} horas de anticipación.
      </p>
      <p><a href="${data.manageUrl}" style="color:#B0705A">Ver o cancelar mi reserva</a></p>
      <p style="color:#9B8E86;font-size:12px;margin-top:32px">${escapeHtml(data.businessName)}</p>
    </div>
  `

  try {
    await new Resend(apiKey).emails.send({
      from,
      to: data.to,
      subject: `Tu hora en ${data.businessName} · ${fecha} ${hora} h`,
      html,
    })
    return true
  } catch (error) {
    console.error('[correo] No se pudo enviar la confirmación:', error)
    return false
  }
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:12px 16px;color:#6B5F58;font-size:14px">${escapeHtml(label)}</td>
    <td style="padding:12px 16px;text-align:right;font-weight:500">${escapeHtml(value)}</td>
  </tr>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  )
}

interface ReminderEmail {
  to: string
  clientName: string
  serviceName: string
  staffName: string
  locationName: string
  locationAddress?: string | null
  startsAt: string
  timezone: string
  businessName: string
  cancelWindowHours: number
  manageUrl: string
  calendarUrl: string
}

/**
 * Recordatorio previo a la cita.
 *
 * Igual que la confirmación, no revienta si Resend no está configurado:
 * la tarea programada seguirá marcando la cita para no reintentar en
 * bucle, y el negocio funciona aunque el correo no salga.
 */
export async function sendAppointmentReminder(data: ReminderEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.info('[correo] Resend no configurado; se omite el recordatorio para', data.to)
    return false
  }

  const fecha = formatLongDate(data.startsAt, data.timezone)
  const hora = formatLocalTime(new Date(data.startsAt), data.timezone)

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;color:#2A2422">
      <h1 style="font-size:22px;font-weight:600;margin:0 0 4px">Te esperamos ${escapeHtml(fecha)}</h1>
      <p style="color:#6B5F58;margin:0 0 24px">
        Hola ${escapeHtml(data.clientName)}, este es el recordatorio de tu hora.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#FBF7F2;border-radius:12px">
        ${row('Servicio', data.serviceName)}
        ${row('Fecha', `${fecha} · ${hora} h`)}
        ${row('Profesional', data.staffName)}
        ${row('Lugar', [data.locationName, data.locationAddress].filter(Boolean).join(' — '))}
      </table>
      <p style="margin:24px 0 8px">
        <a href="${data.calendarUrl}" style="color:#B0705A">Agregar a mi calendario</a>
      </p>
      <p style="color:#6B5F58;font-size:14px;margin:8px 0">
        ¿No puedes venir? Avísanos con al menos ${data.cancelWindowHours} horas de anticipación
        desde <a href="${data.manageUrl}" style="color:#B0705A">tu reserva</a>.
      </p>
      <p style="color:#9B8E86;font-size:12px;margin-top:32px">${escapeHtml(data.businessName)}</p>
    </div>
  `

  try {
    await new Resend(apiKey).emails.send({
      from,
      to: data.to,
      subject: `Recordatorio · tu hora en ${data.businessName} es ${fecha} a las ${hora}`,
      html,
    })
    return true
  } catch (error) {
    console.error('[correo] No se pudo enviar el recordatorio:', error)
    return false
  }
}
