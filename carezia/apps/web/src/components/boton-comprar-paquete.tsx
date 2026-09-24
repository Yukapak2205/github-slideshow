'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BotonComprarPaquete({
  packageId,
  etiqueta = 'Comprar paquete',
}: {
  packageId: string
  etiqueta?: string
}) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function comprar() {
    setCargando(true)
    setError(null)

    try {
      const respuesta = await fetch('/api/packages/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const datos = await respuesta.json()

      if (respuesta.status === 401) {
        router.push(`/ingresar?volver=${encodeURIComponent('/paquetes')}`)
        return
      }
      if (!respuesta.ok) {
        setError(datos.error ?? 'No se pudo iniciar la compra.')
        return
      }

      if (datos.checkoutUrl) {
        window.location.assign(datos.checkoutUrl)
        return
      }

      // Sin pasarela configurada el pago se coordina en el local.
      router.push('/mi-cuenta?compra=pendiente')
      router.refresh()
    } catch {
      setError('Hubo un problema de conexión. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={comprar} disabled={cargando} className="boton-primario w-full">
        {cargando ? 'Preparando…' : etiqueta}
      </button>
      {error && <p className="mt-2 text-sm text-[var(--color-cobre-oscuro)]">{error}</p>}
    </div>
  )
}
