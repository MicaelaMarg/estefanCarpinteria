import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Product } from '../interfaces/product'

const STORAGE_KEY = 'ec_cart_v1'

export interface CartLine {
  productId: number
  quantity: number
  name: string
  price: number
  image_url: string
}

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CartLine[]) : []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>(loadLines())

  watch(
    lines,
    (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
      } catch {
        /* ignore quota */
      }
    },
    { deep: true },
  )

  const itemCount = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0))

  const total = computed(() =>
    lines.value.reduce((sum, l) => sum + l.price * l.quantity, 0),
  )

  function addProduct(product: Product, qty: number) {
    const stock = Math.max(0, Math.floor(Number(product.stock_disponible ?? 0)))
    if (stock <= 0 || qty < 1) return { ok: false as const, reason: 'sin_stock' as const }
    const add = Math.min(qty, stock, 99)
    const i = lines.value.findIndex((l) => l.productId === product.id)
    if (i >= 0) {
      const nextQty = lines.value[i].quantity + add
      if (nextQty > stock) {
        return { ok: false as const, reason: 'stock' as const, max: stock }
      }
      lines.value[i].quantity = Math.min(nextQty, 99)
    } else {
      lines.value.push({
        productId: product.id,
        quantity: add,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      })
    }
    return { ok: true as const }
  }

  function setQuantity(productId: number, quantity: number) {
    const i = lines.value.findIndex((l) => l.productId === productId)
    if (i < 0) return
    if (quantity <= 0) {
      lines.value.splice(i, 1)
      return
    }
    lines.value[i].quantity = Math.min(99, Math.floor(quantity))
  }

  function removeLine(productId: number) {
    lines.value = lines.value.filter((l) => l.productId !== productId)
  }

  function clear() {
    lines.value = []
  }

  return { lines, itemCount, total, addProduct, setQuantity, removeLine, clear }
})
