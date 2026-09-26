import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_BUSINESS } from '@carezia/core'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser } from '@/lib/supabase/server'
import { createCheckout } from '@/lib/payments'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ packageId: z.uuid() })

/**
 * Compra de un paquete de sesiones.
 *
 * Congela nombre, precio y número de sesiones en la compra: si mañana el
 * paquete sube de precio o cambia de condiciones, lo que la clienta compró
 * hoy se mantiene tal cual.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Falta el paquete.' }, { status: 400 })
  }

  const user = await getRequestUser(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Inicia sesión para comprar un paquete.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    )
  }

  const admin = createAdminClient()
  const { data: pkg } = await admin
    .from('packages')
    .select('id, name, description, price_amount, sessions_count, validity_days, is_active')
    .eq('id', parsed.data.packageId)
    .maybeSingle()

  if (!pkg || !pkg.is_active) {
    return NextResponse.json({ error: 'El paquete no está disponible.' }, { status: 404 })
  }

  const { data: settingRow } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'business')
    .maybeSingle()
  const business = { ...DEFAULT_BUSINESS, ...(settingRow?.value as object) }

  const { data: purchase, error } = await admin
    .from('package_purchases')
    .insert({
      client_id: user.id,
      package_id: pkg.id,
      package_name: pkg.name,
      price_amount: pkg.price_amount,
      sessions_total: pkg.sessions_count,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[packages/checkout]', error)
    return NextResponse.json({ error: 'No se pudo iniciar la compra.' }, { status: 500 })
  }

  const checkout = await createCheckout(
    {
      title: pkg.name,
      description: pkg.description ?? `${pkg.sessions_count} sesiones`,
      amount: pkg.price_amount,
      currency: business.currency,
    },
    {
      kind: 'package',
      purchaseId: purchase.id,
      clientId: user.id,
      email: user.email,
      origin: new URL(request.url).origin,
      successPath: '/mi-cuenta',
      cancelPath: '/paquetes',
    },
  )

  return NextResponse.json({
    purchaseId: purchase.id,
    provider: checkout.provider,
    checkoutUrl: checkout.url,
  })
}
