import 'server-only'

import Stripe from 'stripe'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { toMajorUnits, toStripeAmount } from '@carezia/core'
import { createAdminClient } from './supabase/admin'

export type Provider = 'stripe' | 'mercadopago' | 'manual'

/**
 * Pasarela activa. `manual` deja el flujo funcionando sin cobrar en línea
 * (se paga en el local), que es como conviene salir a producción el primer
 * día, antes de tener las credenciales.
 */
export function activeProvider(): Provider {
  const configured = (process.env.PAYMENT_PROVIDER ?? '').toLowerCase()
  if (configured === 'stripe' && process.env.STRIPE_SECRET_KEY) return 'stripe'
  if (configured === 'mercadopago' && process.env.MERCADOPAGO_ACCESS_TOKEN) return 'mercadopago'
  return 'manual'
}

function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function mercadopago(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! })
}

export interface CheckoutItem {
  title: string
  description?: string
  /** Monto en la unidad mínima de la moneda. */
  amount: number
  currency: string
}

export interface CheckoutResult {
  provider: Provider
  /** URL a la que redirigir. Null cuando el cobro es presencial. */
  url: string | null
  paymentId: string
}

interface CheckoutContext {
  kind: 'appointment' | 'package'
  appointmentId?: string
  purchaseId?: string
  clientId?: string | null
  email?: string | null
  origin: string
  successPath: string
  cancelPath: string
}

/**
 * Crea el cobro y deja registro en `payments` antes de mandar a la pasarela,
 * para que el webhook siempre tenga contra qué conciliar.
 */
export async function createCheckout(
  item: CheckoutItem,
  ctx: CheckoutContext,
): Promise<CheckoutResult> {
  const admin = createAdminClient()
  const provider = activeProvider()

  const { data: payment, error } = await admin
    .from('payments')
    .insert({
      client_id: ctx.clientId ?? null,
      kind: ctx.kind,
      appointment_id: ctx.appointmentId ?? null,
      purchase_id: ctx.purchaseId ?? null,
      provider,
      amount: item.amount,
      currency: item.currency,
      status: provider === 'manual' ? 'unpaid' : 'pending',
    })
    .select('id')
    .single()

  if (error) throw new Error(`No se pudo registrar el pago: ${error.message}`)

  if (provider === 'manual' || item.amount === 0) {
    return { provider: 'manual', url: null, paymentId: payment.id }
  }

  const successUrl = `${ctx.origin}${ctx.successPath}`
  const cancelUrl = `${ctx.origin}${ctx.cancelPath}`
  const metadata = {
    payment_id: payment.id,
    kind: ctx.kind,
    appointment_id: ctx.appointmentId ?? '',
    purchase_id: ctx.purchaseId ?? '',
  }

  if (provider === 'stripe') {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: ctx.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: toStripeAmount(item.amount, item.currency),
            product_data: { name: item.title, description: item.description },
          },
        },
      ],
      success_url: `${successUrl}?pago=ok`,
      cancel_url: `${cancelUrl}?pago=cancelado`,
      metadata,
      client_reference_id: payment.id,
    })

    await admin.from('payments').update({ provider_ref: session.id }).eq('id', payment.id)
    return { provider, url: session.url, paymentId: payment.id }
  }

  const preference = await new Preference(mercadopago()).create({
    body: {
      items: [
        {
          id: payment.id,
          title: item.title,
          description: item.description,
          quantity: 1,
          unit_price: toMajorUnits(item.amount, item.currency),
          currency_id: item.currency.toUpperCase(),
        },
      ],
      payer: ctx.email ? { email: ctx.email } : undefined,
      external_reference: payment.id,
      metadata,
      back_urls: {
        success: `${successUrl}?pago=ok`,
        failure: `${cancelUrl}?pago=error`,
        pending: `${successUrl}?pago=pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${ctx.origin}/api/webhooks/mercadopago`,
    },
  })

  await admin.from('payments').update({ provider_ref: preference.id }).eq('id', payment.id)
  return { provider, url: preference.init_point ?? null, paymentId: payment.id }
}

/**
 * Único punto donde un pago pasa a "pagado".
 *
 * Lo llaman los dos webhooks. Es idempotente: si la pasarela reintenta la
 * notificación, la segunda vez no vuelve a activar nada.
 */
export async function settlePayment(
  paymentId: string,
  providerRef: string | null,
  payload: unknown,
): Promise<void> {
  const admin = createAdminClient()

  const { data: payment } = await admin
    .from('payments')
    .select('id, kind, status, appointment_id, purchase_id')
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment || payment.status === 'paid') return

  await admin
    .from('payments')
    .update({ status: 'paid', provider_ref: providerRef, raw_payload: payload })
    .eq('id', payment.id)

  if (payment.kind === 'package' && payment.purchase_id) {
    const { data: purchase } = await admin
      .from('package_purchases')
      .select('id, package_id')
      .eq('id', payment.purchase_id)
      .maybeSingle()

    if (purchase) {
      const { data: pkg } = await admin
        .from('packages')
        .select('validity_days')
        .eq('id', purchase.package_id)
        .maybeSingle()

      const expiresAt = pkg?.validity_days
        ? new Date(Date.now() + pkg.validity_days * 86_400_000).toISOString()
        : null

      await admin
        .from('package_purchases')
        .update({ status: 'active', purchased_at: new Date().toISOString(), expires_at: expiresAt })
        .eq('id', purchase.id)
    }
  }

  if (payment.kind === 'appointment' && payment.appointment_id) {
    await admin
      .from('appointments')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', payment.appointment_id)
  }
}

/** Marca el pago como fallido sin tocar la cita ni el paquete. */
export async function failPayment(paymentId: string, payload: unknown): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('payments')
    .update({ status: 'failed', raw_payload: payload })
    .eq('id', paymentId)
    .neq('status', 'paid')
}

export { stripe, mercadopago }
