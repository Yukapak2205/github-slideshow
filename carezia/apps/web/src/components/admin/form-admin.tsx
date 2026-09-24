'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { EstadoAccion } from '@/app/admin/actions'

/**
 * Envoltura para los formularios del panel: maneja el estado de la acción
 * y muestra el resultado sin que cada pantalla lo repita.
 */
export function FormAdmin({
  accion,
  children,
  textoBoton = 'Guardar',
}: {
  accion: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>
  children: React.ReactNode
  textoBoton?: string
}) {
  const [estado, formAction] = useActionState(accion, null)

  return (
    <form action={formAction} className="space-y-5">
      {children}

      <div className="flex items-center gap-4 pt-2">
        <BotonEnviar texto={textoBoton} />
        {estado && (
          <p
            role="status"
            className={`text-sm ${
              estado.ok ? 'text-[var(--color-salvia)]' : 'text-[var(--color-cobre-oscuro)]'
            }`}
          >
            {estado.mensaje}
          </p>
        )}
      </div>
    </form>
  )
}

function BotonEnviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="boton-primario">
      {pending ? 'Guardando…' : texto}
    </button>
  )
}

export function Campo({
  etiqueta,
  nombre,
  tipo = 'text',
  valor,
  ayuda,
  requerido,
  ...resto
}: {
  etiqueta: string
  nombre: string
  tipo?: string
  valor?: string | number | null
  ayuda?: string
  requerido?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={nombre} className="etiqueta-campo">{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        defaultValue={valor ?? ''}
        required={requerido}
        className="campo"
        {...resto}
      />
      {ayuda && <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">{ayuda}</p>}
    </div>
  )
}

export function AreaTexto({
  etiqueta,
  nombre,
  valor,
  ayuda,
}: {
  etiqueta: string
  nombre: string
  valor?: string | null
  ayuda?: string
}) {
  return (
    <div>
      <label htmlFor={nombre} className="etiqueta-campo">{etiqueta}</label>
      <textarea id={nombre} name={nombre} defaultValue={valor ?? ''} className="campo min-h-28" />
      {ayuda && <p className="mt-1.5 text-xs text-[var(--color-tinta-tenue)]">{ayuda}</p>}
    </div>
  )
}

export function Interruptor({
  etiqueta,
  nombre,
  activo,
  ayuda,
}: {
  etiqueta: string
  nombre: string
  activo: boolean
  ayuda?: string
}) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={nombre} defaultChecked={activo} className="mt-1" />
      <span className="text-sm">
        {etiqueta}
        {ayuda && <span className="block text-[var(--color-tinta-tenue)]">{ayuda}</span>}
      </span>
    </label>
  )
}
