import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { uno, varios } from '@/lib/db'
import { FlujoReserva } from '@/components/reserva/flujo-reserva'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reservar hora' }

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>
}) {
  const { servicio: slugInicial } = await searchParams
  const { business, booking } = await getSettings()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: servicios }, { data: categorias }, { data: vinculos }, { data: equipo }] =
    await Promise.all([
      supabase
        .from('services')
        .select('id, category_id, name, slug, description, price_amount, duration_min, deposit_amount')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('service_categories')
        .select('id, name, slug, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
      supabase.from('staff_services').select('staff_id, service_id'),
      supabase
        .from('staff')
        .select('id, display_name, title')
        .eq('is_active', true)
        .order('sort_order'),
    ])

  // Créditos disponibles de quien ya compró paquetes.
  let creditos: Array<{
    id: string
    package_name: string
    sessions_total: number
    sessions_used: number
    expires_at: string | null
    serviceIds: string[]
  }> = []

  if (user) {
    const { data: compras } = await supabase
      .from('package_purchases')
      .select(
        `id, package_id, package_name, sessions_total, sessions_used, expires_at,
         packages(package_services(service_id))`,
      )
      .eq('client_id', user.id)
      .eq('status', 'active')
      .order('purchased_at', { ascending: true })

    creditos = (compras ?? [])
      .filter((compra) => compra.sessions_used < compra.sessions_total)
      .filter((compra) => !compra.expires_at || new Date(compra.expires_at) > new Date())
      .map((compra) => ({
        id: compra.id,
        package_name: compra.package_name,
        sessions_total: compra.sessions_total,
        sessions_used: compra.sessions_used,
        expires_at: compra.expires_at,
        serviceIds: varios(uno(compra.packages)?.package_services).map(
          (ps) => ps.service_id as string,
        ),
      }))
  }

  return (
    <div className="contenedor py-12 sm:py-16">
      <h1 className="text-4xl">Reservar hora</h1>
      <p className="mt-3 max-w-xl text-[var(--color-tinta-suave)]">
        Elige el tratamiento, la hora que te acomode y listo. Te llega la confirmación al correo.
      </p>

      <FlujoReserva
        servicios={servicios ?? []}
        categorias={categorias ?? []}
        equipo={equipo ?? []}
        vinculos={vinculos ?? []}
        creditos={creditos}
        moneda={business.currency}
        zonaHoraria={business.timezone}
        diasMaximos={booking.max_advance_days}
        usuario={
          user
            ? {
                id: user.id,
                email: user.email ?? '',
                nombre: (user.user_metadata?.full_name as string | undefined) ?? '',
              }
            : null
        }
        slugInicial={slugInicial}
      />
    </div>
  )
}
