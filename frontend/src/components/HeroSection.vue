<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <section class="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
    <!-- Sin foto: se ve el fondo fijo (madera + degradado) de App.vue -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-deep-black via-wood-ebony/75 to-wood-amber/15"
    />
    <div class="absolute inset-0 bg-black/30" />

    <div class="section-container absolute inset-0 flex flex-col items-start justify-center text-left">
      <p class="mb-4 rounded-full bg-industrial-yellow px-4 py-2 text-xs font-bold tracking-[0.16em] text-deep-black">
        CARPINTERIA PREMIUM
      </p>
      <h1 class="title-xl max-w-2xl text-5xl text-soft-white md:text-6xl">
        {{ title }}
      </h1>
      <p class="mt-6 max-w-xl text-base text-neutral-200 md:text-lg">
        {{ subtitle }}
      </p>
      <RouterLink to="/catalogo" class="btn-primary mt-8 inline-flex items-center gap-2 px-6 py-3">
        Ver catalogo
      </RouterLink>
    </div>
  </section>
</template>
