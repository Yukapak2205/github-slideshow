import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BotonSalir } from '@/components/boton-salir'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panel' }

const NAV = [
  { href: '/admin', label: 'Agenda' },
  { href: '/admin/servicios', label: 'Servicios' },
  { href: '/admin/paquetes', label: 'Paquetes' },
  { href: '/admin/equipo', label: 'Equipo' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/ajustes', label: 'Ajustes' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/ingresar?volver=/admin')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.role !== 'admin' && perfil?.role !== 'staff') redirect('/mi-cuenta')

  return (
    <div className="contenedor py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-arena)] pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">Panel</p>
          <h1 className="text-2xl">{perfil?.full_name || user.email}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-[var(--color-tinta-suave)] hover:underline">
            Ver el sitio
          </Link>
          <BotonSalir />
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-[var(--color-arena)] pb-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-2 text-sm text-[var(--color-tinta-suave)] transition-colors hover:bg-[var(--color-arena)] hover:text-[var(--color-tinta)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  )
}
