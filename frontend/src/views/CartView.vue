<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { postCheckout } from '../api/checkout'
import { useCartStore } from '../stores/cart'
import { resolveMediaUrl } from '../utils/mediaUrl'

const cart = useCartStore()
const paying = ref(false)

async function goToMercadoPago() {
  if (cart.lines.length === 0) return
  paying.value = true
  try {
    const items = cart.lines.map((l) => ({ id: l.productId, quantity: l.quantity }))
    const { init_point } = await postCheckout(items)
    window.location.href = init_point
  } catch {
    /* toast vía interceptor */
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="section-container pb-24 pt-28">
    <header class="mb-10">
      <h1 class="text-3xl font-extrabold text-soft-white">Carrito</h1>
      <p class="mt-2 text-sm text-neutral-400">
        Los precios y el stock se confirman en el servidor al pagar.
      </p>
    </header>

    <div v-if="cart.lines.length === 0" class="card-soft p-8 text-center text-neutral-300">
      <p>Todavía no agregaste productos.</p>
      <RouterLink to="/catalogo" class="btn-primary mt-6 inline-block px-5 py-2.5 text-sm">
        Ir al catálogo
      </RouterLink>
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul class="space-y-4">
        <li
          v-for="line in cart.lines"
          :key="line.productId"
          class="card-soft flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
        >
          <img
            :src="resolveMediaUrl(line.image_url)"
            :alt="line.name"
            class="h-24 w-full rounded object-cover sm:h-20 sm:w-28"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <p class="font-bold text-soft-white">{{ line.name }}</p>
            <p class="text-sm text-industrial-yellow">
              ${{ line.price.toLocaleString('es-AR') }} c/u
            </p>
          </div>
          <div class="flex items-center gap-3">
            <label class="sr-only">Cantidad</label>
            <input
              :value="line.quantity"
              type="number"
              min="1"
              max="99"
              class="input-inferno w-20 px-2 py-2 text-center text-sm"
              @input="
                cart.setQuantity(
                  line.productId,
                  Number(($event.target as HTMLInputElement).value) || 0,
                )
              "
            />
            <button
              type="button"
              class="text-sm font-semibold text-red-400 hover:underline"
              @click="cart.removeLine(line.productId)"
            >
              Quitar
            </button>
          </div>
        </li>
      </ul>

      <aside class="card-soft h-fit space-y-4 p-6">
        <p class="text-sm text-neutral-400">Total estimado (frontend)</p>
        <p class="text-2xl font-black text-industrial-yellow">
          ${{ cart.total.toLocaleString('es-AR') }}
        </p>
        <button
          type="button"
          class="btn-primary w-full px-5 py-3 text-sm font-bold disabled:opacity-60"
          :disabled="paying"
          @click="goToMercadoPago"
        >
          {{ paying ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago' }}
        </button>
        <p class="text-xs text-neutral-500">
          Serás redirigido al checkout seguro de Mercado Pago. El pedido queda pendiente hasta que el
          pago se acredite.
        </p>
      </aside>
    </div>
  </div>
</template>
