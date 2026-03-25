<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="section-container pb-24 pt-28">
    <div class="card-soft mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 class="text-2xl font-extrabold text-soft-white">No se completó el pago</h1>
      <p class="text-sm text-neutral-300">
        Podés revisar el medio de pago o intentar de nuevo. Tu carrito se mantiene para que reintentes
        cuando quieras.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <RouterLink to="/carrito" class="btn-primary px-6 py-3 text-sm">Ir al carrito</RouterLink>
        <RouterLink to="/catalogo" class="rounded-lg border border-white/25 px-6 py-3 text-sm text-soft-white">
          Catálogo
        </RouterLink>
      </div>
    </div>
  </div>
</template>
