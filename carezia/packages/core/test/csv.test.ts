import { describe, expect, it } from 'vitest'
import {
  detectarSeparador,
  parseCSV,
  parseCSVaObjetos,
  parsearBooleano,
  parsearDuracion,
  parsearPrecio,
  toCSV,
} from '../src'

describe('parseCSV', () => {
  it('lee celdas simples', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('respeta comas dentro de comillas', () => {
    expect(parseCSV('nombre,precio\n"Facial, profundo",45000')).toEqual([
      ['nombre', 'precio'],
      ['Facial, profundo', '45000'],
    ])
  })

  it('entiende comillas escapadas', () => {
    expect(parseCSV('texto\n"Ella dijo ""hola"""')).toEqual([['texto'], ['Ella dijo "hola"']])
  })

  it('acepta saltos de línea dentro de una celda', () => {
    const filas = parseCSV('nombre,nota\nFacial,"Línea 1\nLínea 2"')
    expect(filas[1]![1]).toBe('Línea 1\nLínea 2')
  })

  it('quita el BOM que escribe Excel', () => {
    expect(parseCSV('﻿nombre,precio\nFacial,100')[0]).toEqual(['nombre', 'precio'])
  })

  it('soporta CRLF', () => {
    expect(parseCSV('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('descarta filas vacías del final', () => {
    expect(parseCSV('a,b\n1,2\n\n\n')).toHaveLength(2)
  })
})

describe('detectarSeparador', () => {
  it('detecta punto y coma, como Excel en español', () => {
    expect(detectarSeparador('nombre;precio;duracion')).toBe(';')
  })

  it('detecta coma', () => {
    expect(detectarSeparador('nombre,precio,duracion')).toBe(',')
  })

  it('no cuenta separadores dentro de comillas', () => {
    expect(detectarSeparador('"a;b;c;d";x')).toBe(';')
  })

  it('detecta tabulaciones', () => {
    expect(detectarSeparador('nombre\tprecio\tduracion')).toBe('\t')
  })
})

describe('parseCSVaObjetos', () => {
  it('normaliza los encabezados con tildes y espacios', () => {
    const filas = parseCSVaObjetos('Nombre;Duración (min);Precio\nFacial;60;45000')
    expect(filas[0]).toEqual({
      nombre: 'Facial',
      duracion_min: '60',
      precio: '45000',
    })
  })

  it('devuelve vacío cuando sólo hay encabezados', () => {
    expect(parseCSVaObjetos('nombre,precio')).toEqual([])
  })
})

describe('parsearPrecio', () => {
  it('entiende el formato chileno con puntos de miles', () => {
    expect(parsearPrecio('45.000')).toBe(45000)
    expect(parsearPrecio('$45.000')).toBe(45000)
    expect(parsearPrecio('1.250.000')).toBe(1250000)
  })

  it('entiende el formato con coma de miles', () => {
    expect(parsearPrecio('45,000')).toBe(45000)
  })

  it('entiende decimales cuando la moneda los usa', () => {
    expect(parsearPrecio('45,50', 2)).toBe(4550)
    expect(parsearPrecio('1.234,56', 2)).toBe(123456)
    expect(parsearPrecio('1,234.56', 2)).toBe(123456)
  })

  it('devuelve null cuando no hay número', () => {
    expect(parsearPrecio('')).toBeNull()
    expect(parsearPrecio('consultar')).toBeNull()
  })
})

describe('parsearDuracion', () => {
  it('lee minutos escritos de varias formas', () => {
    expect(parsearDuracion('60')).toBe(60)
    expect(parsearDuracion('60 min')).toBe(60)
    expect(parsearDuracion('75 minutos')).toBe(75)
  })

  it('lee horas', () => {
    expect(parsearDuracion('1h')).toBe(60)
    expect(parsearDuracion('1h30')).toBe(90)
    expect(parsearDuracion('1,5 horas')).toBe(90)
  })

  it('lee formato de reloj', () => {
    expect(parsearDuracion('1:30')).toBe(90)
  })

  it('devuelve null si no hay número', () => {
    expect(parsearDuracion('')).toBeNull()
  })
})

describe('parsearBooleano', () => {
  it('acepta las formas habituales de decir que sí', () => {
    expect(parsearBooleano('sí')).toBe(true)
    expect(parsearBooleano('SI')).toBe(true)
    expect(parsearBooleano('x')).toBe(true)
    expect(parsearBooleano('1')).toBe(true)
  })

  it('trata el resto como no', () => {
    expect(parsearBooleano('no')).toBe(false)
    expect(parsearBooleano('0')).toBe(false)
  })

  it('usa el valor por defecto si la celda está vacía', () => {
    expect(parsearBooleano('', true)).toBe(true)
    expect(parsearBooleano('', false)).toBe(false)
  })
})

describe('toCSV', () => {
  it('escapa el separador y las comillas', () => {
    const csv = toCSV([{ nombre: 'Facial; profundo', nota: 'Dijo "hola"' }], ['nombre', 'nota'], {
      bom: false,
    })
    expect(csv).toContain('"Facial; profundo"')
    expect(csv).toContain('"Dijo ""hola"""')
  })

  it('va y vuelve sin perder información', () => {
    const original = [{ nombre: 'Facial, con coma', precio: '45000' }]
    const csv = toCSV(original, ['nombre', 'precio'], { bom: false })
    expect(parseCSVaObjetos(csv)).toEqual(original)
  })

  it('escribe los booleanos como sí/no', () => {
    expect(toCSV([{ activo: true }], ['activo'], { bom: false })).toContain('si')
  })
})
