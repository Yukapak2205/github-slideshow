import { getSettings } from '@/lib/settings'
import { AreaTexto, Campo, FormAdmin, Interruptor } from '@/components/admin/form-admin'
import { guardarAjustes } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  const { business, booking, home } = await getSettings()

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl">Ajustes</h2>
      <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
        Datos del negocio, reglas de la agenda y textos de la portada. Todo esto se aplica
        también a la app móvil, que lee la misma configuración.
      </p>

      <div className="mt-10">
        <FormAdmin accion={guardarAjustes}>
          <section className="space-y-5">
            <h3 className="text-lg">El negocio</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" nombre="name" valor={business.name} requerido />
              <Campo etiqueta="Bajada" nombre="tagline" valor={business.tagline} />
              <Campo etiqueta="Correo" nombre="email" tipo="email" valor={business.email} />
              <Campo etiqueta="Teléfono" nombre="phone" valor={business.phone} />
              <Campo etiqueta="Instagram" nombre="instagram" valor={business.instagram} />
              <Campo etiqueta="WhatsApp" nombre="whatsapp" valor={business.whatsapp} />
              <Campo
                etiqueta="Moneda"
                nombre="currency"
                valor={business.currency}
                ayuda="Código ISO: CLP, ARS, MXN, USD…"
              />
              <Campo
                etiqueta="Zona horaria"
                nombre="timezone"
                valor={business.timezone}
                ayuda="Ej: America/Santiago"
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-[var(--color-arena)] pt-8">
            <h3 className="text-lg">Reglas de la agenda</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Intervalo entre horas (min)"
                nombre="slot_interval_min"
                tipo="number"
                min={5}
                max={120}
                valor={booking.slot_interval_min}
                ayuda="Cada cuánto se ofrece una hora de inicio."
              />
              <Campo
                etiqueta="Anticipación mínima (horas)"
                nombre="min_lead_hours"
                tipo="number"
                min={0}
                valor={booking.min_lead_hours}
              />
              <Campo
                etiqueta="Agenda abierta (días)"
                nombre="max_advance_days"
                tipo="number"
                min={1}
                max={365}
                valor={booking.max_advance_days}
              />
              <Campo
                etiqueta="Plazo para cancelar (horas)"
                nombre="cancel_window_hours"
                tipo="number"
                min={0}
                valor={booking.cancel_window_hours}
                ayuda="Cancelando antes de este plazo, el crédito del paquete se devuelve."
              />
              <Campo
                etiqueta="Recordatorio (horas antes)"
                nombre="reminder_hours"
                tipo="number"
                min={0}
                max={168}
                valor={booking.reminder_hours}
                ayuda="Correo automático antes de la cita. 0 = no enviar."
              />
            </div>
            <div className="space-y-3">
              <Interruptor
                etiqueta="Exigir cuenta para reservar"
                nombre="require_account"
                activo={booking.require_account}
                ayuda="Si lo desactivas, se puede reservar dejando sólo un correo."
              />
              <Interruptor
                etiqueta="Confirmar reservas automáticamente"
                nombre="auto_confirm"
                activo={booking.auto_confirm}
                ayuda="Si lo desactivas, las reservas quedan 'por confirmar' hasta que las revises."
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-[var(--color-arena)] pt-8">
            <h3 className="text-lg">Portada</h3>
            <Campo etiqueta="Título principal" nombre="hero_title" valor={home.hero_title} />
            <AreaTexto etiqueta="Bajada" nombre="hero_subtitle" valor={home.hero_subtitle} />
            <Campo etiqueta="Texto del botón" nombre="hero_cta" valor={home.hero_cta} />
            <Campo etiqueta="Título de la sección" nombre="about_title" valor={home.about_title} />
            <AreaTexto etiqueta="Texto de la sección" nombre="about_body" valor={home.about_body} />

            <fieldset className="space-y-4">
              <legend className="etiqueta-campo">Tres pilares</legend>
              {[0, 1, 2].map((indice) => (
                <div key={indice} className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Campo
                    etiqueta={`Pilar ${indice + 1}`}
                    nombre={`value_title_${indice}`}
                    valor={home.values[indice]?.title ?? ''}
                  />
                  <Campo
                    etiqueta="Descripción"
                    nombre={`value_body_${indice}`}
                    valor={home.values[indice]?.body ?? ''}
                  />
                </div>
              ))}
            </fieldset>
          </section>
        </FormAdmin>
      </div>
    </div>
  )
}
