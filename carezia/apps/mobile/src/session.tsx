import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface ContextoSesion {
  sesion: Session | null
  cargando: boolean
  salir: () => Promise<void>
}

const Contexto = createContext<ContextoSesion>({
  sesion: null,
  cargando: true,
  salir: async () => {},
})

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return
      setSesion(data.session)
      setCargando(false)
    })

    // Mantiene la sesión al día tras refrescos de token o cierre en otra pantalla.
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva)
    })

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  const valor = useMemo<ContextoSesion>(
    () => ({
      sesion,
      cargando,
      salir: async () => {
        await supabase.auth.signOut()
      },
    }),
    [sesion, cargando],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion() {
  return useContext(Contexto)
}
