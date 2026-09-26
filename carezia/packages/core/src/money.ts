/**
 * El precio se guarda como entero en la unidad mínima de la moneda.
 * CLP no usa decimales (45000 = $45.000); USD/EUR sí (4500 = $45,00).
 */
const DECIMALS: Record<string, number> = {
  CLP: 0,
  ARS: 2,
  MXN: 2,
  COP: 0,
  PEN: 2,
  USD: 2,
  EUR: 2,
}

const LOCALES: Record<string, string> = {
  CLP: 'es-CL',
  ARS: 'es-AR',
  MXN: 'es-MX',
  COP: 'es-CO',
  PEN: 'es-PE',
  USD: 'en-US',
  EUR: 'es-ES',
}

export function currencyDecimals(currency: string): number {
  return DECIMALS[currency.toUpperCase()] ?? 2
}

/** Entero en unidad mínima → texto legible. */
export function formatMoney(amount: number, currency = 'CLP'): string {
  const code = currency.toUpperCase()
  const decimals = currencyDecimals(code)
  return new Intl.NumberFormat(LOCALES[code] ?? 'es-CL', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount / 10 ** decimals)
}

/** Unidad mínima → unidad mayor, que es lo que esperan Stripe y Mercado Pago. */
export function toMajorUnits(amount: number, currency = 'CLP'): number {
  return amount / 10 ** currencyDecimals(currency)
}

/**
 * Stripe cobra en la unidad mínima, pero para monedas sin decimales
 * exige que el monto sea el entero de pesos tal cual.
 */
export function toStripeAmount(amount: number, _currency = 'CLP'): number {
  return Math.round(amount)
}

/** Ahorro de un paquete frente a comprar las sesiones sueltas. */
export function packageSavings(
  packagePrice: number,
  sessionPrice: number,
  sessions: number,
): { amount: number; percent: number } {
  const listPrice = sessionPrice * sessions
  const amount = Math.max(listPrice - packagePrice, 0)
  const percent = listPrice > 0 ? Math.round((amount / listPrice) * 100) : 0
  return { amount, percent }
}
