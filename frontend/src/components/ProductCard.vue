<script setup lang="ts">
import type { Product } from '../interfaces/product'

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  detail: [id: number]
}>()
</script>

<template>
  <article class="card-soft group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
    <div class="relative aspect-[4/3] overflow-hidden">
      <img
        :src="product.image_url"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <span class="absolute left-3 top-3 rounded-full bg-deep-black/80 px-3 py-1 text-xs font-semibold text-industrial-yellow">
        {{ product.category }}
      </span>
    </div>

    <div class="space-y-3 p-5">
      <h3 class="line-clamp-1 text-lg font-bold text-deep-black">{{ product.name }}</h3>
      <p class="line-clamp-2 text-sm text-neutral-600">
        {{ product.description }}
      </p>
      <div class="flex items-center justify-between pt-1">
        <p class="text-xl font-extrabold text-deep-black">${{ product.price.toLocaleString('es-AR') }}</p>
        <button class="btn-primary px-4 py-2 text-sm" @click="emit('detail', product.id)">
          Ver detalle
        </button>
      </div>
    </div>
  </article>
</template>
