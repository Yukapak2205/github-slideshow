import { currencyDecimals } from './money'
import { parseCSVaObjetos, parsearBooleano, parsearDuracion, parsearPrecio } from './csv'
import { slugify } from './text'

/**
 * Traducción de una planilla a servicios de Carezia.
 *
 * Es lógica pura y sin base de datos a propósito: así la previsualización
 * que ve el usuario y la importación real recorren exactamente el mismo
 * camino, y lo que se muestra en pantalla es lo que se va a guardar.
 */

/** Nombres de columna que se aceptan para cada campo. */
const ALIAS: Record<string, string[]> = {
  nombre: ['nombre', 'servicio', 'nombre_servicio', 'name', 'service', 'tratamiento'],
  categoria: ['categoria', 'category', 'familia', 'grupo', 'tipo'],
  descripcion: ['descripcion', 'description', 'detalle', 'observaciones'],
  precio: ['precio', 'price', 'valor', 'monto', 'precio_clp', 'tarifa'],
  duracion: ['duracion_min', 'duracion', 'duration', 'minutos', 'tiempo', 'duracion_minutos'],
  buffer: ['buffer_min', 'buffer', 'limpieza', 'limpieza_min', 'preparacion'],
  abono: ['abono', 'deposito', 'deposit', 'anticipo', 'reserva'],
  activo: ['activo', 'active', 'publicado', 'visible', 'habilitado'],
  destacado: ['destacado', 'featured', 'favorito'],
  orden: ['orden', 'sort_order', 'posicion', 'order'],
}

function leerCampo(fila: Record<string, string>, campo: keyof typeof ALIAS): string {
  for (const alias of ALIAS[campo] ?? []) {
    const valor = fila[alias]
    if (valor !== undefined && valor !== '') return valor
  }
  return ''
}

export interface FilaImportada {
  /** Número de línea en la planilla, contando el encabezado. */
  linea: number
  nombre: string
  slug: string
  categoria: string
  descripcion: string | null
  precio: number
  duracion: number
  buffer: number
  abono: number
  activo: boolean
  destacado: boolean
  orden: number
  /** Qué pasará con esta fila al confirmar. */
  accion: 'crear' | 'actualizar' | 'omitir'
  errores: string[]
}

export interface ResultadoAnalisis {
  filas: FilaImportada[]
  /** Categorías nombradas en la planilla que todavía no existen. */
  categoriasNuevas: string[]
  totales: { crear: number; actualizar: number; omitir: number }
  /** Columnas de la planilla que no se reconocieron. */
  columnasIgnoradas: string[]
}

export interface ContextoAnalisis {
  /** Slugs de servicios que ya existen, para distinguir alta de actualización. */
  slugsExistentes: Set<string>
  /** Nombres de categorías existentes, en minúsculas. */
  categoriasExistentes: Set<string>
  moneda: string
}

export function analizarPlanilla(texto: string, contexto: ContextoAnalisis): ResultadoAnalisis {
  const crudas = parseCSVaObjetos(texto)
  const decimales = currencyDecimals(contexto.moneda)

  const conocidas = new Set(Object.values(ALIAS).flat())
  const columnasIgnoradas = Array.from(
    new Set(Object.keys(crudas[0] ?? {}).filter((c) => !conocidas.has(c))),
  )

  const categoriasNuevas = new Set<string>()
  const slugsVistos = new Set<string>()

  const filas: FilaImportada[] = crudas.map((cruda, indice) => {
    const errores: string[] = []
    const nombre = leerCampo(cruda, 'nombre').trim()
    const categoria = leerCampo(cruda, 'categoria').trim()

    if (!nombre) errores.push('Falta el nombre del servicio.')

    const precio = parsearPrecio(leerCampo(cruda, 'precio'), decimales)
    if (precio === null) errores.push('El precio no se entiende.')
    else if (precio < 0) errores.push('El precio no puede ser negativo.')

    const duracion = parsearDuracion(leerCampo(cruda, 'duracion'))
    if (duracion === null) errores.push('Falta la duración.')
    else if (duracion < 5 || duracion > 600) errores.push('La duración debe ir entre 5 y 600 min.')

    const abonoTexto = leerCampo(cruda, 'abono')
    const abono = abonoTexto ? (parsearPrecio(abonoTexto, decimales) ?? 0) : 0
    if (precio !== null && abono > precio) {
      errores.push('El abono no puede superar el precio.')
    }

    const slug = slugify(nombre)
    if (slug && slugsVistos.has(slug)) {
      errores.push('Este servicio aparece repetido en la planilla.')
    }
    if (slug) slugsVistos.add(slug)

    if (categoria && !contexto.categoriasExistentes.has(categoria.toLowerCase())) {
      categoriasNuevas.add(categoria)
    }

    const duracionTexto = leerCampo(cruda, 'buffer')
    const descripcion = leerCampo(cruda, 'descripcion').trim()

    return {
      linea: indice + 2, // +1 por el encabezado, +1 porque las personas cuentan desde 1
      nombre,
      slug,
      categoria,
      descripcion: descripcion || null,
      precio: precio ?? 0,
      duracion: duracion ?? 0,
      buffer: duracionTexto ? (parsearDuracion(duracionTexto) ?? 0) : 0,
      abono,
      activo: parsearBooleano(leerCampo(cruda, 'activo'), true),
      destacado: parsearBooleano(leerCampo(cruda, 'destacado'), false),
      orden: Number(leerCampo(cruda, 'orden')) || indice + 1,
      accion: errores.length > 0
        ? 'omitir'
        : contexto.slugsExistentes.has(slug)
          ? 'actualizar'
          : 'crear',
      errores,
    }
  })

  return {
    filas,
    categoriasNuevas: Array.from(categoriasNuevas),
    columnasIgnoradas,
    totales: {
      crear: filas.filter((f) => f.accion === 'crear').length,
      actualizar: filas.filter((f) => f.accion === 'actualizar').length,
      omitir: filas.filter((f) => f.accion === 'omitir').length,
    },
  }
}

/** Planilla de ejemplo que se ofrece como descarga para partir. */
export const PLANTILLA_CSV = [
  'nombre;categoria;descripcion;precio;duracion_min;buffer_min;abono;activo;destacado;orden',
  'Limpieza facial profunda;Facial;Higiene, extracción y calma;45000;75;15;15000;si;si;1',
  'Masaje descontracturante;Corporal;Trabajo profundo de espalda y cuello;38000;60;10;0;si;no;2',
].join('\r\n')
