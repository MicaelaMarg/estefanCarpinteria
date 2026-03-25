<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import ProductGrid from '../ProductGrid.vue'
import { useProducts } from '../../composables/useProducts'
import type { Product, ProductFilters } from '../../interfaces/product'
import { useCartStore } from '../../stores/cart'
import { resolveMediaUrl } from '../../utils/mediaUrl'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const isModalOpen = ref(false)
const modalQty = ref(1)

const { products, loading, page, totalPages, filters, selectedProduct, fetchProducts, fetchProductById, setPage, applyFilters } =
  useProducts()

const openDetail = async (id: number) => {
  await fetchProductById(id)
  modalQty.value = 1
  isModalOpen.value = true
  await router.replace({ query: { ...route.query, producto: String(id) } })
}

const closeDetail = async () => {
  isModalOpen.value = false
  selectedProduct.value = null
  const { producto, ...rest } = route.query
  await router.replace({ query: rest })
}

const handleFilters = async (nextFilters: ProductFilters) => {
  await applyFilters(nextFilters)
}

const addFromGrid = (product: Product) => {
  const r = cart.addProduct(product, 1)
  if (!r.ok) {
    if (r.reason === 'sin_stock') toast.error('Sin stock disponible.')
    else toast.error(`No podés agregar más. Stock disponible: ${r.max}.`)
    return
  }
  toast.success('Agregado al carrito')
}

const addFromModal = () => {
  if (!selectedProduct.value) return
  const r = cart.addProduct(selectedProduct.value, modalQty.value)
  if (!r.ok) {
    if (r.reason === 'sin_stock') toast.error('Sin stock disponible.')
    else toast.error(`Cantidad no válida. Stock: ${r.max}.`)
    return
  }
  toast.success('Agregado al carrito')
}

watch(
  () => route.query.producto,
  async (value) => {
    if (!value) return
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return
    await openDetail(parsed)
  },
)

onMounted(async () => {
  await fetchProducts()

  const productQuery = Number(route.query.producto)
  if (!Number.isNaN(productQuery) && productQuery > 0) {
    await openDetail(productQuery)
  }
})
</script>

<template>
  <div class="pb-16">
    <ProductGrid
      :products="products"
      :loading="loading"
      :page="page"
      :total-pages="totalPages"
      :filters="filters"
      @apply-filters="handleFilters"
      @set-page="setPage"
      @view-detail="openDetail"
      @add-to-cart="addFromGrid"
    />
  </div>

  <div
    v-if="isModalOpen && selectedProduct"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    @click.self="closeDetail"
  >
    <article class="card-light max-h-[90vh] w-full max-w-3xl overflow-auto">
      <img
        :src="resolveMediaUrl(selectedProduct.image_url)"
        :alt="selectedProduct.name"
        class="h-72 w-full object-cover"
        loading="lazy"
      />
      <div class="space-y-4 p-6">
        <p
          class="inline-flex rounded-full bg-gradient-to-r from-inferno-orange to-inferno-red px-3 py-1 text-xs font-bold uppercase tracking-wide text-deep-black"
        >
          {{ selectedProduct.category }}
        </p>
        <h3 class="text-3xl font-extrabold text-soft-white">{{ selectedProduct.name }}</h3>
        <p class="text-neutral-300">{{ selectedProduct.description }}</p>
        <p class="text-2xl font-black text-industrial-yellow">
          ${{ selectedProduct.price.toLocaleString('es-AR') }}
        </p>
        <p class="text-sm text-neutral-400">
          <span class="font-semibold text-soft-white">Disponible:</span>
          {{ Number(selectedProduct.stock_disponible ?? 0) }} unid.
          <span v-if="Number(selectedProduct.stock_disponible ?? 0) === 0" class="ml-2 font-semibold text-red-400">
            Sin stock
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-neutral-300">
            Cantidad
            <input
              v-model.number="modalQty"
              type="number"
              min="1"
              :max="Math.max(1, Number(selectedProduct.stock_disponible ?? 1))"
              class="input-inferno w-20 px-2 py-2 text-center text-sm"
            />
          </label>
          <button
            type="button"
            class="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
            :disabled="Number(selectedProduct.stock_disponible ?? 0) === 0"
            @click="addFromModal"
          >
            Agregar al carrito
          </button>
          <button type="button" class="rounded-lg border border-white/20 px-5 py-2.5 text-sm" @click="closeDetail">
            Cerrar
          </button>
        </div>
      </div>
    </article>
  </div>
</template>
