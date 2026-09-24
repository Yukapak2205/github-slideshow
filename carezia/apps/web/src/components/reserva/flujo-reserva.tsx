'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDaysISO, formatMoney, toLocalDateISO } from '@carezia/core'
import { SelectorHoras } from './selector-horas'

interface Servicio {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price_amount: number
  duration_min: number
  deposit_amount: number
}

interface Categoria {
  id: string
  name: string
  slug: string
}

interface Profesional {
  id: string
  display_name: string
  title: string | null
}

interface Credito {
  id: string
  package_name: string
  sessions_total: number
  sessions_used: number
  expires_at: string | null
  serviceIds: string[]
}

interface Props {
  servicios: Servicio[]
  categorias: Categoria[]
  equipo: Profesional[]
  vinculos: Array<{ staff_id: string; service_id: string }>
  creditos: Credito[]
  moneda: string
  zonaHoraria: string
  diasMaximos: number
  usuario: { id: string; email: string; nombre: string } | null
  slugInicial?: string
}

type Paso = 1 | 2 | 3

export function FlujoReserva({
  servicios,
  categorias,
  equipo,
  vinculos,
  creditos,
  moneda,
  zonaHoraria,
  diasMaximos,
  usuario,
  slugInicial,
}: Props) {
  const router = useRouter()

  const servicioInicial = servicios.find((s) => s.slug === slugInicial)
  const [servicioId, setServicioId] = useState<string | null>(servicioInicial?.id ?? null)
  const [profesionalId, setProfesionalId] = useState<string | null>(null)
  const [inicio, setInicio] = useState<string | null>(null)
  const [creditoId, setCreditoId] = useState<string | null>(null)
  const [paso, setPaso] = useState<Paso>(servicioInicial ? 2 : 1)

  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const servicio = servicios.find((s) => s.id === servicioId) ?? null

  // Profesionales habilitados para el servicio elegido.
  const profesionales = useMemo(() => {
    if (!servicioId) return []
    const permitidos = new Set(
      vinculos.filter((v) => v.service_id === servicioId).map((v) => v.staff_id),
    )
    return equipo.filter((p) => permitidos.has(p.id))
  }, [equipo, servicioId, vinculos])

  // Paquetes del cliente que cubren este servicio y aún tienen sesiones.
  const creditosAplicables = useMemo(
    () => (servicioId ? creditos.filter((c) => c.serviceIds.includes(servicioId)) : []),
    [creditos, servicioId],
  )

  // Cambiar de servicio invalida todo lo que se eligió después: la hora
  // pertenece a una duración concreta y el crédito, a un paquete concreto.
  const elegirServicio = useCallback((id: string) => {
    setServicioId(id)
    setProfesionalId(null)
    setInicio(null)
    setCreditoId(null)
    setPaso(2)
  }, [])

  // Cambiar de profesional cambia la agenda, así que la hora deja de valer.
  const elegirProfesional = useCallback((id: string | null) => {
    setProfesionalId(id)
    setInicio(null)
  }, [])

  const credito = creditosAplicables.find((c) => c.id === creditoId) ?? null
  const precioFinal = credito ? 0 : (servicio?.price_amount ?? 0)
  const requiereAbono = !credito && (servicio?.deposit_amount ?? 0) > 0

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!servicio || !inicio) return

    setEnviando(true)
    setError(null)

    try {
      const respuesta = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: servicio.id,
          staffId: profesionalId ?? undefined,
          startsAt: inicio,
          purchaseId: creditoId ?? undefined,
          guestName: nombre || undefined,
          guestEmail: email || undefined,
          guestPhone: telefono || undefined,
          clientNotes: notas || undefined,
        }),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        if (datos.code === 'SLOT_TAKEN') {
          // Alguien se adelantó: hay que volver a pedir la disponibilidad.
          setInicio(null)
          setError('Esa hora acaba de ser tomada. Elige otra, por favor.')
          setPaso(2)
          return
        }
        if (datos.code === 'AUTH_REQUIRED') {
          router.push(`/ingresar?volver=${encodeURIComponent('/reservar')}`)
          return
        }
        setError(datos.error ?? 'No se pudo confirmar la reserva.')
        return
      }

      if (datos.checkoutUrl) {
        window.location.assign(datos.checkoutUrl)
        return
      }

      router.push(`/reserva/${datos.appointment.id}`)
    } catch {
      setError('Hubo un problema de conexión. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const hoy = toLocalDateISO(new Date(), zonaHoraria)

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        {/* ---------- paso 1: servicio ---------- */}
        <Seccion
          numero={1}
          titulo="Elige tu tratamiento"
          abierta={paso === 1}
          resumen={servicio?.name}
          alAbrir={() => setPaso(1)}
        >
          <div className="space-y-8">
            {categorias.map((categoria) => {
              const items = servicios.filter((s) => s.category_id === categoria.id)
              if (items.length === 0) return null
              return (
                <div key={categoria.id}>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                    {categoria.name}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => elegirServicio(item.id)}
                        aria-pressed={servicioId === item.id}
                        className={`rounded-[var(--radius-suave)] border p-4 text-left transition-colors ${
                          servicioId === item.id
                            ? 'border-[var(--color-cobre)] bg-[var(--color-arena)]/40'
                            : 'border-[var(--color-arena-oscura)] hover:border-[var(--color-cobre)]'
                        }`}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                          {item.duration_min} min · {formatMoney(item.price_amount, moneda)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Seccion>

        {/* ---------- paso 2: profesional y hora ---------- */}
        <Seccion
          numero={2}
          titulo="Escoge día y hora"
          abierta={paso === 2}
          bloqueada={!servicio}
          resumen={inicio ? new Date(inicio).toLocaleString('es-CL', { timeZone: zonaHoraria }) : undefined}
          alAbrir={() => servicio && setPaso(2)}
        >
          {servicio && (
            <>
              {profesionales.length > 1 && (
                <div className="mb-6">
                  <p className="etiqueta-campo">¿Con quién?</p>
                  <div className="flex flex-wrap gap-2">
                    <ChipProfesional
                      activo={profesionalId === null}
                      onClick={() => elegirProfesional(null)}
                    >
                      Cualquiera disponible
                    </ChipProfesional>
                    {profesionales.map((persona) => (
                      <ChipProfesional
                        key={persona.id}
                        activo={profesionalId === persona.id}
                        onClick={() => elegirProfesional(persona.id)}
                      >
                        {persona.display_name}
                      </ChipProfesional>
                    ))}
                  </div>
                </div>
              )}

              <SelectorHoras
                key={`${servicio.id}-${profesionalId ?? 'cualquiera'}`}
                servicioId={servicio.id}
                profesionalId={profesionalId}
                zonaHoraria={zonaHoraria}
                desde={hoy}
                hasta={addDaysISO(hoy, diasMaximos)}
                seleccion={inicio}
                alSeleccionar={(valor) => {
                  setInicio(valor)
                  setPaso(3)
                }}
              />
            </>
          )}
        </Seccion>

        {/* ---------- paso 3: datos y pago ---------- */}
        <Seccion
          numero={3}
          titulo="Tus datos"
          abierta={paso === 3}
          bloqueada={!inicio}
          alAbrir={() => inicio && setPaso(3)}
        >
          <form onSubmit={confirmar} className="space-y-5">
            {creditosAplicables.length > 0 && (
              <fieldset className="rounded-[var(--radius-suave)] border border-[var(--color-salvia)] bg-[var(--color-salvia-clara)]/50 p-4">
                <legend className="px-2 text-sm font-medium">Cómo quieres pagar</legend>
                <label className="flex cursor-pointer items-start gap-3 py-2">
                  <input
                    type="radio"
                    name="pago"
                    checked={creditoId === null}
                    onChange={() => setCreditoId(null)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    Pagar esta sesión
                    <span className="block text-[var(--color-tinta-suave)]">
                      {formatMoney(servicio?.price_amount ?? 0, moneda)}
                    </span>
                  </span>
                </label>
                {creditosAplicables.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 py-2">
                    <input
                      type="radio"
                      name="pago"
                      checked={creditoId === item.id}
                      onChange={() => setCreditoId(item.id)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Usar mi paquete · {item.package_name}
                      <span className="block text-[var(--color-tinta-suave)]">
                        Te quedan {item.sessions_total - item.sessions_used} de{' '}
                        {item.sessions_total} sesiones
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nombre" className="etiqueta-campo">Nombre y apellido</label>
                <input
                  id="nombre"
                  className="campo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="telefono" className="etiqueta-campo">Teléfono</label>
                <input
                  id="telefono"
                  className="campo"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="etiqueta-campo">Correo</label>
              <input
                id="email"
                type="email"
                className="campo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={Boolean(usuario)}
                autoComplete="email"
              />
              <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">
                Ahí te enviamos la confirmación y el recordatorio.
              </p>
            </div>

            <div>
              <label htmlFor="notas" className="etiqueta-campo">
                Algo que debamos saber (opcional)
              </label>
              <textarea
                id="notas"
                className="campo min-h-24"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={1000}
                placeholder="Alergias, tratamientos previos, embarazo, medicamentos…"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[var(--color-cobre-oscuro)]">
                {error}
              </p>
            )}

            <button type="submit" disabled={enviando || !inicio} className="boton-primario w-full">
              {enviando
                ? 'Confirmando…'
                : requiereAbono
                  ? `Pagar abono de ${formatMoney(servicio?.deposit_amount ?? 0, moneda)}`
                  : 'Confirmar reserva'}
            </button>

            {!usuario && (
              <p className="text-center text-xs text-[var(--color-tinta-tenue)]">
                ¿Ya tienes cuenta?{' '}
                <a href="/ingresar?volver=/reservar" className="underline">
                  Ingresa
                </a>{' '}
                para usar tus paquetes.
              </p>
            )}
          </form>
        </Seccion>
      </div>

      {/* ---------- resumen ---------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="tarjeta bg-white">
          <p className="text-sm font-medium">Resumen</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Fila etiqueta="Servicio" valor={servicio?.name ?? '—'} />
            <Fila
              etiqueta="Duración"
              valor={servicio ? `${servicio.duration_min} min` : '—'}
            />
            <Fila
              etiqueta="Profesional"
              valor={
                profesionalId
                  ? (profesionales.find((p) => p.id === profesionalId)?.display_name ?? '—')
                  : 'Cualquiera disponible'
              }
            />
            <Fila
              etiqueta="Fecha"
              valor={
                inicio
                  ? new Date(inicio).toLocaleString('es-CL', {
                      timeZone: zonaHoraria,
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-[var(--color-arena)] pt-5">
            <span className="text-sm text-[var(--color-tinta-suave)]">Total</span>
            <span className="text-xl font-medium">
              {credito ? 'Con tu paquete' : formatMoney(precioFinal, moneda)}
            </span>
          </div>

          {requiereAbono && (
            <p className="mt-3 text-xs text-[var(--color-tinta-tenue)]">
              Se cobra un abono de {formatMoney(servicio?.deposit_amount ?? 0, moneda)} al
              reservar. El saldo se paga en el local.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

function Seccion({
  numero,
  titulo,
  abierta,
  bloqueada,
  resumen,
  alAbrir,
  children,
}: {
  numero: number
  titulo: string
  abierta: boolean
  bloqueada?: boolean
  resumen?: string
  alAbrir: () => void
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-[var(--radius-tarjeta)] border p-6 transition-colors ${
        abierta ? 'border-[var(--color-cobre)] bg-white' : 'border-[var(--color-arena)]'
      } ${bloqueada ? 'opacity-55' : ''}`}
    >
      <button
        type="button"
        onClick={alAbrir}
        disabled={bloqueada}
        aria-expanded={abierta}
        className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-arena)] text-sm">
          {numero}
        </span>
        <span className="flex-1">
          <span className="block font-medium">{titulo}</span>
          {!abierta && resumen && (
            <span className="block text-sm text-[var(--color-tinta-suave)]">{resumen}</span>
          )}
        </span>
      </button>

      {abierta && <div className="mt-6">{children}</div>}
    </section>
  )
}

function ChipProfesional({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        activo
          ? 'border-[var(--color-cobre)] bg-[var(--color-cobre)] text-white'
          : 'border-[var(--color-arena-oscura)] hover:border-[var(--color-cobre)]'
      }`}
    >
      {children}
    </button>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-tinta-suave)]">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  )
}
