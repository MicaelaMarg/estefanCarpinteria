<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
  document.body.style.overflow = 'hidden'
  await router.replace({ query: { ...route.query, producto: String(id) } })
}

const closeDetail = async () => {
  isModalOpen.value = false
  selectedProduct.value = null
  document.body.style.overflow = ''
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

const onEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isModalOpen.value) void closeDetail()
}

onMounted(async () => {
  await fetchProducts()

  const productQuery = Number(route.query.producto)
  if (!Number.isNaN(productQuery) && productQuery > 0) {
    await openDetail(productQuery)
  }
  window.addEventListener('keydown', onEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
  document.body.style.overflow = ''
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

  <Teleport to="body">
    <div
      v-if="isModalOpen && selectedProduct"
      class="fixed inset-0 z-[100] flex bg-black/70 max-md:items-end md:items-center md:justify-center md:p-4 md:pt-24"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedProduct.name"
      @click.self="closeDetail"
    >
      <!-- Móvil: panel tipo hoja desde abajo + barra de acción fija. Desktop: modal centrado. -->
      <article
        class="card-light flex max-h-[min(92dvh,100vh)] w-full max-w-3xl flex-col overflow-hidden shadow-2xl max-md:max-h-[min(94dvh,100dvh)] max-md:rounded-b-none max-md:rounded-t-2xl md:max-h-[min(90vh,900px)]"
        @click.stop
      >
        <div class="relative shrink-0">
          <button
            type="button"
            class="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-lg text-soft-white backdrop-blur-sm transition hover:bg-black/75 md:hidden"
            aria-label="Cerrar"
            @click="closeDetail"
          >
            ✕
          </button>
          <div
            class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/25 md:hidden"
            aria-hidden="true"
          />
          <img
            :src="resolveMediaUrl(selectedProduct.image_url)"
            :alt="selectedProduct.name"
            class="h-44 w-full object-cover sm:h-52 md:h-72"
            loading="lazy"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4 md:px-6 md:pb-2 md:pt-2">
          <p
            class="inline-flex rounded-full bg-gradient-to-r from-inferno-orange to-inferno-red px-3 py-1 text-xs font-bold uppercase tracking-wide text-deep-black"
          >
            {{ selectedProduct.category }}
          </p>
          <h3 class="mt-3 text-xl font-extrabold leading-tight text-soft-white sm:text-2xl md:text-3xl">
            {{ selectedProduct.name }}
          </h3>
          <p class="mt-3 text-sm leading-relaxed text-neutral-300 md:text-base">{{ selectedProduct.description }}</p>
          <p class="mt-4 text-2xl font-black text-industrial-yellow md:text-3xl">
            ${{ selectedProduct.price.toLocaleString('es-AR') }}
          </p>
          <p class="mt-2 text-sm text-neutral-400">
            <span class="font-semibold text-soft-white">Disponible:</span>
            {{ Number(selectedProduct.stock_disponible ?? 0) }} unid.
            <span v-if="Number(selectedProduct.stock_disponible ?? 0) === 0" class="ml-2 font-semibold text-red-400">
              Sin stock
            </span>
          </p>
        </div>

        <div
          class="shrink-0 border-t border-white/10 bg-[rgba(10,10,10,0.97)] px-5 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] md:bg-transparent md:px-6 md:py-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label class="flex items-center gap-2 text-sm text-neutral-300">
              Cantidad
              <input
                v-model.number="modalQty"
                type="number"
                inputmode="numeric"
                min="1"
                :max="Math.max(1, Number(selectedProduct.stock_disponible ?? 1))"
                class="input-inferno min-h-11 w-24 px-3 py-2 text-center text-base"
              />
            </label>
            <div class="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="btn-primary min-h-11 flex-1 px-5 py-3 text-sm font-bold disabled:opacity-50 sm:flex-none sm:px-6"
                :disabled="Number(selectedProduct.stock_disponible ?? 0) === 0"
                @click="addFromModal"
              >
                Agregar al carrito
              </button>
              <button
                type="button"
                class="hidden min-h-11 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-soft-white hover:border-industrial-yellow md:inline-flex md:items-center md:justify-center"
                @click="closeDetail"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </Teleport>
</template>
