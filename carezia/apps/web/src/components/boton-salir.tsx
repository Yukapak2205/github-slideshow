'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BotonSalir() {
  const router = useRouter()

  async function salir() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button type="button" onClick={salir} className="boton-secundario !px-4 !py-2 text-xs">
      Cerrar sesión
    </button>
  )
}
