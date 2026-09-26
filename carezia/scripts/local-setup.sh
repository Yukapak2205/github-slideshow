#!/usr/bin/env bash
# =============================================================
# Carezia · puesta en marcha local (macOS y Linux)
#
# Levanta una base de datos Supabase en tu propio computador,
# aplica las migraciones, escribe las claves en apps/web/.env.local
# y deja el proyecto listo para `npm run dev`.
# =============================================================
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$raiz"

azul=$'\033[1;36m'; verde=$'\033[1;32m'; rojo=$'\033[1;31m'; gris=$'\033[0;90m'; fin=$'\033[0m'
paso() { printf '\n%s▸ %s%s\n' "$azul" "$1" "$fin"; }
ok()   { printf '%s  ✓ %s%s\n' "$verde" "$1" "$fin"; }
error(){ printf '\n%s✗ %s%s\n' "$rojo" "$1" "$fin"; exit 1; }
nota() { printf '%s    %s%s\n' "$gris" "$1" "$fin"; }

# ---------- requisitos ----------
paso "Comprobando lo que necesitas instalado"

command -v node >/dev/null 2>&1 || error "Falta Node.js. Instálalo desde https://nodejs.org (versión 20 o superior)."

version_node="$(node -v | sed 's/v//' | cut -d. -f1)"
[ "$version_node" -ge 20 ] || error "Tienes Node $(node -v). Se necesita la 20 o superior."
ok "Node $(node -v)"

if ! command -v supabase >/dev/null 2>&1; then
  printf '\n%s  No está el CLI de Supabase, que es lo que levanta la base de datos local.%s\n' "$gris" "$fin"
  nota "Instálalo con uno de estos y vuelve a ejecutar este script:"
  nota "  macOS:   brew install supabase/tap/supabase"
  nota "  Linux:   npx supabase --help   (o revisa https://supabase.com/docs/guides/cli)"
  error "Falta el CLI de Supabase."
fi
ok "CLI de Supabase $(supabase --version 2>/dev/null | head -1)"

if ! docker info >/dev/null 2>&1; then
  error "Docker no está corriendo. Abre Docker Desktop y espera a que arranque; la base local corre dentro de Docker."
fi
ok "Docker está corriendo"

# ---------- dependencias ----------
paso "Instalando dependencias del proyecto"
npm install --no-audit --fund=false
ok "Dependencias instaladas"

# ---------- base de datos local ----------
paso "Levantando la base de datos local"

if [ ! -f supabase/config.toml ]; then
  # `init` genera el config.toml que corresponde a tu versión del CLI.
  # No se incluye uno en el repositorio porque el formato cambia entre versiones.
  supabase init --force >/dev/null
  ok "Configuración de Supabase creada"
fi

if supabase status >/dev/null 2>&1; then
  ok "Ya estaba levantada"
else
  nota "La primera vez descarga varias imágenes de Docker. Puede tardar unos minutos."
  supabase start
  ok "Base de datos levantada"
fi

paso "Aplicando el esquema y el catálogo de Carezia"
# `db reset` deja la base en cero y corre las cuatro migraciones en orden.
supabase db reset
ok "Esquema, ajustes y los 60 servicios cargados"

# ---------- variables de entorno ----------
paso "Escribiendo apps/web/.env.local"

estado="$(supabase status -o env 2>/dev/null || true)"
leer() { printf '%s\n' "$estado" | grep -m1 "^$1=" | cut -d= -f2- | tr -d '"'; }

api_url="$(leer API_URL)"
anon="$(leer ANON_KEY)"
service="$(leer SERVICE_ROLE_KEY)"

[ -n "$api_url" ] && [ -n "$anon" ] && [ -n "$service" ] || \
  error "No pude leer las claves locales. Ejecuta 'supabase status' y cópialas a mano en apps/web/.env.local"

if [ -f apps/web/.env.local ]; then
  cp apps/web/.env.local "apps/web/.env.local.respaldo-$(date +%Y%m%d%H%M%S)"
  nota "Tu .env.local anterior quedó respaldado."
fi

cat > apps/web/.env.local <<ENV
# Generado por scripts/local-setup.sh · base de datos local
NEXT_PUBLIC_SUPABASE_URL=$api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service

# Sin pasarela: el cobro queda presencial. Así se prueba todo el flujo
# sin necesitar credenciales de Stripe ni Mercado Pago.
PAYMENT_PROVIDER=

# Sin RESEND_API_KEY los correos no se envían: quedan en el log de la consola.
RESEND_API_KEY=
EMAIL_FROM=Carezia <hola@carezia.cl>

# Para probar los recordatorios a mano:
#   curl -H "Authorization: Bearer secreto-local" http://localhost:3000/api/cron/reminders
CRON_SECRET=secreto-local
ENV
ok "Variables escritas"

cat > apps/mobile/.env <<ENV
# Generado por scripts/local-setup.sh
EXPO_PUBLIC_SUPABASE_URL=$api_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon
EXPO_PUBLIC_API_URL=http://localhost:3000
ENV
ok "Variables de la app móvil escritas"

# ---------- listo ----------
printf '\n%s═══════════════════════════════════════════════%s\n' "$verde" "$fin"
printf '%s  Carezia está lista para correr en tu máquina%s\n' "$verde" "$fin"
printf '%s═══════════════════════════════════════════════%s\n\n' "$verde" "$fin"

cat <<'FIN'
  Arranca la web:
      npm run dev            → http://localhost:3000

  Para entrar al panel de administración:
      1. Abre http://localhost:3000/ingresar y pon cualquier correo.
      2. El correo NO sale a internet: ábrelo en http://localhost:54324
      3. Hazte administrador con:
             npm run local:admin tucorreo@ejemplo.cl
      4. Entra a http://localhost:3000/admin

  Otras cosas útiles:
      npm test               → los 55 tests
      http://localhost:54323 → ver la base de datos en el navegador
      npm run local:stop     → apaga la base de datos

  La app móvil (necesita Expo Go en tu teléfono):
      npm start --workspace @carezia/mobile
FIN
