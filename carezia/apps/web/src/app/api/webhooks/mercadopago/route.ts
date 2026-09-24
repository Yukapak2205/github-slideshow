import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { failPayment, mercadopago, settlePayment } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * Verifica la firma `x-signature` de Mercado Pago.
 *
 * El manifiesto que se firma es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * tal como lo define su documentación de notificaciones.
 */
function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  // Sin secreto configurado no se acepta nada: preferimos rechazar la
  // notificación antes que confiar en un POST sin firmar.
  if (!secret) return false

  const signature = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id') ?? ''
  if (!signature) return false

  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k?.trim() ?? '', v?.trim() ?? '']
    }),
  )
  const ts = parts.ts
  const hash = parts.v1
  if (!ts || !hash) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = await request.json().catch(() => ({}))

  const dataId: string | undefined =
    body?.data?.id?.toString() ?? url.searchParams.get('data.id') ?? undefined
  const topic = body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')

  if (!dataId) {
    return NextResponse.json({ received: true, ignored: 'sin data.id' })
  }
  if (!verifySignature(request, dataId)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 })
  }
  if (topic !== 'payment') {
    return NextResponse.json({ received: true, ignored: topic })
  }

  // Nunca se confía en el estado que viene en el cuerpo: se consulta a la API.
  const payment = await new Payment(mercadopago()).get({ id: dataId })
  const paymentId = payment.external_reference ?? payment.metadata?.payment_id

  if (!paymentId) {
    return NextResponse.json({ received: true, ignored: 'sin referencia' })
  }

  if (payment.status === 'approved') {
    await settlePayment(paymentId, String(payment.id), payment)
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    await failPayment(paymentId, payment)
  }

  return NextResponse.json({ received: true })
}
