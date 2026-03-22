export function stockVendido(cargado: number, disponible: number): number {
  const c = Number(cargado) || 0
  const d = Number(disponible) || 0
  return Math.max(0, c - d)
}
