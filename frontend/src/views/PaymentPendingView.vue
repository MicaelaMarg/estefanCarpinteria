<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="section-container pb-24 pt-28">
    <div class="card-soft mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 class="text-2xl font-extrabold text-soft-white">Pago pendiente</h1>
      <p class="text-sm text-neutral-300">
        Mercado Pago está procesando el pago (por ejemplo efectivo o transferencia). Te avisaremos o
        podés revisar el estado en tu cuenta de Mercado Pago.
      </p>
      <RouterLink to="/catalogo" class="btn-primary inline-block px-6 py-3 text-sm">Volver al inicio</RouterLink>
    </div>
  </div>
</template>
