import Link from 'next/link'
import { formatMoney } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function HomePage() {
  const { business, home } = await getSettings()
  const supabase = await createClient()

  const [{ data: servicios }, { data: paquetes }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, slug, description, price_amount, duration_min')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(4),
    supabase
      .from('packages')
      .select('id, name, slug, description, price_amount, sessions_count')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(3),
  ])

  return (
    <>
      {/* ---------- portada ---------- */}
      <section className="relative overflow-hidden">
        <div className="contenedor grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="etiqueta">{business.tagline}</p>
            <h1 className="mt-5 text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              {home.hero_title}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--color-tinta-suave)]">
              {home.hero_subtitle}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/reservar" className="boton-primario">
                {home.hero_cta}
              </Link>
              <Link href="/paquetes" className="boton-secundario">
                Ver paquetes
              </Link>
            </div>
          </div>

          <div
            aria-hidden
            className="hidden aspect-[4/5] rounded-[2rem] bg-gradient-to-br from-[var(--color-arena)] via-[var(--color-arena-oscura)] to-[var(--color-salvia-clara)] lg:block"
          />
        </div>
      </section>

      {/* ---------- valores ---------- */}
      {home.values.length > 0 && (
        <section className="contenedor py-16">
          <h2 className="text-3xl">{home.about_title}</h2>
          <p className="mt-4 max-w-2xl text-[var(--color-tinta-suave)]">{home.about_body}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {home.values.map((value) => (
              <div key={value.title} className="tarjeta">
                <h3 className="text-lg">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-tinta-suave)]">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- servicios destacados ---------- */}
      {servicios && servicios.length > 0 && (
        <section className="contenedor py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl">Tratamientos</h2>
            <Link href="/servicios" className="text-sm text-[var(--color-cobre)] hover:underline">
              Ver todos
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {servicios.map((servicio) => (
              <Link
                key={servicio.id}
                href={`/servicios/${servicio.slug}`}
                className="tarjeta transition-colors hover:border-[var(--color-cobre)]"
              >
                <p className="text-xs text-[var(--color-tinta-tenue)]">
                  {servicio.duration_min} min
                </p>
                <h3 className="mt-2 text-lg">{servicio.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--color-tinta-suave)]">
                  {servicio.description}
                </p>
                <p className="mt-4 font-medium text-[var(--color-cobre)]">
                  {formatMoney(servicio.price_amount, business.currency)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- paquetes ---------- */}
      {paquetes && paquetes.length > 0 && (
        <section className="bg-[var(--color-arena)]/40 py-16">
          <div className="contenedor">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl">Planes de sesiones</h2>
                <p className="mt-2 max-w-xl text-[var(--color-tinta-suave)]">
                  Compra una vez y agenda cuando quieras. Las sesiones quedan en tu cuenta.
                </p>
              </div>
              <Link href="/paquetes" className="text-sm text-[var(--color-cobre)] hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {paquetes.map((paquete) => (
                <Link
                  key={paquete.id}
                  href={`/paquetes#${paquete.slug}`}
                  className="tarjeta bg-white transition-colors hover:border-[var(--color-cobre)]"
                >
                  <span className="etiqueta">{paquete.sessions_count} sesiones</span>
                  <h3 className="mt-3 text-lg">{paquete.name}</h3>
                  <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
                    {paquete.description}
                  </p>
                  <p className="mt-4 text-xl font-medium">
                    {formatMoney(paquete.price_amount, business.currency)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- cierre ---------- */}
      <section className="contenedor py-20 text-center">
        <h2 className="text-3xl">¿Lista para partir?</h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--color-tinta-suave)]">
          Elige tu tratamiento y reserva en menos de un minuto. Sin llamadas ni esperas.
        </p>
        <Link href="/reservar" className="boton-primario mt-8">
          Reservar hora
        </Link>
      </section>
    </>
  )
}
