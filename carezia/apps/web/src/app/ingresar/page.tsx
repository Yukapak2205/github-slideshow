import { FormularioIngreso } from '@/components/formulario-ingreso'

export const metadata = { title: 'Ingresar' }

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>
}) {
  const { volver } = await searchParams

  return (
    <div className="contenedor flex justify-center py-20">
      <div className="w-full max-w-md">
        <h1 className="text-3xl">Ingresa a tu cuenta</h1>
        <p className="mt-3 text-sm text-[var(--color-tinta-suave)]">
          Te enviamos un enlace al correo. Sin contraseñas que recordar.
        </p>
        <div className="mt-8">
          <FormularioIngreso volver={volver} />
        </div>
      </div>
    </div>
  )
}
