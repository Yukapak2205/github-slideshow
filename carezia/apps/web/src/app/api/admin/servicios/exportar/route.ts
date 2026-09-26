import { NextResponse } from 'next/server'
import { DEFAULT_BUSINESS, PLANTILLA_CSV, toCSV } from '@carezia/core'
import { createClient } from '@/lib/supabase/server'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

const COLUMNAS = [
  'nombre',
  'categoria',
  'descripcion',
  'precio',
  'duracion_min',
  'buffer_min',
  'abono',
  'activo',
  'destacado',
  'orden',
]

/**
 * Exporta los servicios a CSV, con las mismas columnas que acepta la
 * importación: se puede exportar, editar en Excel y volver a subir.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.role !== 'admin' && perfil?.role !== 'staff') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  if (new URL(request.url).searchParams.get('plantilla')) {
    return respuestaCSV(`﻿${PLANTILLA_CSV}`, 'carezia-plantilla-servicios.csv')
  }

  const [{ data: servicios }, { data: ajuste }] = await Promise.all([
    supabase
      .from('services')
      .select(
        `name, description, price_amount, duration_min, buffer_min, deposit_amount,
         is_active, is_featured, sort_order, service_categories(name)`,
      )
      .order('sort_order'),
    supabase.from('settings').select('value').eq('key', 'business').maybeSingle(),
  ])

  const business = { ...DEFAULT_BUSINESS, ...(ajuste?.value as object) }

  const filas = (servicios ?? []).map((servicio) => ({
    nombre: servicio.name,
    categoria: uno(servicio.service_categories)?.name ?? '',
    descripcion: servicio.description ?? '',
    precio: servicio.price_amount,
    duracion_min: servicio.duration_min,
    buffer_min: servicio.buffer_min,
    abono: servicio.deposit_amount,
    activo: servicio.is_active,
    destacado: servicio.is_featured,
    orden: servicio.sort_order,
  }))

  const fecha = new Date().toISOString().slice(0, 10)
  return respuestaCSV(
    toCSV(filas, COLUMNAS),
    `carezia-servicios-${fecha}.csv`,
    business.currency,
  )
}

function respuestaCSV(contenido: string, nombre: string, moneda?: string) {
  return new NextResponse(contenido, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'private, no-store',
      ...(moneda ? { 'X-Carezia-Moneda': moneda } : {}),
    },
  })
}
