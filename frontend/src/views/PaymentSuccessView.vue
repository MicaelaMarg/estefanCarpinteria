<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const cart = useCartStore()

onMounted(() => {
  const collection = String(route.query.collection_status ?? '')
  const paymentStatus = String(route.query.status ?? '')
  if (collection === 'approved' || paymentStatus === 'approved') {
    cart.clear()
  }
})
</script>

<template>
  <div class="section-container pb-24 pt-28">
    <div class="card-soft mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 class="text-2xl font-extrabold text-soft-white">Pago exitoso</h1>
      <p class="text-sm text-neutral-300">
        Gracias por tu compra. El pedido se confirma cuando Mercado Pago notifica al servidor; si algo
        tarda unos segundos, no hace falta volver a pagar.
      </p>
      <p v-if="route.query.external_reference" class="text-xs text-neutral-500">
        Referencia de pedido: {{ route.query.external_reference }}
      </p>
      <RouterLink to="/catalogo" class="btn-primary inline-block px-6 py-3 text-sm">Volver al catálogo</RouterLink>
    </div>
  </div>
</template>
