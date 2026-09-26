import { createClient } from '@/lib/supabase/server'

export const revalidate = 60
export const metadata = { title: 'Equipo' }

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: equipo } = await supabase
    .from('staff')
    .select('id, display_name, title, bio')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="contenedor py-16">
      <h1 className="text-4xl">El equipo</h1>
      <p className="mt-3 max-w-xl text-[var(--color-tinta-suave)]">
        Quienes van a atenderte, con su formación y su foco de trabajo.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(equipo ?? []).map((persona) => (
          <article key={persona.id} className="tarjeta bg-white">
            <div
              aria-hidden
              className="mb-5 aspect-square w-20 rounded-full bg-[var(--color-arena)]"
            />
            <h2 className="text-lg">{persona.display_name}</h2>
            {persona.title && (
              <p className="mt-1 text-sm text-[var(--color-cobre)]">{persona.title}</p>
            )}
            {persona.bio && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-tinta-suave)]">
                {persona.bio}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
