#!/usr/bin/env node
/**
 * Convierte una cuenta en administradora de Carezia.
 *
 * La web no tiene pantalla para esto a propósito: quien puede cambiar
 * precios y ver a todas las clientas se designa desde fuera, no desde un
 * formulario. Funciona igual contra la base local y contra una de
 * producción, porque lee las claves del mismo .env.local que usa la web.
 *
 * Uso:  npm run local:admin tucorreo@ejemplo.cl
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const correo = process.argv[2]

if (!correo || !correo.includes('@')) {
  console.error('\nUso: npm run local:admin tucorreo@ejemplo.cl\n')
  process.exit(1)
}

/** Lee un .env sin depender de librerías. */
function leerEnv(ruta) {
  const valores = {}
  let texto
  try {
    texto = readFileSync(ruta, 'utf8')
  } catch {
    return valores
  }
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte < 1) continue
    valores[limpia.slice(0, corte).trim()] = limpia
      .slice(corte + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return valores
}

const env = leerEnv(join(raiz, 'apps/web/.env.local'))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const clave = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !clave) {
  console.error(
    '\n✗ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local' +
      '\n  Ejecuta primero:  npm run local:setup\n',
  )
  process.exit(1)
}

let createClient
try {
  ;({ createClient } = await import('@supabase/supabase-js'))
} catch {
  console.error('\n✗ Falta instalar las dependencias. Ejecuta:  npm install\n')
  process.exit(1)
}

// La clave de servicio se salta RLS, que es justamente lo que hace falta
// para cambiar un rol desde fuera de la aplicación.
const supabase = createClient(url, clave, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await supabase
  .from('profiles')
  .update({ role: 'admin' })
  .ilike('email', correo)
  .select('email, role')

if (error) {
  console.error(`\n✗ No se pudo actualizar: ${error.message}`)
  console.error('  Comprueba que la base esté levantada con:  supabase status\n')
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log(
    `\n✗ No existe una cuenta con ${correo}.` +
      '\n  Entra una vez en http://localhost:3000/ingresar y abre el enlace' +
      '\n  del correo en http://localhost:54324 (los correos locales no salen a internet).\n',
  )
  process.exit(1)
}

console.log(`\n✓ ${data[0].email} ahora es administradora.`)
console.log('  Entra a http://localhost:3000/admin\n')
