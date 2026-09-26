import Link from 'next/link'
import { formatMoney } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminServiciosPage() {
  const { business } = await getSettings()
  const supabase = await createClient()

  const { data: servicios } = await supabase
    .from('services')
    .select('id, name, price_amount, duration_min, is_active, is_featured, service_categories(name)')
    .order('sort_order')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Servicios</h2>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Los cambios de precio y duración se reflejan de inmediato en la web y en la app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/servicios/importar" className="boton-secundario">
            Carga masiva
          </Link>
          <Link href="/admin/servicios/nuevo" className="boton-primario">Nuevo servicio</Link>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[var(--color-arena-oscura)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            <tr>
              <th className="py-3">Servicio</th>
              <th className="py-3">Categoría</th>
              <th className="py-3">Duración</th>
              <th className="py-3">Precio</th>
              <th className="py-3">Estado</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-arena)]">
            {(servicios ?? []).map((servicio) => (
              <tr key={servicio.id} className={servicio.is_active ? '' : 'opacity-50'}>
                <td className="py-4 font-medium">
                  {servicio.name}
                  {servicio.is_featured && (
                    <span className="ml-2 text-xs text-[var(--color-cobre)]">destacado</span>
                  )}
                </td>
                <td className="py-4 text-[var(--color-tinta-suave)]">
                  {uno(servicio.service_categories)?.name ?? '—'}
                </td>
                <td className="py-4">{servicio.duration_min} min</td>
                <td className="py-4">{formatMoney(servicio.price_amount, business.currency)}</td>
                <td className="py-4">{servicio.is_active ? 'Publicado' : 'Archivado'}</td>
                <td className="py-4 text-right">
                  <Link
                    href={`/admin/servicios/${servicio.id}`}
                    className="text-[var(--color-cobre)] hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
