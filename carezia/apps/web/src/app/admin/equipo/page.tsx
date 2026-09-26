import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminEquipoPage() {
  const supabase = await createClient()

  const [{ data: equipo }, { data: turnos }] = await Promise.all([
    supabase.from('staff').select('id, display_name, title, is_active').order('sort_order'),
    supabase.from('work_shifts').select('staff_id, weekday'),
  ])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Equipo</h2>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Quién atiende, qué servicios realiza y en qué horario.
          </p>
        </div>
        <Link href="/admin/equipo/nuevo" className="boton-primario">Agregar profesional</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(equipo ?? []).map((persona) => {
          const dias = new Set(
            (turnos ?? []).filter((t) => t.staff_id === persona.id).map((t) => t.weekday),
          )

          return (
            <Link
              key={persona.id}
              href={`/admin/equipo/${persona.id}`}
              className={`tarjeta bg-white transition-colors hover:border-[var(--color-cobre)] ${
                persona.is_active ? '' : 'opacity-50'
              }`}
            >
              <p className="font-medium">{persona.display_name}</p>
              {persona.title && (
                <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">{persona.title}</p>
              )}
              <p className="mt-4 text-xs text-[var(--color-tinta-tenue)]">
                {dias.size > 0 ? `${dias.size} días con turno` : 'Sin horario cargado'}
                {persona.is_active ? '' : ' · inactiva'}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
