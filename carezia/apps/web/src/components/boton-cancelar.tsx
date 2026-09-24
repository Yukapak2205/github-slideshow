'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BotonCancelar({
  appointmentId,
  requiereEmail = false,
  dentroDePlazo,
  horasDePlazo,
}: {
  appointmentId: string
  requiereEmail?: boolean
  dentroDePlazo: boolean
  horasDePlazo: number
}) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancelar() {
    setCargando(true)
    setError(null)

    const respuesta = await fetch(`/api/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setCargando(false)

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}))
      setError(datos.error ?? 'No se pudo cancelar la reserva.')
      return
    }

    router.refresh()
  }

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="boton-secundario">
        Cancelar reserva
      </button>
    )
  }

  return (
    <div className="rounded-[var(--radius-suave)] border border-[var(--color-arena-oscura)] p-4">
      <p className="text-sm">
        {dentroDePlazo
          ? '¿Seguro que quieres cancelar? Si pagaste con un paquete, la sesión vuelve a tu cuenta.'
          : `Estás cancelando con menos de ${horasDePlazo} h de anticipación. Si usaste una sesión de paquete, no se devuelve.`}
      </p>

      {requiereEmail && (
        <div className="mt-3">
          <label htmlFor="email-cancelar" className="etiqueta-campo">
            Confirma el correo con el que reservaste
          </label>
          <input
            id="email-cancelar"
            type="email"
            className="campo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[var(--color-cobre-oscuro)]">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={cancelar} disabled={cargando} className="boton-primario">
          {cargando ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="boton-secundario">
          Mejor no
        </button>
      </div>
    </div>
  )
}
