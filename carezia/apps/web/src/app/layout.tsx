import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { getSettings } from '@/lib/settings'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

export async function generateMetadata(): Promise<Metadata> {
  const { business, home } = await getSettings()
  return {
    title: {
      default: `${business.name} · ${business.tagline}`,
      template: `%s · ${business.name}`,
    },
    description: home.hero_subtitle,
    openGraph: {
      title: `${business.name} · ${business.tagline}`,
      description: home.hero_subtitle,
      type: 'website',
      locale: 'es_CL',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { business } = await getSettings()

  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader business={business} />
        <main className="flex-1">{children}</main>
        <SiteFooter business={business} />
      </body>
    </html>
  )
}
