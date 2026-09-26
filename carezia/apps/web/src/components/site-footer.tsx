import Link from 'next/link'
import type { BusinessSettings } from '@carezia/core'

export function SiteFooter({ business }: { business: BusinessSettings }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-[var(--color-arena)] bg-[var(--color-arena)]/30">
      <div className="contenedor grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg">{business.name}</p>
          <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">{business.tagline}</p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-medium">Reservas</p>
          <ul className="space-y-2 text-[var(--color-tinta-suave)]">
            <li><Link href="/servicios" className="hover:text-[var(--color-tinta)]">Servicios</Link></li>
            <li><Link href="/paquetes" className="hover:text-[var(--color-tinta)]">Paquetes</Link></li>
            <li><Link href="/reservar" className="hover:text-[var(--color-tinta)]">Agendar hora</Link></li>
            <li><Link href="/mi-cuenta" className="hover:text-[var(--color-tinta)]">Mis reservas</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-medium">Contacto</p>
          <ul className="space-y-2 text-[var(--color-tinta-suave)]">
            {business.email && <li><a href={`mailto:${business.email}`} className="hover:text-[var(--color-tinta)]">{business.email}</a></li>}
            {business.phone && <li><a href={`tel:${business.phone.replace(/\s/g, '')}`} className="hover:text-[var(--color-tinta)]">{business.phone}</a></li>}
            {business.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--color-tinta)]"
                >
                  @{business.instagram.replace('@', '')}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="text-sm text-[var(--color-tinta-suave)]">
          <p className="mb-3 font-medium text-[var(--color-tinta)]">Políticas</p>
          <p>
            Las reservas se pueden cambiar o cancelar con anticipación desde tu cuenta.
            Los paquetes tienen la vigencia indicada en cada plan.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-arena)]">
        <div className="contenedor flex flex-col gap-2 py-6 text-xs text-[var(--color-tinta-tenue)] sm:flex-row sm:justify-between">
          <p>© {year} {business.name}. Todos los derechos reservados.</p>
          <p>Agenda y pagos propios.</p>
        </div>
      </div>
    </footer>
  )
}
