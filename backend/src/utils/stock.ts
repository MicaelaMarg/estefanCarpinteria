/** Unidades vendidas (estimación manual): mercadería cargada − disponible ahora */
export function stockVendido(stockCargado: number, stockDisponible: number): number {
  const c = Number(stockCargado) || 0
  const d = Number(stockDisponible) || 0
  return Math.max(0, c - d)
}
