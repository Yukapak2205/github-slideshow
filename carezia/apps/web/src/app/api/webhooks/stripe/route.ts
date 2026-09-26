import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { failPayment, settlePayment, stripe } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * Webhook de Stripe.
 *
 * Se verifica la firma antes de tocar nada: sin eso, cualquiera podría
 * marcar paquetes como pagados con un POST.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma.' }, { status: 400 })
  }

  const raw = await request.text()

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret)
  } catch (error) {
    console.error('[stripe] Firma inválida:', error)
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const paymentId = session.metadata?.payment_id ?? session.client_reference_id

  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: 'sin payment_id' })
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await settlePayment(paymentId, session.id, event)
      break
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      await failPayment(paymentId, event)
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
