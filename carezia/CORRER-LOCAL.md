# Correr Carezia en tu computador

Todo corre en tu máquina: la web, la base de datos y la app móvil. No se
necesita cuenta en la nube ni credenciales de pago para probarlo completo.

## Lo que hay que instalar antes

| | Para qué | Dónde |
|---|---|---|
| **Node.js 20 o superior** | Correr la web y la app | [nodejs.org](https://nodejs.org) |
| **Docker Desktop** | La base de datos corre dentro de Docker | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **CLI de Supabase** | Levanta la base de datos local | ver abajo |

Instalar el CLI de Supabase:

- **macOS:** `brew install supabase/tap/supabase`
- **Windows:** `scoop install supabase`
- **Linux:** instrucciones en [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

Abre Docker Desktop y espera a que termine de arrancar antes de seguir.

## Puesta en marcha

Desde la carpeta `carezia`:

**macOS y Linux**

```bash
npm run local:setup
```

**Windows (PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-setup.ps1
```

El script instala las dependencias, levanta la base de datos, aplica las
cuatro migraciones —incluido el catálogo real de 60 servicios— y escribe las
claves en `apps/web/.env.local` y `apps/mobile/.env`.

La primera vez descarga varias imágenes de Docker y puede tardar unos minutos.

## Arrancar la web

```bash
npm run dev
```

Queda en **http://localhost:3000**

## Entrar al panel de administración

El panel está protegido por rol, así que hay que darse permiso una vez:

1. Abre http://localhost:3000/ingresar y escribe cualquier correo.
2. **El correo no sale a internet.** Los correos locales quedan en un buzón
   de prueba: ábrelo en **http://localhost:54324** y haz clic en el enlace.
3. Vuelve a la terminal y ejecuta:
   ```bash
   npm run local:admin tucorreo@ejemplo.cl
   ```
4. Entra a http://localhost:3000/admin

## Qué se puede probar sin configurar nada más

- Reservar una hora de punta a punta, con disponibilidad real.
- Comprar un plan de sesiones: sin pasarela configurada queda como pago
  presencial, y el plan se activa desde el panel.
- Reservar usando el crédito de un plan y ver cómo se descuenta.
- Cancelar y ver si el crédito se devuelve o no según el plazo.
- Cambiar precios, duraciones y textos de la portada, y verlos al instante.
- La carga masiva de servicios, con el CSV que está en `datos/`.

## Direcciones útiles

| Dirección | Qué es |
|---|---|
| http://localhost:3000 | La web |
| http://localhost:3000/admin | El panel |
| http://localhost:54323 | La base de datos en el navegador |
| http://localhost:54324 | Buzón de los correos de prueba |

## Comandos

```bash
npm run dev            # la web en modo desarrollo
npm test               # los 55 tests
npm run lint           # revisión de código
npm run local:reset    # borra la base y la recarga desde cero
npm run local:stop     # apaga la base de datos
```

## La app móvil

Necesitas **Expo Go** instalado en tu teléfono, y que el teléfono esté en la
misma red wifi que el computador.

```bash
npm start --workspace @carezia/mobile
```

Escanea el código QR con Expo Go. Un detalle: la app apunta a
`http://localhost:3000`, que desde el teléfono no existe. Cambia
`EXPO_PUBLIC_API_URL` en `apps/mobile/.env` por la IP de tu computador en la
red local, por ejemplo `http://192.168.1.20:3000`.

## Si algo falla

**«Docker no está corriendo»** — Abre Docker Desktop y espera a que el ícono
deje de moverse.

**«Falta el CLI de Supabase»** — Instálalo según tu sistema, arriba.

**El puerto 3000 está ocupado** — `npm run dev -- -p 3001`

**La base quedó rara después de probar** — `npm run local:reset` la deja como
recién instalada, con el catálogo cargado.

**Cambiaste de rama o actualizaste el código** — `npm install` y
`npm run local:reset`.
