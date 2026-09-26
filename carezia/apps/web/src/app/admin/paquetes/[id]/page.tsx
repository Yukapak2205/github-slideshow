import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AreaTexto, Campo, FormAdmin, Interruptor } from '@/components/admin/form-admin'
import { archivarPaquete, guardarPaquete } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EditarPaquetePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const esNuevo = id === 'nuevo'
  const supabase = await createClient()

  const { data: servicios } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  const paquete = esNuevo
    ? null
    : (await supabase.from('packages').select('*').eq('id', id).maybeSingle()).data

  if (!esNuevo && !paquete) notFound()

  const { data: vinculados } = paquete
    ? await supabase.from('package_services').select('service_id').eq('package_id', paquete.id)
    : { data: [] }

  const elegidos = new Set((vinculados ?? []).map((v) => v.service_id))

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl">{esNuevo ? 'Nuevo paquete' : paquete!.name}</h2>

      <div className="mt-8">
        <FormAdmin accion={guardarPaquete}>
          {paquete && <input type="hidden" name="id" value={paquete.id} />}

          <Campo etiqueta="Nombre" nombre="name" valor={paquete?.name} requerido />
          <AreaTexto etiqueta="Descripción" nombre="description" valor={paquete?.description} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              etiqueta="Precio total"
              nombre="price_amount"
              tipo="number"
              min={0}
              valor={paquete?.price_amount ?? 0}
              requerido
            />
            <Campo
              etiqueta="N.º de sesiones"
              nombre="sessions_count"
              tipo="number"
              min={1}
              max={100}
              valor={paquete?.sessions_count ?? 4}
              requerido
            />
            <Campo
              etiqueta="Vigencia (días)"
              nombre="validity_days"
              tipo="number"
              min={1}
              valor={paquete?.validity_days ?? ''}
              ayuda="Vacío = no vence."
            />
          </div>

          <fieldset>
            <legend className="etiqueta-campo">Servicios que cubre</legend>
            <p className="mb-3 text-xs text-[var(--color-tinta-tenue)]">
              Al reservar cualquiera de estos, la clienta puede pagar con una sesión del paquete.
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
            etiqueta="Orden en la lista"
            nombre="sort_order"
            tipo="number"
            min={0}
            valor={paquete?.sort_order ?? 0}
          />

          <div className="space-y-3">
            <Interruptor etiqueta="Publicado" nombre="is_active" activo={paquete?.is_active ?? true} />
            <Interruptor
              etiqueta="Destacado en la portada"
              nombre="is_featured"
              activo={paquete?.is_featured ?? false}
            />
          </div>
        </FormAdmin>

        {paquete && paquete.is_active && (
          <form action={archivarPaquete} className="mt-10 border-t border-[var(--color-arena)] pt-6">
            <input type="hidden" name="id" value={paquete.id} />
            <p className="text-sm text-[var(--color-tinta-suave)]">
              Archivar lo saca de la venta. Los paquetes ya comprados siguen funcionando.
            </p>
            <button type="submit" className="boton-secundario mt-3">Archivar paquete</button>
          </form>
        )}
      </div>
    </div>
  )
}
