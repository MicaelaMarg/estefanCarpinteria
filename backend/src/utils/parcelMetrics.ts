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
const DEFAULT_WEIGHT_G = 1000
const DEFAULT_HEIGHT_CM = 10
const DEFAULT_WIDTH_CM = 20
const DEFAULT_LENGTH_CM = 30

function clampPositiveInt(value: number, fallback: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function buildParcelMetrics(lines: ProductParcelInput[]): ParcelMetrics {
  if (lines.length === 0) {
    return {
      weightG: DEFAULT_WEIGHT_G,
      heightCm: DEFAULT_HEIGHT_CM,
      widthCm: DEFAULT_WIDTH_CM,
      lengthCm: DEFAULT_LENGTH_CM,
    }
  }

  let weightG = 0
  let heightCm = 0
  let widthCm = 0
  let lengthCm = 0

  for (const line of lines) {
    const quantity = clampPositiveInt(line.quantity, 1)
    const productWeight = clampPositiveInt(line.shipping_weight_g, DEFAULT_WEIGHT_G)
    const productHeight = clampPositiveInt(line.shipping_height_cm, DEFAULT_HEIGHT_CM)
    const productWidth = clampPositiveInt(line.shipping_width_cm, DEFAULT_WIDTH_CM)
    const productLength = clampPositiveInt(line.shipping_length_cm, DEFAULT_LENGTH_CM)

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
