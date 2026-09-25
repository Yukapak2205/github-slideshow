import { describe, expect, it } from 'vitest'
import { analizarPlanilla, type ContextoAnalisis } from '../src'

const contexto: ContextoAnalisis = {
  slugsExistentes: new Set(['limpieza-facial-profunda']),
  categoriasExistentes: new Set(['facial']),
  moneda: 'CLP',
}

const encabezado = 'nombre;categoria;precio;duracion_min'

describe('analizarPlanilla', () => {
  it('distingue entre crear y actualizar por el nombre', () => {
    const csv = [
      encabezado,
      'Limpieza facial profunda;Facial;48000;75',
      'Masaje relajante;Corporal;38000;60',
    ].join('\n')

    const { filas, totales } = analizarPlanilla(csv, contexto)
    expect(filas[0]!.accion).toBe('actualizar')
    expect(filas[1]!.accion).toBe('crear')
    expect(totales).toEqual({ crear: 1, actualizar: 1, omitir: 0 })
  })

  it('detecta las categorías que habría que crear', () => {
    const csv = [encabezado, 'Masaje;Corporal;38000;60', 'Cejas;Mirada;18000;30'].join('\n')
    const { categoriasNuevas } = analizarPlanilla(csv, contexto)
    expect(categoriasNuevas.sort()).toEqual(['Corporal', 'Mirada'])
  })

  it('marca la fila con error en vez de importar datos a medias', () => {
    const csv = [
      encabezado,
      ';Facial;45000;60',
      'Sin precio;Facial;consultar;60',
      'Sin duracion;Facial;45000;',
      'Muy larga;Facial;45000;900',
    ].join('\n')

    const { filas, totales } = analizarPlanilla(csv, contexto)
    expect(totales.omitir).toBe(4)
    expect(filas[0]!.errores[0]).toContain('nombre')
    expect(filas[1]!.errores[0]).toContain('precio')
    expect(filas[2]!.errores[0]).toContain('duración')
    expect(filas[3]!.errores[0]).toContain('600')
  })

  it('detecta servicios repetidos dentro de la misma planilla', () => {
    const csv = [encabezado, 'Masaje;Corporal;38000;60', 'MASAJE;Corporal;40000;60'].join('\n')
    const { filas } = analizarPlanilla(csv, contexto)
    expect(filas[1]!.accion).toBe('omitir')
    expect(filas[1]!.errores[0]).toContain('repetido')
  })

  it('rechaza un abono mayor que el precio', () => {
    const csv = ['nombre;precio;duracion_min;abono', 'Facial;45000;60;50000'].join('\n')
    const { filas } = analizarPlanilla(csv, contexto)
    expect(filas[0]!.errores[0]).toContain('abono')
  })

  it('reconoce encabezados alternativos y con tildes', () => {
    const csv = ['Servicio;Familia;Valor;Duración (min)', 'Masaje;Corporal;$38.000;1h'].join('\n')
    const { filas } = analizarPlanilla(csv, contexto)
    expect(filas[0]!.nombre).toBe('Masaje')
    expect(filas[0]!.categoria).toBe('Corporal')
    expect(filas[0]!.precio).toBe(38000)
    expect(filas[0]!.duracion).toBe(60)
    expect(filas[0]!.accion).toBe('crear')
  })

  it('avisa de las columnas que no va a usar', () => {
    const csv = ['nombre;precio;duracion_min;comision_estilista', 'Masaje;38000;60;30%'].join('\n')
    const { columnasIgnoradas } = analizarPlanilla(csv, contexto)
    expect(columnasIgnoradas).toEqual(['comision_estilista'])
  })

  it('numera las líneas como las ve la persona en su planilla', () => {
    const csv = [encabezado, 'Masaje;Corporal;38000;60'].join('\n')
    // La primera fila de datos es la línea 2 de la planilla.
    expect(analizarPlanilla(csv, contexto).filas[0]!.linea).toBe(2)
  })

  it('aplica los valores por defecto de las columnas ausentes', () => {
    const csv = ['nombre;precio;duracion_min', 'Masaje;38000;60'].join('\n')
    const fila = analizarPlanilla(csv, contexto).filas[0]!
    expect(fila.activo).toBe(true)
    expect(fila.destacado).toBe(false)
    expect(fila.buffer).toBe(0)
    expect(fila.abono).toBe(0)
    expect(fila.orden).toBe(1)
  })
})
