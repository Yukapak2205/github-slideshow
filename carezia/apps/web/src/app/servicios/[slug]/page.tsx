import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatMoney } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { uno } from '@/lib/db'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle()

  return { title: data?.name ?? 'Servicio', description: data?.description ?? undefined }
}

export default async function ServicioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getSettings()
  const supabase = await createClient()

  const { data: servicio } = await supabase
    .from('services')
    .select(
      'id, name, slug, description, price_amount, duration_min, deposit_amount, category_id, is_active',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!servicio || !servicio.is_active) notFound()

  const [{ data: equipo }, { data: paquetes }] = await Promise.all([
    supabase
      .from('staff_services')
      .select('staff(id, display_name, title, is_active)')
      .eq('service_id', servicio.id),
    supabase
      .from('package_services')
      .select('packages(id, name, slug, price_amount, sessions_count, is_active)')
      .eq('service_id', servicio.id),
  ])

  const profesionales = (equipo ?? [])
    .map((row) => uno(row.staff))
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.is_active))

  const planes = (paquetes ?? [])
    .map((row) => uno(row.packages))
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.is_active))

  return (
    <div className="contenedor py-16">
      <Link href="/servicios" className="text-sm text-[var(--color-tinta-suave)] hover:underline">
        ← Volver a servicios
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <h1 className="text-4xl">{servicio.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--color-tinta-suave)]">
            {servicio.description}
          </p>

          {profesionales.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl">Quién lo realiza</h2>
              <ul className="mt-4 space-y-3">
                {profesionales.map((profesional) => (
                  <li key={profesional.id} className="text-sm">
                    <span className="font-medium">{profesional.display_name}</span>
                    {profesional.title && (
                      <span className="text-[var(--color-tinta-suave)]"> · {profesional.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {planes.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl">Disponible en paquetes</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {planes.map((plan) => (
                  <Link key={plan.id} href={`/paquetes#${plan.slug}`} className="tarjeta">
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                      {plan.sessions_count} sesiones ·{' '}
                      {formatMoney(plan.price_amount, business.currency)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="tarjeta bg-white">
            <p className="text-sm text-[var(--color-tinta-suave)]">Valor sesión</p>
            <p className="mt-1 text-3xl font-medium">
              {formatMoney(servicio.price_amount, business.currency)}
            </p>
            <dl className="mt-6 space-y-3 border-t border-[var(--color-arena)] pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-tinta-suave)]">Duración</dt>
                <dd>{servicio.duration_min} minutos</dd>
              </div>
              {servicio.deposit_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[var(--color-tinta-suave)]">Abono al reservar</dt>
                  <dd>{formatMoney(servicio.deposit_amount, business.currency)}</dd>
                </div>
              )}
            </dl>
            <Link href={`/reservar?servicio=${servicio.slug}`} className="boton-primario mt-6 w-full">
              Reservar este servicio
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
