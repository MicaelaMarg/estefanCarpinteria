<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Product, ProductFilters } from '../interfaces/product'
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  products: Product[]
  loading: boolean
  page: number
  totalPages: number
  filters: ProductFilters
}>()

const emit = defineEmits<{
  applyFilters: [filters: ProductFilters]
  setPage: [page: number]
  viewDetail: [id: number]
}>()

const localFilters = reactive<ProductFilters>({
  q: props.filters.q,
  category: props.filters.category,
  minPrice: props.filters.minPrice,
  maxPrice: props.filters.maxPrice,
})

watch(
  () => props.filters,
  (next) => {
    localFilters.q = next.q
    localFilters.category = next.category
    localFilters.minPrice = next.minPrice
    localFilters.maxPrice = next.maxPrice
  },
  { deep: true },
)

const handleApply = () => {
  emit('applyFilters', { ...localFilters })
}
</script>

<template>
  <section class="section-container py-14">
    <header class="mb-8 flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div>
        <h2 class="text-3xl font-extrabold text-deep-black">Catalogo de productos</h2>
        <p class="mt-2 text-sm text-neutral-600">
          Encontra muebles y piezas a medida con terminaciones de alta calidad.
        </p>
      </div>
      <div class="grid gap-3 md:grid-cols-4">
        <input
          v-model="localFilters.q"
          type="text"
          placeholder="Buscar producto..."
          class="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-industrial-yellow focus:ring-2"
        />
        <select
          v-model="localFilters.category"
          class="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-industrial-yellow focus:ring-2"
        >
          <option value="">Todas las categorias</option>
          <option value="Tranqueras">Tranqueras</option>
          <option value="Bajo parrilla">Bajo parrilla</option>
          <option value="Pergolas">Pergolas</option>
          <option value="Cesto de basura">Cesto de basura</option>
          <option value="Barandas">Barandas</option>
        </select>
        <input
          v-model.number="localFilters.minPrice"
          type="number"
          min="0"
          placeholder="Precio minimo"
          class="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-industrial-yellow focus:ring-2"
        />
        <input
          v-model.number="localFilters.maxPrice"
          type="number"
          min="0"
          placeholder="Precio maximo"
          class="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none ring-industrial-yellow focus:ring-2"
        />
      </div>
      <div>
        <button class="btn-primary px-5 py-2.5 text-sm" @click="handleApply">Aplicar filtros</button>
      </div>
    </header>

    <div v-if="loading" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in 6" :key="n" class="card-soft animate-pulse overflow-hidden">
        <div class="h-52 bg-neutral-200" />
        <div class="space-y-3 p-5">
          <div class="h-5 w-2/3 rounded bg-neutral-200" />
          <div class="h-4 w-full rounded bg-neutral-100" />
          <div class="h-4 w-1/2 rounded bg-neutral-100" />
          <div class="h-9 w-1/3 rounded bg-neutral-200" />
        </div>
      </div>
    </div>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @detail="emit('viewDetail', $event)"
      />
    </div>

    <div class="mt-10 flex items-center justify-center gap-2">
      <button
        :disabled="page <= 1"
        class="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
        @click="emit('setPage', page - 1)"
      >
        Anterior
      </button>
      <span class="rounded-lg bg-deep-black px-4 py-2 text-sm font-semibold text-soft-white">
        Pagina {{ page }} de {{ totalPages }}
      </span>
      <button
        :disabled="page >= totalPages"
        class="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
        @click="emit('setPage', page + 1)"
      >
        Siguiente
      </button>
    </div>
  </section>
</template>