<script setup lang="ts">
import type { Product } from '../interfaces/product'
import { resolveMediaUrl } from '../utils/mediaUrl'

const props = defineProps<{
  product: Product
}>()

const disponible = () => Number(props.product.stock_disponible ?? 0)

const emit = defineEmits<{
  detail: [id: number]
  addToCart: [product: Product]
}>()
</script>

<template>
  <article class="card-soft group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
    <div class="relative aspect-[4/3] overflow-hidden">
      <img
        :src="resolveMediaUrl(product.image_url)"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <span class="absolute left-3 top-3 rounded-full bg-deep-black/80 px-3 py-1 text-xs font-semibold text-industrial-yellow">
        {{ product.category }}
      </span>
      <span
        v-if="disponible() === 0"
        class="absolute right-3 top-3 rounded-full bg-red-600/95 px-3 py-1 text-xs font-bold text-white"
      >
        Sin stock
      </span>
      <span
        v-else
        class="absolute right-3 top-3 rounded-full bg-deep-black/80 px-3 py-1 text-xs font-semibold text-soft-white"
      >
        Quedan {{ disponible() }}
      </span>
    </div>

    <div class="space-y-3 p-5">
      <h3 class="line-clamp-1 text-lg font-bold text-soft-white">{{ product.name }}</h3>
      <p class="line-clamp-2 text-sm text-neutral-300">
        {{ product.description }}
      </p>
      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p class="text-xl font-extrabold text-industrial-yellow">${{ product.price.toLocaleString('es-AR') }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-soft-white transition hover:border-industrial-yellow hover:text-industrial-yellow disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="disponible() === 0"
            @click="emit('addToCart', product)"
          >
            Al carrito
          </button>
          <button type="button" class="btn-primary px-4 py-2 text-sm" @click="emit('detail', product.id)">
            Ver detalle
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
