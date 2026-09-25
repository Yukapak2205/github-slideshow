/**
 * Lectura y escritura de CSV.
 *
 * Se implementa a mano porque el caso es acotado y conocido: planillas
 * exportadas desde Excel, Google Sheets o AgendaPro. Lo que sí se respeta
 * es lo que rompe a los parsers ingenuos: comillas, comas dentro del
 * texto, saltos de línea dentro de una celda y el BOM que Excel escribe
 * al inicio del archivo.
 */

/** Separadores que se intentan detectar, en orden de preferencia. */
const SEPARADORES = [',', ';', '\t'] as const

/**
 * Adivina el separador mirando la primera línea.
 *
 * Excel en español guarda con punto y coma, y Google Sheets con coma.
 * Pedirle al usuario que lo sepa sería trasladarle un problema nuestro.
 */
export function detectarSeparador(texto: string): string {
  const primeraLinea = texto.split(/\r?\n/)[0] ?? ''
  let mejor = ','
  let maximo = 0

  for (const separador of SEPARADORES) {
    // Se cuentan sólo los separadores fuera de comillas.
    let cuenta = 0
    let dentroDeComillas = false
    for (let i = 0; i < primeraLinea.length; i++) {
      const caracter = primeraLinea[i]
      if (caracter === '"') dentroDeComillas = !dentroDeComillas
      else if (caracter === separador && !dentroDeComillas) cuenta++
    }
    if (cuenta > maximo) {
      maximo = cuenta
      mejor = separador
    }
  }

  return mejor
}

/** Convierte el texto CSV en filas de celdas. */
export function parseCSV(texto: string, separador?: string): string[][] {
  // Excel antepone un BOM que, si no se quita, contamina el primer encabezado.
  const limpio = texto.replace(/^﻿/, '')
  const sep = separador ?? detectarSeparador(limpio)

  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let dentroDeComillas = false

  for (let i = 0; i < limpio.length; i++) {
    const caracter = limpio[i]

    if (dentroDeComillas) {
      if (caracter === '"') {
        // Dos comillas seguidas son una comilla literal.
        if (limpio[i + 1] === '"') {
          celda += '"'
          i++
        } else {
          dentroDeComillas = false
        }
      } else {
        celda += caracter
      }
      continue
    }

    if (caracter === '"') {
      dentroDeComillas = true
    } else if (caracter === sep) {
      fila.push(celda)
      celda = ''
    } else if (caracter === '\n') {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
    } else if (caracter === '\r') {
      // Se ignora: el salto lo marca el \n que viene después.
    } else {
      celda += caracter
    }
  }

  // Última celda, si el archivo no termina en salto de línea.
  if (celda.length > 0 || fila.length > 0) {
    fila.push(celda)
    filas.push(fila)
  }

  // Se descartan las filas completamente vacías, típicas al final del archivo.
  return filas.filter((f) => f.some((c) => c.trim().length > 0))
}

/** Normaliza un encabezado: sin tildes, minúsculas, con guión bajo. */
export function normalizarEncabezado(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Convierte el CSV en objetos, usando la primera fila como encabezados.
 * Las claves quedan normalizadas para que "Duración (min)" y
 * "duracion_min" lleguen al mismo lugar.
 */
export function parseCSVaObjetos(texto: string): Array<Record<string, string>> {
  const filas = parseCSV(texto)
  if (filas.length < 2) return []

  const encabezados = (filas[0] ?? []).map(normalizarEncabezado)

  return filas.slice(1).map((fila) => {
    const objeto: Record<string, string> = {}
    encabezados.forEach((clave, indice) => {
      if (clave) objeto[clave] = (fila[indice] ?? '').trim()
    })
    return objeto
  })
}

/** Escapa una celda para escribirla en CSV. */
function escaparCelda(valor: string, separador: string): string {
  if (valor.includes('"') || valor.includes('\n') || valor.includes(separador)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

/**
 * Genera un CSV a partir de objetos.
 *
 * Lleva BOM y punto y coma por defecto porque el destino habitual es
 * Excel en español: sin eso, las tildes salen rotas y todo queda en una
 * sola columna.
 */
export function toCSV(
  filas: Array<Record<string, string | number | boolean | null | undefined>>,
  columnas: string[],
  opciones: { separador?: string; bom?: boolean } = {},
): string {
  const separador = opciones.separador ?? ';'
  const lineas = [columnas.map((c) => escaparCelda(c, separador)).join(separador)]

  for (const fila of filas) {
    lineas.push(
      columnas
        .map((columna) => {
          const valor = fila[columna]
          if (valor === null || valor === undefined) return ''
          if (typeof valor === 'boolean') return valor ? 'si' : 'no'
          return escaparCelda(String(valor), separador)
        })
        .join(separador),
    )
  }

  const contenido = lineas.join('\r\n')
  return opciones.bom === false ? contenido : `﻿${contenido}`
}

/**
 * Interpreta un precio escrito por una persona.
 *
 * Acepta "45.000", "$45.000", "45000", "45,000" y "45.000,50". Devuelve
 * null si no hay un número reconocible, para que la fila se muestre como
 * error en vez de importarse como cero.
 */
export function parsearPrecio(valor: string, decimales = 0): number | null {
  const limpio = valor.replace(/[^\d.,-]/g, '').trim()
  if (!limpio) return null

  const ultimaComa = limpio.lastIndexOf(',')
  const ultimoPunto = limpio.lastIndexOf('.')
  let normalizado = limpio

  if (ultimaComa > -1 && ultimoPunto > -1) {
    // El que aparece más a la derecha es el separador decimal.
    const separadorDecimal = ultimaComa > ultimoPunto ? ',' : '.'
    const separadorMiles = separadorDecimal === ',' ? '.' : ','
    normalizado = limpio.split(separadorMiles).join('').replace(separadorDecimal, '.')
  } else if (ultimaComa > -1) {
    // Una sola coma: es decimal sólo si deja 1 o 2 dígitos a la derecha.
    const despues = limpio.length - ultimaComa - 1
    normalizado = despues <= 2 ? limpio.replace(',', '.') : limpio.split(',').join('')
  } else if (ultimoPunto > -1) {
    const despues = limpio.length - ultimoPunto - 1
    normalizado = despues <= 2 ? limpio : limpio.split('.').join('')
  }

  const numero = Number(normalizado)
  if (!Number.isFinite(numero)) return null

  return Math.round(numero * 10 ** decimales)
}

/** Interpreta "sí", "si", "true", "1", "x" como verdadero. */
export function parsearBooleano(valor: string, porDefecto = true): boolean {
  const limpio = valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
  if (!limpio) return porDefecto
  return ['si', 'sí', 'yes', 'true', '1', 'x', 'activo', 'v'].includes(limpio)
}

/** Interpreta una duración: "60", "60 min", "1h", "1:30". */
export function parsearDuracion(valor: string): number | null {
  const limpio = valor.trim().toLowerCase()
  if (!limpio) return null

  // Formato "1:30"
  const reloj = limpio.match(/^(\d+):(\d{1,2})$/)
  if (reloj) return Number(reloj[1]) * 60 + Number(reloj[2])

  // Formato "1h 30" o "1h30" o "1 hora"
  const horas = limpio.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hora|horas)\s*(\d+)?/)
  if (horas) {
    const base = Number(horas[1]!.replace(',', '.')) * 60
    return Math.round(base + Number(horas[2] ?? 0))
  }

  const minutos = limpio.match(/(\d+)/)
  return minutos ? Number(minutos[1]) : null
}
