/**
 * Normaliza una relación embebida de Supabase.
 *
 * En `select('*, services(name)')` PostgREST devuelve un objeto cuando la
 * relación es de muchos a uno, pero los tipos que infiere supabase-js sin
 * esquema generado la describen siempre como arreglo. Esto acepta las dos
 * formas y entrega un solo registro o null.
 */
export function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

/** Igual que `uno`, pero para relaciones que sí son listas. */
export function varios<T>(valor: T | T[] | null | undefined): T[] {
  if (Array.isArray(valor)) return valor
  return valor ? [valor] : []
}
