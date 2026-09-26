import Link from 'next/link'
import { formatMoney } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AdminPaquetesPage() {
  const { business } = await getSettings()
  const supabase = await createClient()

  const [{ data: paquetes }, { data: compras }] = await Promise.all([
    supabase
      .from('packages')
      .select('id, name, price_amount, sessions_count, validity_days, is_active')
      .order('sort_order'),
    supabase
      .from('package_purchases')
      .select('id, package_name, sessions_total, sessions_used, status, purchased_at, profiles(full_name, email)')
      .order('purchased_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="space-y-14">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl">Paquetes</h2>
            <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
              Cambiar el precio no afecta a quien ya compró: cada compra guarda sus propias
              condiciones.
            </p>
          </div>
          <Link href="/admin/paquetes/nuevo" className="boton-primario">Nuevo paquete</Link>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-[var(--color-arena-oscura)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
              <tr>
                <th className="py-3">Paquete</th>
                <th className="py-3">Sesiones</th>
                <th className="py-3">Precio</th>
                <th className="py-3">Vigencia</th>
                <th className="py-3">Estado</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-arena)]">
              {(paquetes ?? []).map((paquete) => (
                <tr key={paquete.id} className={paquete.is_active ? '' : 'opacity-50'}>
                  <td className="py-4 font-medium">{paquete.name}</td>
                  <td className="py-4">{paquete.sessions_count}</td>
                  <td className="py-4">{formatMoney(paquete.price_amount, business.currency)}</td>
                  <td className="py-4">
                    {paquete.validity_days ? `${paquete.validity_days} días` : 'Sin vencimiento'}
                  </td>
                  <td className="py-4">{paquete.is_active ? 'Publicado' : 'Archivado'}</td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/admin/paquetes/${paquete.id}`}
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
      </section>

      <section>
        <h2 className="text-2xl">Últimas compras</h2>
        {(compras ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">Todavía no hay compras.</p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--color-arena)] border-y border-[var(--color-arena)] text-sm">
            {(compras ?? []).map((compra) => (
              <li key={compra.id} className="flex flex-wrap justify-between gap-3 py-4">
                <span>
                  <span className="font-medium">{compra.package_name}</span>
                  <span className="block text-[var(--color-tinta-suave)]">
                    {uno(compra.profiles)?.full_name || uno(compra.profiles)?.email || 'Cliente'}
                  </span>
                </span>
                <span className="text-right text-[var(--color-tinta-suave)]">
                  {compra.sessions_used}/{compra.sessions_total} usadas
                  <span className="block">{compra.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
