import { createClient } from '@/lib/supabase/server'
import { formatLongDate } from '@/lib/notifications'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const { business } = await getSettings()
  const supabase = await createClient()

  let consulta = supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at, role')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q && q.trim().length > 1) {
    const termino = q.trim()
    consulta = consulta.or(
      `full_name.ilike.%${termino}%,email.ilike.%${termino}%,phone.ilike.%${termino}%`,
    )
  }

  const { data: clientes } = await consulta

  return (
    <div>
      <h2 className="text-2xl">Clientes</h2>

      <form className="mt-6 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, correo o teléfono"
          className="campo"
          aria-label="Buscar cliente"
        />
        <button type="submit" className="boton-secundario">Buscar</button>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[var(--color-arena-oscura)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            <tr>
              <th className="py-3">Nombre</th>
              <th className="py-3">Correo</th>
              <th className="py-3">Teléfono</th>
              <th className="py-3">Registro</th>
              <th className="py-3">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-arena)]">
            {(clientes ?? []).map((cliente) => (
              <tr key={cliente.id}>
                <td className="py-4 font-medium">{cliente.full_name || '—'}</td>
                <td className="py-4 text-[var(--color-tinta-suave)]">{cliente.email ?? '—'}</td>
                <td className="py-4 text-[var(--color-tinta-suave)]">{cliente.phone ?? '—'}</td>
                <td className="py-4 text-[var(--color-tinta-suave)]">
                  {formatLongDate(cliente.created_at, business.timezone)}
                </td>
                <td className="py-4">{cliente.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(clientes ?? []).length === 0 && (
        <p className="mt-6 text-sm text-[var(--color-tinta-suave)]">
          No se encontraron clientes.
        </p>
      )}
    </div>
  )
}
