/** Convierte un texto en un identificador para URL: "Limpieza facial" → "limpieza-facial". */
export function slugify(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
