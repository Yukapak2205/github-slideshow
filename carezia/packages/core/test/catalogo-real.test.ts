import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analizarPlanilla } from '../src'

describe('catálogo real de Carezia', () => {
  it('se importa sin errores', () => {
    const csv = readFileSync(new URL('../../../datos/servicios-carezia.csv', import.meta.url), 'utf8')
    const r = analizarPlanilla(csv, {
      slugsExistentes: new Set(),
      categoriasExistentes: new Set(),
      moneda: 'CLP',
    })
    const conError = r.filas.filter((f) => f.errores.length > 0)
    if (conError.length) console.log(conError.map((f) => `${f.linea}: ${f.errores.join(' ')}`))
    expect(conError).toHaveLength(0)
    expect(r.filas).toHaveLength(60)
    expect(r.totales.crear).toBe(60)
    expect(r.categoriasNuevas).toHaveLength(11)
    expect(r.columnasIgnoradas).toHaveLength(0)
  })
})
