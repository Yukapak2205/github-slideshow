import Link from 'next/link'
import type { BusinessSettings } from '@carezia/core'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/servicios', label: 'Servicios' },
  { href: '/paquetes', label: 'Paquetes' },
  { href: '/equipo', label: 'Equipo' },
]

export async function SiteHeader({ business }: { business: BusinessSettings }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-arena)] bg-[var(--color-crema)]/85 backdrop-blur">
      <div className="contenedor flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl tracking-tight">
          {business.name}
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-[var(--color-tinta-suave)] md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--color-tinta)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={user ? '/mi-cuenta' : '/ingresar'}
            className="hidden text-sm text-[var(--color-tinta-suave)] hover:text-[var(--color-tinta)] sm:inline"
          >
            {user ? 'Mi cuenta' : 'Ingresar'}
          </Link>
          <Link href="/reservar" className="boton-primario !px-5 !py-2.5">
            Reservar
          </Link>
        </div>
      </div>
    </header>
  )
}
