'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  DEFAULT_BUSINESS,
  analizarPlanilla,
  slugify,
  type ResultadoAnalisis,
} from '@carezia/core'
import { createClient } from '@/lib/supabase/server'

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/ingresar?volver=/admin/servicios/importar')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Sólo un admin: la política RLS de `services` no deja escribir a un
  // perfil de staff, y es mejor decirlo aquí que fallar al guardar.
  if (perfil?.role !== 'admin') redirect('/admin/servicios')
  return supabase
}

export type EstadoImportacion =
  | { fase: 'inicial' }
  | { fase: 'previsualizado'; analisis: ResultadoAnalisis; texto: string }
  | { fase: 'importado'; creados: number; actualizados: number; categorias: number }
  | { fase: 'error'; mensaje: string }

/**
 * Descarga una planilla publicada de Google Sheets.
 *
 * Sólo se acepta docs.google.com: permitir una URL arbitraria convertiría
 * este formulario en un proxy para alcanzar servicios internos desde el
 * servidor.
 */
async function leerDesdeSheets(url: string): Promise<string> {
  let destino: URL
  try {
    destino = new URL(url)
  } catch {
    throw new Error('La dirección de la planilla no es válida.')
  }

  if (destino.protocol !== 'https:' || destino.hostname !== 'docs.google.com') {
    throw new Error('Sólo se aceptan planillas de Google Sheets (docs.google.com).')
  }

  // Una URL de edición se traduce a su equivalente de exportación en CSV.
  const conId = destino.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (conId && !destino.pathname.includes('/pub')) {
    const gid = destino.hash.match(/gid=(\d+)/)?.[1] ?? destino.searchParams.get('gid') ?? '0'
    destino = new URL(
      `https://docs.google.com/spreadsheets/d/${conId[1]}/export?format=csv&gid=${gid}`,
    )
  }

  const respuesta = await fetch(destino, { redirect: 'follow', cache: 'no-store' })
  if (!respuesta.ok) {
    throw new Error(
      'No se pudo leer la planilla. Comprueba que esté compartida con «cualquier persona con el enlace».',
    )
  }

  const texto = await respuesta.text()
  if (texto.trimStart().startsWith('<')) {
    throw new Error(
      'Google devolvió una página en vez de la planilla. Publícala en CSV o compártela por enlace.',
    )
  }
  return texto
}

async function contexto(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: servicios }, { data: categorias }, { data: ajuste }] = await Promise.all([
    supabase.from('services').select('slug'),
    supabase.from('service_categories').select('id, name'),
    supabase.from('settings').select('value').eq('key', 'business').maybeSingle(),
  ])

  const business = { ...DEFAULT_BUSINESS, ...(ajuste?.value as object) }

  return {
    slugsExistentes: new Set((servicios ?? []).map((s) => s.slug as string)),
    categoriasExistentes: new Set(
      (categorias ?? []).map((c) => (c.name as string).toLowerCase()),
    ),
    categoriasPorNombre: new Map(
      (categorias ?? []).map((c) => [(c.name as string).toLowerCase(), c.id as string]),
    ),
    moneda: business.currency,
  }
}

/** Lee la planilla y muestra qué haría, sin escribir nada todavía. */
export async function previsualizarPlanilla(
  _estado: EstadoImportacion,
  formData: FormData,
): Promise<EstadoImportacion> {
  const supabase = await requireStaff()

  let texto = String(formData.get('csv') ?? '').trim()
  const urlSheets = String(formData.get('sheets_url') ?? '').trim()
  const archivo = formData.get('archivo')

  try {
    if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > 2_000_000) {
        return { fase: 'error', mensaje: 'El archivo supera los 2 MB.' }
      }
      texto = await archivo.text()
    } else if (urlSheets) {
      texto = await leerDesdeSheets(urlSheets)
    }
  } catch (causa) {
    return { fase: 'error', mensaje: causa instanceof Error ? causa.message : 'No se pudo leer.' }
  }

  if (!texto) {
    return { fase: 'error', mensaje: 'Pega la planilla, sube un archivo o indica un enlace.' }
  }

  const ctx = await contexto(supabase)
  const analisis = analizarPlanilla(texto, ctx)

  if (analisis.filas.length === 0) {
    return {
      fase: 'error',
      mensaje: 'No se encontraron filas. Revisa que la primera línea tenga los encabezados.',
    }
  }

  return { fase: 'previsualizado', analisis, texto }
}

/**
 * Escribe los servicios.
 *
 * Se vuelve a analizar el texto en vez de confiar en lo que manda el
 * navegador: el formulario podría haber sido alterado, y además la base
 * pudo cambiar entre la vista previa y la confirmación.
 */
export async function importarPlanilla(
  _estado: EstadoImportacion,
  formData: FormData,
): Promise<EstadoImportacion> {
  const supabase = await requireStaff()
  const texto = String(formData.get('csv') ?? '')

  if (!texto.trim()) {
    return { fase: 'error', mensaje: 'Se perdió el contenido de la planilla. Vuelve a cargarla.' }
  }

  const ctx = await contexto(supabase)
  const analisis = analizarPlanilla(texto, ctx)
  const validas = analisis.filas.filter((f) => f.accion !== 'omitir')

  if (validas.length === 0) {
    return { fase: 'error', mensaje: 'Ninguna fila está en condiciones de importarse.' }
  }

  // Las categorías nuevas se crean primero, para poder vincular los servicios.
  let categoriasCreadas = 0
  for (const nombre of analisis.categoriasNuevas) {
    const { data, error } = await supabase
      .from('service_categories')
      .insert({ name: nombre, slug: slugify(nombre), sort_order: 99 })
      .select('id')
      .single()

    if (!error && data) {
      ctx.categoriasPorNombre.set(nombre.toLowerCase(), data.id)
      categoriasCreadas++
    }
  }

  const filas = validas.map((fila) => ({
    name: fila.nombre,
    slug: fila.slug,
    category_id: fila.categoria
      ? (ctx.categoriasPorNombre.get(fila.categoria.toLowerCase()) ?? null)
      : null,
    description: fila.descripcion,
    price_amount: fila.precio,
    duration_min: fila.duracion,
    buffer_min: fila.buffer,
    deposit_amount: fila.abono,
    is_active: fila.activo,
    is_featured: fila.destacado,
    sort_order: fila.orden,
  }))

  // upsert por slug: una fila ya existente se actualiza en vez de duplicarse.
  const { error } = await supabase.from('services').upsert(filas, { onConflict: 'slug' })

  if (error) {
    console.error('[importar]', error)
    return { fase: 'error', mensaje: `No se pudieron guardar los servicios: ${error.message}` }
  }

  revalidatePath('/admin/servicios')
  revalidatePath('/servicios')
  revalidatePath('/')

  return {
    fase: 'importado',
    creados: analisis.totales.crear,
    actualizados: analisis.totales.actualizar,
    categorias: categoriasCreadas,
  }
}
