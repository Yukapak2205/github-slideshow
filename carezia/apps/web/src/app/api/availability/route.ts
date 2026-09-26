import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addDaysISO } from '@carezia/core'
import { BookingError, getAvailability } from '@/lib/booking'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  service: z.uuid(),
  staff: z.uuid().optional(),
  location: z.uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Por defecto se devuelve una semana, que es lo que muestra el calendario.
  days: z.coerce.number().int().min(1).max(31).default(7),
})

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = querySchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', detail: parsed.error.issues },
      { status: 400 },
    )
  }

  const { service, staff, location, from, days } = parsed.data

  try {
    const result = await getAvailability({
      serviceId: service,
      staffId: staff,
      locationId: location,
      fromDate: from,
      toDate: addDaysISO(from, days - 1),
    })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[availability]', error)
    return NextResponse.json({ error: 'No se pudo calcular la disponibilidad.' }, { status: 500 })
  }
}
