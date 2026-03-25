<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue3-toastify'
import {
  getShippingOptions,
  postCheckout,
  type ShippingMode,
  type ShippingModeOption,
} from '../api/checkout'
import { useCartStore } from '../stores/cart'
import { resolveMediaUrl } from '../utils/mediaUrl'

const cart = useCartStore()
const paying = ref(false)
const deliveryName = ref('')
const deliveryPhone = ref('')
const deliveryAddress = ref('')
const deliveryNotes = ref('')
const shippingModes = ref<ShippingModeOption[]>([
  { id: 'pickup', label: 'Retiro en taller', price: 0, description: '' },
])
const shipping = ref<ShippingMode>('pickup')

onMounted(async () => {
  try {
    const { modes } = await getShippingOptions()
    if (modes?.length) shippingModes.value = modes
  } catch {
    /* fallback: solo retiro */
  }
})

const shippingPrice = computed(() => {
  const m = shippingModes.value.find((x) => x.id === shipping.value)
  return m?.price ?? 0
})

const grandTotal = computed(() => cart.total + shippingPrice.value)

async function goToMercadoPago() {
  if (cart.lines.length === 0) return
  if (shipping.value === 'delivery') {
    const digits = deliveryPhone.value.replace(/\D/g, '')
    if (digits.length < 6) {
      toast.error('Indicá un teléfono de contacto para el envío.')
      return
    }
    if (deliveryAddress.value.trim().length < 8) {
      toast.error('Indicá la dirección completa (calle, número y localidad).')
      return
    }
  }
  paying.value = true
  try {
    const items = cart.lines.map((l) => ({ id: l.productId, quantity: l.quantity }))
    const details =
      shipping.value === 'delivery'
        ? {
            contact_name: deliveryName.value.trim() || undefined,
            phone: deliveryPhone.value.trim(),
            address: deliveryAddress.value.trim(),
            notes: deliveryNotes.value.trim() || undefined,
          }
        : undefined
    const { init_point } = await postCheckout(items, shipping.value, details)
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

    <div v-else class="grid gap-8 lg:grid-cols-[1fr_minmax(300px,420px)]">
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
        <div class="space-y-3 border-b border-white/10 pb-4">
          <p class="text-sm font-semibold text-soft-white">Entrega</p>
          <label
            v-for="mode in shippingModes"
            :key="mode.id"
            class="flex cursor-pointer gap-3 rounded-lg border border-white/15 p-3 transition-colors has-[:checked]:border-industrial-yellow has-[:checked]:bg-white/5"
          >
            <input
              v-model="shipping"
              type="radio"
              name="shipping"
              :value="mode.id"
              class="mt-1 accent-industrial-yellow"
            />
            <span class="min-w-0 text-sm">
              <span class="font-semibold text-soft-white">{{ mode.label }}</span>
              <span v-if="mode.price > 0" class="ml-2 text-industrial-yellow">
                + ${{ mode.price.toLocaleString('es-AR') }}
              </span>
              <span v-if="mode.description" class="mt-1 block text-xs text-neutral-400">
                {{ mode.description }}
              </span>
            </span>
          </label>
        </div>

        <div
          v-if="shipping === 'delivery'"
          class="space-y-3 border-b border-white/10 pb-4"
        >
          <p class="text-sm font-semibold text-soft-white">Datos del envío</p>
          <label class="block text-xs text-neutral-400">
            Nombre y apellido (opcional)
            <input
              v-model="deliveryName"
              type="text"
              autocomplete="name"
              class="input-inferno mt-1 w-full px-3 py-2 text-sm text-soft-white"
              placeholder="Quien recibe"
            />
          </label>
          <label class="block text-xs text-neutral-400">
            Teléfono <span class="text-inferno-red">*</span>
            <input
              v-model="deliveryPhone"
              type="tel"
              autocomplete="tel"
              class="input-inferno mt-1 w-full px-3 py-2 text-sm text-soft-white"
              placeholder="Ej. 11 2345-6789"
            />
          </label>
          <label class="block text-xs text-neutral-400">
            Dirección completa <span class="text-inferno-red">*</span>
            <textarea
              v-model="deliveryAddress"
              rows="3"
              class="input-inferno mt-1 w-full resize-y px-3 py-2 text-sm text-soft-white"
              placeholder="Calle, número, piso/depto, barrio, CP, localidad"
            />
          </label>
          <label class="block text-xs text-neutral-400">
            Observaciones (opcional)
            <input
              v-model="deliveryNotes"
              type="text"
              class="input-inferno mt-1 w-full px-3 py-2 text-sm text-soft-white"
              placeholder="Horario, referencias, etc."
            />
          </label>
        </div>

        <p class="text-sm text-neutral-400">Subtotal productos</p>
        <p class="text-lg font-bold text-soft-white">${{ cart.total.toLocaleString('es-AR') }}</p>
        <p v-if="shippingPrice > 0" class="text-sm text-neutral-400">
          Envío
          <span class="font-semibold text-soft-white"> +${{ shippingPrice.toLocaleString('es-AR') }} </span>
        </p>
        <p class="text-sm text-neutral-400">Total estimado</p>
        <p class="text-2xl font-black text-industrial-yellow">
          ${{ grandTotal.toLocaleString('es-AR') }}
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
