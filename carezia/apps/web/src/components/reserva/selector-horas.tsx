'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDaysISO, formatLocalTime } from '@carezia/core'

interface Dia {
  date: string
  slots: Array<{ start: string; staffIds: string[] }>
}

interface Props {
  servicioId: string
  profesionalId: string | null
  zonaHoraria: string
  /** Primer día reservable, "YYYY-MM-DD". */
  desde: string
  /** Último día reservable según la ventana del negocio. */
  hasta: string
  seleccion: string | null
  alSeleccionar: (inicio: string) => void
}

const DIAS_POR_PAGINA = 7

const NOMBRE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export function SelectorHoras({
  servicioId,
  profesionalId,
  zonaHoraria,
  desde,
  hasta,
  seleccion,
  alSeleccionar,
}: Props) {
  const [inicioSemana, setInicioSemana] = useState(desde)
  const [dias, setDias] = useState<Dia[]>([])
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controlador = new AbortController()

    // La carga va dentro de una función asíncrona: cambiar el estado de
    // forma síncrona en el cuerpo del efecto encadenaría renders.
    async function cargar() {
      setCargando(true)
      setError(null)

      const params = new URLSearchParams({
        service: servicioId,
        from: inicioSemana,
        days: String(DIAS_POR_PAGINA),
      })
      if (profesionalId) params.set('staff', profesionalId)

      try {
        const respuesta = await fetch(`/api/availability?${params}`, {
          signal: controlador.signal,
        })
        if (!respuesta.ok) throw new Error('respuesta no válida')

        const datos: { days: Dia[] } = await respuesta.json()
        setDias(datos.days)
        // Se abre el primer día que efectivamente tenga horas.
        const primero = datos.days.find((dia) => dia.slots.length > 0)
        setDiaActivo(primero?.date ?? datos.days[0]?.date ?? null)
      } catch (causa) {
        if (causa instanceof DOMException && causa.name === 'AbortError') return
        setError('No pudimos cargar las horas disponibles.')
      } finally {
        if (!controlador.signal.aborted) setCargando(false)
      }
    }

    void cargar()
    return () => controlador.abort()
  }, [servicioId, profesionalId, inicioSemana])

  const horas = useMemo(
    () => dias.find((dia) => dia.date === diaActivo)?.slots ?? [],
    [dias, diaActivo],
  )

  const haySemanaAnterior = inicioSemana > desde
  const haySemanaSiguiente = addDaysISO(inicioSemana, DIAS_POR_PAGINA) <= hasta

  function retroceder() {
    const anterior = addDaysISO(inicioSemana, -DIAS_POR_PAGINA)
    setInicioSemana(anterior < desde ? desde : anterior)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={retroceder}
          disabled={!haySemanaAnterior}
          className="boton-secundario !px-4 !py-2 text-xs"
        >
          ← Semana anterior
        </button>
        <button
          type="button"
          onClick={() => setInicioSemana(addDaysISO(inicioSemana, DIAS_POR_PAGINA))}
          disabled={!haySemanaSiguiente}
          className="boton-secundario !px-4 !py-2 text-xs"
        >
          Semana siguiente →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {dias.map((dia) => {
          const fecha = new Date(`${dia.date}T12:00:00Z`)
          const disponible = dia.slots.length > 0
          const activo = dia.date === diaActivo

          return (
            <button
              key={dia.date}
              type="button"
              onClick={() => setDiaActivo(dia.date)}
              disabled={!disponible}
              aria-pressed={activo}
              className={`rounded-[var(--radius-suave)] border px-1 py-3 text-center transition-colors ${
                activo
                  ? 'border-[var(--color-cobre)] bg-[var(--color-cobre)] text-white'
                  : disponible
                    ? 'border-[var(--color-arena-oscura)] hover:border-[var(--color-cobre)]'
                    : 'border-transparent bg-[var(--color-arena)]/30 text-[var(--color-tinta-tenue)]'
              }`}
            >
              <span className="block text-[11px] uppercase">
                {NOMBRE_DIA[fecha.getUTCDay()]}
              </span>
              <span className="block text-base font-medium">{fecha.getUTCDate()}</span>
            </button>
          )
        })}

        {cargando &&
          dias.length === 0 &&
          Array.from({ length: DIAS_POR_PAGINA }).map((_, indice) => (
            <div
              key={indice}
              className="h-[62px] animate-pulse rounded-[var(--radius-suave)] bg-[var(--color-arena)]/50"
            />
          ))}
      </div>

      <div className="mt-6" aria-live="polite">
        {error && <p className="text-sm text-[var(--color-cobre-oscuro)]">{error}</p>}

        {!error && cargando && (
          <p className="text-sm text-[var(--color-tinta-suave)]">Buscando horas…</p>
        )}

        {!error && !cargando && horas.length === 0 && (
          <p className="text-sm text-[var(--color-tinta-suave)]">
            No quedan horas este día. Prueba otro o revisa la semana siguiente.
          </p>
        )}

        {!cargando && horas.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {horas.map((hora) => {
              const elegida = seleccion === hora.start
              return (
                <button
                  key={hora.start}
                  type="button"
                  onClick={() => alSeleccionar(hora.start)}
                  aria-pressed={elegida}
                  className={`rounded-[var(--radius-suave)] border py-2.5 text-sm transition-colors ${
                    elegida
                      ? 'border-[var(--color-cobre)] bg-[var(--color-cobre)] text-white'
                      : 'border-[var(--color-arena-oscura)] hover:border-[var(--color-cobre)]'
                  }`}
                >
                  {formatLocalTime(new Date(hora.start), zonaHoraria)}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
