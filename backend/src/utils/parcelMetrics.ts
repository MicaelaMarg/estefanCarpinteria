export interface ParcelMetrics {
  weightG: number
  heightCm: number
  widthCm: number
  lengthCm: number
}

export interface ProductParcelInput {
  quantity: number
  shipping_weight_g: number
  shipping_height_cm: number
  shipping_width_cm: number
  shipping_length_cm: number
}

const MAX_WEIGHT_G = 25_000
const MAX_DIMENSION_CM = 150

function clampPositiveInt(value: number, fallback: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function buildParcelMetrics(lines: ProductParcelInput[]): ParcelMetrics {
  if (lines.length === 0) {
    return { weightG: 1000, heightCm: 10, widthCm: 20, lengthCm: 30 }
  }

  let weightG = 0
  let heightCm = 0
  let widthCm = 0
  let lengthCm = 0

  for (const line of lines) {
    const quantity = clampPositiveInt(line.quantity, 1)
    const productWeight = clampPositiveInt(line.shipping_weight_g, 1000)
    const productHeight = clampPositiveInt(line.shipping_height_cm, 10)
    const productWidth = clampPositiveInt(line.shipping_width_cm, 20)
    const productLength = clampPositiveInt(line.shipping_length_cm, 30)

    weightG += productWeight * quantity
    heightCm += productHeight * quantity
    widthCm = Math.max(widthCm, productWidth)
    lengthCm = Math.max(lengthCm, productLength)
  }

  return {
    weightG: Math.min(MAX_WEIGHT_G, Math.max(1, weightG)),
    heightCm: Math.min(MAX_DIMENSION_CM, Math.max(1, heightCm)),
    widthCm: Math.min(MAX_DIMENSION_CM, Math.max(1, widthCm)),
    lengthCm: Math.min(MAX_DIMENSION_CM, Math.max(1, lengthCm)),
  }
}
