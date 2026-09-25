import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { ImportadorServicios } from '@/components/admin/importador-servicios'

export const dynamic = 'force-dynamic'

export default async function ImportarServiciosPage() {
  const { business } = await getSettings()

  return (
    <div className="max-w-4xl">
      <Link href="/admin/servicios" className="text-sm text-[var(--color-tinta-suave)] hover:underline">
        ← Volver a servicios
      </Link>

      <h2 className="mt-4 text-2xl">Carga masiva de servicios</h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-tinta-suave)]">
        Sube tu planilla y revisa qué va a pasar antes de guardar nada. Los servicios se
        reconocen por su nombre: si ya existe, se actualiza en vez de duplicarse, así que
        puedes volver a cargar la misma planilla corregida las veces que necesites.
      </p>

      <div className="mt-8">
        <ImportadorServicios moneda={business.currency} />
      </div>

      <section className="mt-14 border-t border-[var(--color-arena)] pt-8">
        <h3 className="text-lg">Cómo debe verse la planilla</h3>
        <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">
          La primera fila son los encabezados. Sólo <strong>nombre</strong>,{' '}
          <strong>precio</strong> y <strong>duracion_min</strong> son obligatorios; el resto
          tiene valores por defecto.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-[var(--color-arena-oscura)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
              <tr>
                <th className="py-3">Columna</th>
                <th className="py-3">Qué es</th>
                <th className="py-3">También se acepta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-arena)]">
              {[
                ['nombre', 'Nombre del servicio', 'servicio, tratamiento'],
                ['categoria', 'Se crea sola si no existe', 'familia, grupo, tipo'],
                ['descripcion', 'Texto que ve la clienta', 'detalle'],
                ['precio', '45.000, $45.000 o 45000', 'valor, monto, tarifa'],
                ['duracion_min', '60, «60 min», «1h30» o «1:30»', 'duracion, minutos'],
                ['buffer_min', 'Limpieza posterior', 'limpieza, preparacion'],
                ['abono', 'Lo que se cobra al reservar', 'deposito, anticipo'],
                ['activo', 'si / no', 'publicado, visible'],
                ['destacado', 'si / no', 'featured'],
                ['orden', 'Posición en la lista', 'posicion'],
              ].map(([columna, que, alias]) => (
                <tr key={columna}>
                  <td className="py-3 font-mono text-xs">{columna}</td>
                  <td className="py-3 text-[var(--color-tinta-suave)]">{que}</td>
                  <td className="py-3 text-xs text-[var(--color-tinta-tenue)]">{alias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/api/admin/servicios/exportar?plantilla=1" className="boton-secundario">
            Descargar plantilla de ejemplo
          </a>
          <a href="/api/admin/servicios/exportar" className="boton-secundario">
            Exportar mis servicios actuales
          </a>
        </div>

        <p className="mt-4 text-xs text-[var(--color-tinta-tenue)]">
          Exportar, editar en Excel y volver a subir es la forma más rápida de cambiar
          muchos precios de una vez.
        </p>
      </section>
    </div>
  )
}
