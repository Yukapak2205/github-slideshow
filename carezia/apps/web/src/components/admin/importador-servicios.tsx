'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { formatMoney } from '@carezia/core'
import {
  importarPlanilla,
  previsualizarPlanilla,
  type EstadoImportacion,
} from '@/app/admin/acciones-importacion'

type Origen = 'archivo' | 'pegar' | 'sheets'

export function ImportadorServicios({ moneda }: { moneda: string }) {
  const [origen, setOrigen] = useState<Origen>('archivo')
  const [estado, previsualizar] = useActionState<EstadoImportacion, FormData>(
    previsualizarPlanilla,
    { fase: 'inicial' },
  )

  if (estado.fase === 'importado') {
    return (
      <div className="tarjeta bg-white">
        <h3 className="text-lg">Listo</h3>
        <ul className="mt-3 space-y-1 text-sm text-[var(--color-tinta-suave)]">
          <li>{estado.creados} servicios creados</li>
          <li>{estado.actualizados} servicios actualizados</li>
          {estado.categorias > 0 && <li>{estado.categorias} categorías nuevas</li>}
        </ul>
        <div className="mt-6 flex gap-3">
          <Link href="/admin/servicios" className="boton-primario">Ver los servicios</Link>
          <Link href="/admin/servicios/importar" className="boton-secundario">Importar otra</Link>
        </div>
      </div>
    )
  }

  if (estado.fase === 'previsualizado') {
    return <Previsualizacion estado={estado} moneda={moneda} />
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['archivo', 'Subir archivo'],
            ['pegar', 'Pegar la planilla'],
            ['sheets', 'Google Sheets'],
          ] as Array<[Origen, string]>
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setOrigen(valor)}
            aria-pressed={origen === valor}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              origen === valor
                ? 'border-[var(--color-cobre)] bg-[var(--color-cobre)] text-white'
                : 'border-[var(--color-arena-oscura)] hover:border-[var(--color-cobre)]'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <form action={previsualizar} className="mt-6 space-y-5">
        {origen === 'archivo' && (
          <div>
            <label htmlFor="archivo" className="etiqueta-campo">Archivo CSV</label>
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept=".csv,text/csv,text/plain"
              className="campo"
            />
            <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">
              Si tu planilla es .xlsx, ábrela en Excel y usa «Guardar como → CSV».
            </p>
          </div>
        )}

        {origen === 'pegar' && (
          <div>
            <label htmlFor="csv" className="etiqueta-campo">Pega aquí las filas</label>
            <textarea
              id="csv"
              name="csv"
              className="campo min-h-48 font-mono text-xs"
              placeholder={'nombre;categoria;precio;duracion_min\nLimpieza facial;Facial;45000;75'}
            />
            <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">
              Puedes copiar directamente las celdas desde Excel o Google Sheets.
            </p>
          </div>
        )}

        {origen === 'sheets' && (
          <div>
            <label htmlFor="sheets_url" className="etiqueta-campo">Enlace de la planilla</label>
            <input
              id="sheets_url"
              name="sheets_url"
              type="url"
              className="campo"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">
              La planilla debe estar compartida con «cualquier persona con el enlace».
            </p>
          </div>
        )}

        {estado.fase === 'error' && (
          <p role="alert" className="text-sm text-[var(--color-cobre-oscuro)]">
            {estado.mensaje}
          </p>
        )}

        <BotonEnviar texto="Revisar la planilla" />
      </form>
    </div>
  )
}

function Previsualizacion({
  estado,
  moneda,
}: {
  estado: Extract<EstadoImportacion, { fase: 'previsualizado' }>
  moneda: string
}) {
  const [resultado, importar] = useActionState<EstadoImportacion, FormData>(importarPlanilla, estado)
  const { analisis } = estado

  if (resultado.fase === 'importado') {
    return (
      <div className="tarjeta bg-white">
        <h3 className="text-lg">Listo</h3>
        <ul className="mt-3 space-y-1 text-sm text-[var(--color-tinta-suave)]">
          <li>{resultado.creados} servicios creados</li>
          <li>{resultado.actualizados} servicios actualizados</li>
          {resultado.categorias > 0 && <li>{resultado.categorias} categorías nuevas</li>}
        </ul>
        <div className="mt-6">
          <Link href="/admin/servicios" className="boton-primario">Ver los servicios</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Resumen numero={analisis.totales.crear} texto="se crearán" tono="ok" />
        <Resumen numero={analisis.totales.actualizar} texto="se actualizarán" tono="neutro" />
        <Resumen numero={analisis.totales.omitir} texto="con errores" tono="error" />
      </div>

      {analisis.categoriasNuevas.length > 0 && (
        <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">
          Se crearán estas categorías: {analisis.categoriasNuevas.join(', ')}.
        </p>
      )}

      {analisis.columnasIgnoradas.length > 0 && (
        <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
          Columnas que no se reconocieron y se ignorarán:{' '}
          {analisis.columnasIgnoradas.join(', ')}.
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-[var(--color-arena-oscura)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            <tr>
              <th className="py-3">Línea</th>
              <th className="py-3">Servicio</th>
              <th className="py-3">Categoría</th>
              <th className="py-3">Duración</th>
              <th className="py-3">Precio</th>
              <th className="py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-arena)]">
            {analisis.filas.map((fila) => (
              <tr key={fila.linea} className={fila.accion === 'omitir' ? 'opacity-70' : ''}>
                <td className="py-3 text-[var(--color-tinta-tenue)]">{fila.linea}</td>
                <td className="py-3">
                  <span className="font-medium">{fila.nombre || '—'}</span>
                  {fila.errores.length > 0 && (
                    <span className="block text-xs text-[var(--color-cobre-oscuro)]">
                      {fila.errores.join(' ')}
                    </span>
                  )}
                </td>
                <td className="py-3 text-[var(--color-tinta-suave)]">{fila.categoria || '—'}</td>
                <td className="py-3">{fila.duracion ? `${fila.duracion} min` : '—'}</td>
                <td className="py-3">{formatMoney(fila.precio, moneda)}</td>
                <td className="py-3">
                  {fila.accion === 'crear' && 'Crear'}
                  {fila.accion === 'actualizar' && 'Actualizar'}
                  {fila.accion === 'omitir' && 'Se omite'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado.fase === 'error' && (
        <p role="alert" className="mt-4 text-sm text-[var(--color-cobre-oscuro)]">
          {resultado.mensaje}
        </p>
      )}

      <form action={importar} className="mt-8 flex flex-wrap items-center gap-3">
        <input type="hidden" name="csv" value={estado.texto} />
        <BotonEnviar
          texto={`Importar ${analisis.totales.crear + analisis.totales.actualizar} servicios`}
        />
        <Link href="/admin/servicios/importar" className="boton-secundario">
          Empezar de nuevo
        </Link>
      </form>

      {analisis.totales.omitir > 0 && (
        <p className="mt-3 text-xs text-[var(--color-tinta-tenue)]">
          Las filas con errores no se importan. Corrígelas en la planilla y vuelve a cargarla:
          los servicios ya importados se actualizan, no se duplican.
        </p>
      )}
    </div>
  )
}

function Resumen({
  numero,
  texto,
  tono,
}: {
  numero: number
  texto: string
  tono: 'ok' | 'neutro' | 'error'
}) {
  const colores = {
    ok: 'bg-[var(--color-salvia-clara)] text-[var(--color-salvia)]',
    neutro: 'bg-[var(--color-arena)] text-[var(--color-tinta-suave)]',
    error: 'bg-[#F6E3DD] text-[var(--color-cobre-oscuro)]',
  }
  return (
    <span className={`rounded-full px-4 py-2 ${colores[tono]}`}>
      <strong>{numero}</strong> {texto}
    </span>
  )
}

function BotonEnviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="boton-primario">
      {pending ? 'Procesando…' : texto}
    </button>
  )
}
