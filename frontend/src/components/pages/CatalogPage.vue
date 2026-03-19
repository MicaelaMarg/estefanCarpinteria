<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductGrid from '../ProductGrid.vue'
import { useProducts } from '../../composables/useProducts'
import type { ProductFilters } from '../../interfaces/product'

const route = useRoute()
const router = useRouter()
const isModalOpen = ref(false)

const { products, loading, page, totalPages, filters, selectedProduct, fetchProducts, fetchProductById, setPage, applyFilters } =
  useProducts()

const openDetail = async (id: number) => {
  await fetchProductById(id)
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
  <div class="bg-soft-white pb-16">
    <ProductGrid
      :products="products"
      :loading="loading"
      :page="page"
      :total-pages="totalPages"
      :filters="filters"
      @apply-filters="handleFilters"
      @set-page="setPage"
      @view-detail="openDetail"
    />
  </div>

  <div
    v-if="isModalOpen && selectedProduct"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    @click.self="closeDetail"
  >
    <article class="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl">
      <img
        :src="selectedProduct.image_url"
        :alt="selectedProduct.name"
        class="h-72 w-full object-cover"
        loading="lazy"
      />
      <div class="space-y-4 p-6">
        <p class="inline-flex rounded-full bg-industrial-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-deep-black">
          {{ selectedProduct.category }}
        </p>
        <h3 class="text-3xl font-extrabold text-deep-black">{{ selectedProduct.name }}</h3>
        <p class="text-neutral-700">{{ selectedProduct.description }}</p>
        <p class="text-2xl font-black text-deep-black">
          ${{ selectedProduct.price.toLocaleString('es-AR') }}
        </p>
        <button class="btn-primary px-5 py-2.5 text-sm" @click="closeDetail">Cerrar</button>
      </div>
    </article>
  </div>
</template>
