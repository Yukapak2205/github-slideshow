import { notFound } from 'next/navigation'
import { WEEKDAYS } from '@carezia/core'
import { createClient } from '@/lib/supabase/server'
import { AreaTexto, Campo, FormAdmin, Interruptor } from '@/components/admin/form-admin'
import { guardarHorario, guardarProfesional } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EditarProfesionalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const esNuevo = id === 'nuevo'
  const supabase = await createClient()

  const [{ data: servicios }, { data: sucursales }] = await Promise.all([
    supabase.from('services').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('locations').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  const profesional = esNuevo
    ? null
    : (await supabase.from('staff').select('*').eq('id', id).maybeSingle()).data

  if (!esNuevo && !profesional) notFound()

  const [{ data: vinculos }, { data: turnos }] = profesional
    ? await Promise.all([
        supabase.from('staff_services').select('service_id').eq('staff_id', profesional.id),
        supabase
          .from('work_shifts')
          .select('weekday, start_time, end_time, location_id')
          .eq('staff_id', profesional.id),
      ])
    : [{ data: [] }, { data: [] }]

  const elegidos = new Set((vinculos ?? []).map((v) => v.service_id))
  const turnoDe = (weekday: number) => (turnos ?? []).find((t) => t.weekday === weekday)

  return (
    <div className="max-w-2xl space-y-14">
      <div>
        <h2 className="text-2xl">{esNuevo ? 'Nuevo profesional' : profesional!.display_name}</h2>

        <div className="mt-8">
          <FormAdmin accion={guardarProfesional}>
            {profesional && <input type="hidden" name="id" value={profesional.id} />}

            <Campo
              etiqueta="Nombre visible"
              nombre="display_name"
              valor={profesional?.display_name}
              requerido
            />
            <Campo
              etiqueta="Cargo"
              nombre="title"
              valor={profesional?.title}
              ayuda="Ej: Cosmetóloga · Directora técnica"
            />
            <AreaTexto etiqueta="Biografía" nombre="bio" valor={profesional?.bio} />

            <fieldset>
              <legend className="etiqueta-campo">Servicios que realiza</legend>
              <p className="mb-3 text-xs text-[var(--color-tinta-tenue)]">
                Sólo aparece como opción en los servicios que marques.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(servicios ?? []).map((servicio) => (
                  <label key={servicio.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="service_ids"
                      value={servicio.id}
                      defaultChecked={elegidos.has(servicio.id)}
                    />
                    {servicio.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <Campo
              etiqueta="Orden"
              nombre="sort_order"
              tipo="number"
              min={0}
              valor={profesional?.sort_order ?? 0}
            />
            <Interruptor
              etiqueta="Activa"
              nombre="is_active"
              activo={profesional?.is_active ?? true}
              ayuda="Al desactivarla, sus horas dejan de ofrecerse."
            />
          </FormAdmin>
        </div>
      </div>

      {/* ---------- horario semanal ---------- */}
      {profesional && (
        <div className="border-t border-[var(--color-arena)] pt-10">
          <h3 className="text-xl">Horario semanal</h3>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Deja un día en blanco para marcar que no trabaja. Este horario es la base de toda
            la disponibilidad que ve el cliente.
          </p>

          <div className="mt-6">
            <FormAdmin accion={guardarHorario} textoBoton="Guardar horario">
              <input type="hidden" name="staff_id" value={profesional.id} />

              <div>
                <label htmlFor="location_id" className="etiqueta-campo">Sucursal</label>
                <select
                  id="location_id"
                  name="location_id"
                  className="campo"
                  defaultValue={turnos?.[0]?.location_id ?? sucursales?.[0]?.id ?? ''}
                >
                  {(sucursales ?? []).map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {WEEKDAYS.map((nombre, weekday) => {
                  const turno = turnoDe(weekday)
                  return (
                    <div key={nombre} className="grid grid-cols-[100px_1fr_1fr] items-center gap-3">
                      <span className="text-sm">{nombre}</span>
                      <input
                        type="time"
                        name={`start_${weekday}`}
                        defaultValue={turno ? String(turno.start_time).slice(0, 5) : ''}
                        className="campo !py-2"
                        aria-label={`Hora de inicio ${nombre}`}
                      />
                      <input
                        type="time"
                        name={`end_${weekday}`}
                        defaultValue={turno ? String(turno.end_time).slice(0, 5) : ''}
                        className="campo !py-2"
                        aria-label={`Hora de término ${nombre}`}
                      />
                    </div>
                  )
                })}
              </div>
            </FormAdmin>
          </div>
        </div>
      )}
    </div>
  )
}
