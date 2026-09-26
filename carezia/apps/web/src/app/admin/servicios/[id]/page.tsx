import { notFound } from 'next/navigation'
import { currencyDecimals } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { AreaTexto, Campo, FormAdmin, Interruptor } from '@/components/admin/form-admin'
import { archivarServicio, guardarServicio } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const esNuevo = id === 'nuevo'
  const { business } = await getSettings()
  const supabase = await createClient()

  const { data: categorias } = await supabase
    .from('service_categories')
    .select('id, name')
    .order('sort_order')

  const servicio = esNuevo
    ? null
    : (
        await supabase
          .from('services')
          .select('*')
          .eq('id', id)
          .maybeSingle()
      ).data

  if (!esNuevo && !servicio) notFound()

  const unidad = currencyDecimals(business.currency) === 0
    ? `Monto entero en ${business.currency} (ej: 45000).`
    : `Monto en centavos de ${business.currency} (ej: 4500 = 45,00).`

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl">{esNuevo ? 'Nuevo servicio' : servicio!.name}</h2>

      <div className="mt-8">
        <FormAdmin accion={guardarServicio}>
          {servicio && <input type="hidden" name="id" value={servicio.id} />}

          <Campo etiqueta="Nombre" nombre="name" valor={servicio?.name} requerido />

          <div>
            <label htmlFor="category_id" className="etiqueta-campo">Categoría</label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={servicio?.category_id ?? ''}
              className="campo"
            >
              <option value="">Sin categoría</option>
              {(categorias ?? []).map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
          </div>

          <AreaTexto etiqueta="Descripción" nombre="description" valor={servicio?.description} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Precio"
              nombre="price_amount"
              tipo="number"
              min={0}
              valor={servicio?.price_amount ?? 0}
              ayuda={unidad}
              requerido
            />
            <Campo
              etiqueta="Abono al reservar"
              nombre="deposit_amount"
              tipo="number"
              min={0}
              valor={servicio?.deposit_amount ?? 0}
              ayuda="0 = se paga todo en el local."
            />
            <Campo
              etiqueta="Duración (minutos)"
              nombre="duration_min"
              tipo="number"
              min={5}
              max={600}
              valor={servicio?.duration_min ?? 60}
              requerido
            />
            <Campo
              etiqueta="Limpieza posterior (minutos)"
              nombre="buffer_min"
              tipo="number"
              min={0}
              max={120}
              valor={servicio?.buffer_min ?? 0}
              ayuda="Tiempo que se bloquea después de la sesión."
            />
          </div>

          <Campo
            etiqueta="Orden en la lista"
            nombre="sort_order"
            tipo="number"
            min={0}
            valor={servicio?.sort_order ?? 0}
          />

          <div className="space-y-3">
            <Interruptor
              etiqueta="Publicado"
              nombre="is_active"
              activo={servicio?.is_active ?? true}
              ayuda="Si lo desmarcas deja de aparecer en la web y no se puede reservar."
            />
            <Interruptor
              etiqueta="Destacado en la portada"
              nombre="is_featured"
              activo={servicio?.is_featured ?? false}
            />
          </div>
        </FormAdmin>

        {servicio && servicio.is_active && (
          <form action={archivarServicio} className="mt-10 border-t border-[var(--color-arena)] pt-6">
            <input type="hidden" name="id" value={servicio.id} />
            <p className="text-sm text-[var(--color-tinta-suave)]">
              Archivar lo saca de la web sin borrar el historial de citas.
            </p>
            <button type="submit" className="boton-secundario mt-3">Archivar servicio</button>
          </form>
        )}
      </div>
    </div>
  )
}
