'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Ingreso por enlace mágico.
 *
 * `volver` se valida como ruta interna antes de usarla: un `?volver=`
 * apuntando a otro dominio convertiría el correo de acceso en un redirect
 * abierto.
 */
function rutaSegura(valor: string | undefined): string {
  if (!valor) return '/mi-cuenta'
  return valor.startsWith('/') && !valor.startsWith('//') ? valor : '/mi-cuenta'
}

export function FormularioIngreso({ volver }: { volver?: string }) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setCargando(true)
    setError(null)

    const destino = rutaSegura(volver)
    const supabase = createClient()
    const { error: fallo } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: nombre ? { full_name: nombre } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
      },
    })

    setCargando(false)
    if (fallo) {
      setError('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="tarjeta bg-white">
        <p className="font-medium">Revisa tu correo</p>
        <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
          Te enviamos un enlace a <strong>{email}</strong>. Ábrelo desde este mismo
          dispositivo para entrar.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label htmlFor="nombre" className="etiqueta-campo">Nombre (si es tu primera vez)</label>
        <input
          id="nombre"
          className="campo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="email" className="etiqueta-campo">Correo</label>
        <input
          id="email"
          type="email"
          required
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      {error && <p role="alert" className="text-sm text-[var(--color-cobre-oscuro)]">{error}</p>}

      <button type="submit" disabled={cargando} className="boton-primario w-full">
        {cargando ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
    </form>
  )
}
