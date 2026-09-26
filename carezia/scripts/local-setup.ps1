# =============================================================
# Carezia · puesta en marcha local (Windows, PowerShell)
#
# Levanta una base de datos Supabase en tu propio computador,
# aplica las migraciones, escribe las claves en apps\web\.env.local
# y deja el proyecto listo para `npm run dev`.
#
# Ejecútalo así, desde la carpeta carezia:
#   powershell -ExecutionPolicy Bypass -File scripts\local-setup.ps1
# =============================================================
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $raiz

function Paso($t)  { Write-Host "`n> $t" -ForegroundColor Cyan }
function Ok($t)    { Write-Host "  OK  $t" -ForegroundColor Green }
function Nota($t)  { Write-Host "      $t" -ForegroundColor DarkGray }
function Alto($t)  { Write-Host "`nX  $t" -ForegroundColor Red; exit 1 }

# ---------- requisitos ----------
Paso 'Comprobando lo que necesitas instalado'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Alto 'Falta Node.js. Instalalo desde https://nodejs.org (version 20 o superior).'
}
$mayor = [int]((node -v) -replace 'v','' -split '\.')[0]
if ($mayor -lt 20) { Alto "Tienes Node $(node -v). Se necesita la 20 o superior." }
Ok "Node $(node -v)"

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Nota 'No esta el CLI de Supabase, que es lo que levanta la base de datos local.'
  Nota 'Instalalo con:  scoop install supabase'
  Nota 'o revisa https://supabase.com/docs/guides/cli'
  Alto 'Falta el CLI de Supabase.'
}
Ok 'CLI de Supabase presente'

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Alto 'Docker no esta corriendo. Abre Docker Desktop y espera a que arranque; la base local corre dentro de Docker.'
}
Ok 'Docker esta corriendo'

# ---------- dependencias ----------
Paso 'Instalando dependencias del proyecto'
npm install --no-audit --fund=false
if ($LASTEXITCODE -ne 0) { Alto 'Fallo npm install.' }
Ok 'Dependencias instaladas'

# ---------- base de datos local ----------
Paso 'Levantando la base de datos local'

if (-not (Test-Path 'supabase\config.toml')) {
  # `init` genera el config.toml que corresponde a tu version del CLI.
  supabase init --force | Out-Null
  Ok 'Configuracion de Supabase creada'
}

supabase status *> $null
if ($LASTEXITCODE -eq 0) {
  Ok 'Ya estaba levantada'
} else {
  Nota 'La primera vez descarga varias imagenes de Docker. Puede tardar unos minutos.'
  supabase start
  if ($LASTEXITCODE -ne 0) { Alto 'No se pudo levantar la base de datos.' }
  Ok 'Base de datos levantada'
}

Paso 'Aplicando el esquema y el catalogo de Carezia'
supabase db reset
if ($LASTEXITCODE -ne 0) { Alto 'Fallo la aplicacion de las migraciones.' }
Ok 'Esquema, ajustes y los 60 servicios cargados'

# ---------- variables de entorno ----------
Paso 'Escribiendo apps\web\.env.local'

$estado = supabase status -o env
function Leer($clave) {
  $linea = $estado | Select-String -Pattern "^$clave=" | Select-Object -First 1
  if (-not $linea) { return '' }
  return ($linea.Line -replace "^$clave=", '') -replace '"', ''
}

$apiUrl  = Leer 'API_URL'
$anon    = Leer 'ANON_KEY'
$service = Leer 'SERVICE_ROLE_KEY'

if (-not $apiUrl -or -not $anon -or -not $service) {
  Alto "No pude leer las claves locales. Ejecuta 'supabase status' y copialas a mano en apps\web\.env.local"
}

if (Test-Path 'apps\web\.env.local') {
  $sello = Get-Date -Format 'yyyyMMddHHmmss'
  Copy-Item 'apps\web\.env.local' "apps\web\.env.local.respaldo-$sello"
  Nota 'Tu .env.local anterior quedo respaldado.'
}

@"
# Generado por scripts\local-setup.ps1 - base de datos local
NEXT_PUBLIC_SUPABASE_URL=$apiUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_ROLE_KEY=$service

# Sin pasarela: el cobro queda presencial.
PAYMENT_PROVIDER=

# Sin RESEND_API_KEY los correos no se envian: quedan en el log de la consola.
RESEND_API_KEY=
EMAIL_FROM=Carezia <hola@carezia.cl>

CRON_SECRET=secreto-local
"@ | Set-Content -Encoding UTF8 'apps\web\.env.local'
Ok 'Variables escritas'

@"
# Generado por scripts\local-setup.ps1
EXPO_PUBLIC_SUPABASE_URL=$apiUrl
EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon
EXPO_PUBLIC_API_URL=http://localhost:3000
"@ | Set-Content -Encoding UTF8 'apps\mobile\.env'
Ok 'Variables de la app movil escritas'

# ---------- listo ----------
Write-Host ''
Write-Host '===============================================' -ForegroundColor Green
Write-Host '  Carezia esta lista para correr en tu maquina' -ForegroundColor Green
Write-Host '===============================================' -ForegroundColor Green
Write-Host ''
Write-Host @'
  Arranca la web:
      npm run dev            -> http://localhost:3000

  Para entrar al panel de administracion:
      1. Abre http://localhost:3000/ingresar y pon cualquier correo.
      2. El correo NO sale a internet: abrelo en http://localhost:54324
      3. Hazte administrador con:
             npm run local:admin tucorreo@ejemplo.cl
      4. Entra a http://localhost:3000/admin

  Otras cosas utiles:
      npm test               -> los 55 tests
      http://localhost:54323 -> ver la base de datos en el navegador
      npm run local:stop     -> apaga la base de datos
'@
