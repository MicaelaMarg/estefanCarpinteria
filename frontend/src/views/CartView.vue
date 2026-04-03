<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue3-toastify'
import {
  getShippingQuote,
  getShippingOptions,
  postCheckout,
  type ShippingMode,
  type ShippingModeOption,
  type ShippingQuoteRate,
  type ShippingQuoteResponse,
} from '../api/checkout'
import { useCartStore } from '../stores/cart'
import { resolveMediaUrl } from '../utils/mediaUrl'

const cart = useCartStore()
const paying = ref(false)
const deliveryName = ref('')
const deliveryPhone = ref('')
const deliveryAddress = ref('')
const deliveryNotes = ref('')
const deliveryPostalCode = ref('')
const loadingQuote = ref(false)
const errorQuote = ref('')
const shippingQuote = ref<ShippingQuoteResponse | null>(null)
const selectedQuoteKey = ref('')
const shippingModes = ref<ShippingModeOption[]>([
  { id: 'pickup', label: 'Retiro en taller', price: 0, description: '' },
])
const shipping = ref<ShippingMode>('pickup')
let quoteTimer: ReturnType<typeof setTimeout> | null = null
let latestQuoteRequest = 0

onMounted(async () => {
  try {
    const { modes } = await getShippingOptions()
    if (modes?.length) shippingModes.value = modes
  } catch {
    /* fallback: solo retiro */
  }
})

onUnmounted(() => {
  if (quoteTimer) clearTimeout(quoteTimer)
})

const fallbackShippingPrice = computed(() => {
  const m = shippingModes.value.find((x) => x.id === shipping.value)
  return m?.price ?? 0
})

function buildQuoteKey(rate: ShippingQuoteRate): string {
  return rate.id || [rate.delivered_type, rate.product_type, rate.product_name].join('|').toUpperCase()
}

const quoteRates = computed(() => {
  if (!shippingQuote.value) return []
  return shippingQuote.value.rates.length > 0
    ? shippingQuote.value.rates
    : [shippingQuote.value.selected_rate]
})

const selectedShippingRate = computed(() => {
  if (!shippingQuote.value) return null
  const exact = quoteRates.value.find((rate) => buildQuoteKey(rate) === selectedQuoteKey.value)
  return exact ?? shippingQuote.value.selected_rate ?? quoteRates.value[0] ?? null
})

const shippingPrice = computed(() => {
  if (shipping.value === 'correo_argentino') {
    return selectedShippingRate.value?.price ?? fallbackShippingPrice.value
  }
  return fallbackShippingPrice.value
})

const grandTotal = computed(() => cart.total + shippingPrice.value)

const needsShippingForm = computed(() => shipping.value === 'delivery' || shipping.value === 'correo_argentino')
const cartSnapshot = computed(() => cart.lines.map((line) => `${line.productId}:${line.quantity}`).join('|'))
const normalizedPostalCode = computed(() =>
  deliveryPostalCode.value.trim().toUpperCase().replace(/\s+/g, ''),
)
const selectedShippingLabel = computed(() => {
  if (shipping.value === 'correo_argentino' && selectedShippingRate.value) {
    return `Correo Argentino · ${selectedShippingRate.value.product_name}`
  }
  return shippingModes.value.find((mode) => mode.id === shipping.value)?.label ?? 'Entrega'
})

function resetQuoteState() {
  latestQuoteRequest += 1
  shippingQuote.value = null
  selectedQuoteKey.value = ''
  errorQuote.value = ''
  loadingQuote.value = false
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatTransitWindow(rate: ShippingQuoteRate) {
  const min = rate.delivery_time_min?.trim()
  const max = rate.delivery_time_max?.trim()
  if (min && max && min !== max) return `Entrega estimada entre ${min} y ${max} días hábiles.`
  if (min && max) return `Entrega estimada en ${min} días hábiles.`
  if (min) return `Entrega estimada desde ${min} días hábiles.`
  return 'Tiempo de entrega sujeto a validación del operador.'
}

function formatQuoteValidity(iso: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

async function loadCorreoQuote() {
  if (shipping.value !== 'correo_argentino') {
    resetQuoteState()
    return
  }
  if (cart.lines.length === 0 || normalizedPostalCode.value.length < 4) {
    resetQuoteState()
    return
  }

  loadingQuote.value = true
  errorQuote.value = ''
  const requestId = ++latestQuoteRequest
  try {
    const quote = await getShippingQuote(
      cart.lines.map((line) => ({ id: line.productId, quantity: line.quantity })),
      { postal_code: normalizedPostalCode.value },
    )
    if (requestId !== latestQuoteRequest) return
    shippingQuote.value = quote
    const firstRate = quote.selected_rate ?? quote.rates[0]
    selectedQuoteKey.value = firstRate ? buildQuoteKey(firstRate) : ''
  } catch (error) {
    if (requestId !== latestQuoteRequest) return
    resetQuoteState()
    errorQuote.value = 'No pudimos cotizar Correo Argentino ahora mismo. Probá de nuevo en unos segundos.'
    if (error instanceof Error) {
      console.error('[cart] shipping quote', error)
    }
  } finally {
    if (requestId !== latestQuoteRequest) return
    loadingQuote.value = false
  }
}

watch(
  [shipping, normalizedPostalCode, cartSnapshot],
  () => {
    if (quoteTimer) clearTimeout(quoteTimer)
    if (shipping.value !== 'correo_argentino') {
      resetQuoteState()
      return
    }
    if (normalizedPostalCode.value.length < 4 || cart.lines.length === 0) {
      resetQuoteState()
      return
    }
    quoteTimer = setTimeout(() => {
      void loadCorreoQuote()
    }, 350)
  },
  { immediate: true },
)

async function goToMercadoPago() {
  if (cart.lines.length === 0) return
  const needsAddress = shipping.value === 'delivery' || shipping.value === 'correo_argentino'
  if (needsAddress) {
    const digits = deliveryPhone.value.replace(/\D/g, '')
    if (digits.length < 6) {
      toast.error('Indicá un teléfono de contacto para el envío.')
      return
    }
    if (deliveryAddress.value.trim().length < 8) {
      toast.error('Indicá la dirección completa (calle, número, CP y localidad).')
      return
    }
  }
  if (shipping.value === 'correo_argentino') {
    if (normalizedPostalCode.value.length < 4) {
      toast.error('Ingresá un código postal para Correo Argentino.')
      return
    }
    if (loadingQuote.value) {
      toast.error('Esperá a que terminemos de cotizar el envío.')
      return
    }
    if (!selectedShippingRate.value) {
      toast.error('No hay una tarifa válida de Correo Argentino para continuar.')
      return
    }
  }
  paying.value = true
  try {
    const items = cart.lines.map((l) => ({ id: l.productId, quantity: l.quantity }))
    const details = needsAddress
      ? {
          contact_name: deliveryName.value.trim() || undefined,
          phone: deliveryPhone.value.trim(),
          address: deliveryAddress.value.trim(),
          notes: deliveryNotes.value.trim() || undefined,
          postal_code: shipping.value === 'correo_argentino' ? normalizedPostalCode.value : undefined,
          quote_rate:
            shipping.value === 'correo_argentino' && selectedShippingRate.value
              ? {
                  rate_id: selectedShippingRate.value.id,
                  delivered_type: selectedShippingRate.value.delivered_type,
                  product_type: selectedShippingRate.value.product_type,
                  product_name: selectedShippingRate.value.product_name,
                }
              : undefined,
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
    <header class="mb-10 space-y-5">
      <nav class="grid gap-4 rounded-3xl border border-white/10 bg-white/4 px-4 py-4 sm:grid-cols-3 sm:px-8">
        <div class="flex items-center gap-3 text-sm text-neutral-300">
          <span class="flex h-10 w-10 items-center justify-center rounded-full border border-industrial-yellow/70 bg-industrial-yellow/12 font-semibold text-industrial-yellow">
            1
          </span>
          <div>
            <p class="font-semibold text-soft-white">Carrito</p>
            <p class="text-xs text-neutral-500">Confirmá tus productos</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm text-neutral-300">
          <span class="flex h-10 w-10 items-center justify-center rounded-full border border-industrial-yellow bg-industrial-yellow text-deep-black font-black">
            2
          </span>
          <div>
            <p class="font-semibold text-soft-white">Entrega</p>
            <p class="text-xs text-neutral-500">Elegí envío y completá los datos</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm text-neutral-500">
          <span class="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/4 font-semibold">
            3
          </span>
          <div>
            <p class="font-semibold">Pago</p>
            <p class="text-xs">Mercado Pago</p>
          </div>
        </div>
      </nav>
      <div>
        <h1 class="text-3xl font-extrabold text-soft-white">Finalizar compra</h1>
        <p class="mt-2 text-sm text-neutral-400">
          El stock se valida en el servidor y, si elegís Correo Argentino, confirmamos la tarifa vigente antes del
          pago.
        </p>
      </div>
    </header>

    <div v-if="cart.lines.length === 0" class="card-soft p-8 text-center text-neutral-300">
      <p>Todavía no agregaste productos.</p>
      <RouterLink to="/catalogo" class="btn-primary mt-6 inline-block px-5 py-2.5 text-sm">
        Ir al catálogo
      </RouterLink>
    </div>

    <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="card-soft space-y-8 p-6 md:p-8">
        <div class="space-y-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-industrial-yellow">Datos de contacto</p>
            <h2 class="mt-2 text-2xl font-black text-soft-white">Prepará la entrega</h2>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block text-sm text-neutral-300">
              Nombre y apellido
              <input
                v-model="deliveryName"
                type="text"
                autocomplete="name"
                class="input-inferno mt-2 w-full px-4 py-3 text-sm text-soft-white"
                placeholder="Quién recibe el pedido"
              />
            </label>
            <label class="block text-sm text-neutral-300">
              Teléfono <span v-if="needsShippingForm" class="text-inferno-red">*</span>
              <input
                v-model="deliveryPhone"
                type="tel"
                autocomplete="tel"
                class="input-inferno mt-2 w-full px-4 py-3 text-sm text-soft-white"
                placeholder="Ej. 11 2345-6789"
              />
            </label>
          </div>
        </div>

        <div class="space-y-4 border-t border-white/10 pt-8">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-industrial-yellow">Entrega</p>
            <h3 class="mt-2 text-xl font-bold text-soft-white">Elegí cómo querés recibirlo</h3>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <label
              v-for="mode in shippingModes"
              :key="mode.id"
              class="flex min-h-36 cursor-pointer flex-col justify-between rounded-2xl border border-white/12 bg-white/3 p-4 transition has-[:checked]:border-industrial-yellow has-[:checked]:bg-industrial-yellow/8"
            >
              <div class="flex items-start justify-between gap-3">
                <input
                  v-model="shipping"
                  type="radio"
                  name="shipping"
                  :value="mode.id"
                  class="mt-1 accent-industrial-yellow"
                />
                <span
                  v-if="mode.price > 0 && mode.id !== 'correo_argentino'"
                  class="text-sm font-semibold text-industrial-yellow"
                >
                  {{ formatMoney(mode.price) }}
                </span>
                <span
                  v-else-if="mode.id === 'correo_argentino' && mode.price > 0"
                  class="text-xs font-semibold uppercase tracking-wide text-neutral-400"
                >
                  respaldo
                </span>
              </div>
              <div class="mt-4">
                <p class="font-semibold text-soft-white">{{ mode.label }}</p>
                <p class="mt-2 text-sm leading-6 text-neutral-400">
                  {{ mode.description }}
                </p>
              </div>
            </label>
          </div>

          <div v-if="needsShippingForm" class="grid gap-4 md:grid-cols-5">
            <label
              v-if="shipping === 'correo_argentino'"
              class="block text-sm text-neutral-300 md:col-span-2"
            >
              Código postal <span class="text-inferno-red">*</span>
              <input
                v-model="deliveryPostalCode"
                type="text"
                autocomplete="postal-code"
                class="input-inferno mt-2 w-full px-4 py-3 text-sm text-soft-white"
                placeholder="Ej. B7600 o 7600"
              />
            </label>
            <label class="block text-sm text-neutral-300" :class="shipping === 'correo_argentino' ? 'md:col-span-3' : 'md:col-span-5'">
              Dirección completa <span class="text-inferno-red">*</span>
              <textarea
                v-model="deliveryAddress"
                rows="3"
                class="input-inferno mt-2 w-full resize-y px-4 py-3 text-sm text-soft-white"
                placeholder="Calle, número, piso/depto, barrio, localidad"
              />
            </label>
            <label class="block text-sm text-neutral-300 md:col-span-5">
              Observaciones
              <input
                v-model="deliveryNotes"
                type="text"
                class="input-inferno mt-2 w-full px-4 py-3 text-sm text-soft-white"
                placeholder="Horario, referencias o detalles útiles para el envío"
              />
            </label>
          </div>

          <div
            v-if="shipping === 'pickup'"
            class="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4 text-sm text-emerald-100"
          >
            Retiro en taller sin costo. Apenas se acredite el pago coordinamos fecha y horario por WhatsApp.
          </div>

          <div
            v-else-if="shipping === 'delivery'"
            class="rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-neutral-300"
          >
            Este envío usa la tarifa fija del taller. Si querés un valor calculado por operador, elegí Correo
            Argentino.
          </div>

          <div v-else class="space-y-3">
            <div class="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-soft-white">Tarifas de Correo Argentino</p>
                  <p class="mt-1 text-sm text-neutral-400">
                    Ingresá el código postal y te mostramos las opciones vigentes para este carrito.
                  </p>
                </div>
                <button
                  type="button"
                  class="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-soft-white transition hover:border-industrial-yellow hover:text-industrial-yellow disabled:opacity-50"
                  :disabled="loadingQuote || normalizedPostalCode.length < 4"
                  @click="loadCorreoQuote"
                >
                  {{ loadingQuote ? 'Cotizando…' : 'Actualizar tarifas' }}
                </button>
              </div>
            </div>

            <div v-if="errorQuote" class="rounded-2xl border border-red-400/25 bg-red-500/8 p-4 text-sm text-red-100">
              {{ errorQuote }}
            </div>

            <div v-else-if="loadingQuote" class="rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-neutral-300">
              Consultando tarifas de Correo Argentino…
            </div>

            <div v-else-if="quoteRates.length > 0" class="space-y-3">
              <label
                v-for="rate in quoteRates"
                :key="buildQuoteKey(rate)"
                class="flex cursor-pointer gap-4 rounded-2xl border border-white/12 bg-white/3 p-4 transition has-[:checked]:border-industrial-yellow has-[:checked]:bg-industrial-yellow/8"
              >
                <input
                  v-model="selectedQuoteKey"
                  type="radio"
                  name="correo-rate"
                  :value="buildQuoteKey(rate)"
                  class="mt-1 accent-industrial-yellow"
                />
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-start justify-between gap-3">
                    <span>
                      <span class="block font-semibold text-soft-white">{{ rate.product_name }}</span>
                      <span class="mt-1 block text-sm text-neutral-400">{{ formatTransitWindow(rate) }}</span>
                    </span>
                    <span class="text-lg font-black text-industrial-yellow">{{ formatMoney(rate.price) }}</span>
                  </span>
                  <span class="mt-3 block text-xs uppercase tracking-[0.16em] text-neutral-500">
                    {{ rate.delivered_type === 'D' ? 'Entrega a domicilio' : 'Retiro en sucursal' }}
                    · {{ rate.product_type }}
                  </span>
                </span>
              </label>

              <p class="text-xs text-neutral-500">
                <span v-if="shippingQuote?.source === 'fallback'">
                  Mostrando precio de respaldo configurado en la tienda.
                </span>
                <span v-else-if="formatQuoteValidity(shippingQuote?.valid_to ?? null)">
                  Cotización vigente hasta {{ formatQuoteValidity(shippingQuote?.valid_to ?? null) }}.
                </span>
              </p>
            </div>

            <div v-else class="rounded-2xl border border-dashed border-white/12 p-5 text-sm text-neutral-400">
              Completá un código postal válido para ver las opciones disponibles.
            </div>
          </div>
        </div>
      </section>

      <aside class="card-soft h-fit space-y-6 p-6 xl:sticky xl:top-28">
        <div class="space-y-4 border-b border-white/10 pb-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-bold text-soft-white">Resumen</h2>
            <RouterLink to="/catalogo" class="text-sm font-semibold text-industrial-yellow hover:underline">
              Seguir comprando
            </RouterLink>
          </div>

          <ul class="space-y-4">
            <li
              v-for="line in cart.lines"
              :key="line.productId"
              class="flex gap-3 rounded-2xl border border-white/8 bg-white/4 p-3"
            >
              <img
                :src="resolveMediaUrl(line.image_url)"
                :alt="line.name"
                class="h-20 w-20 rounded-xl object-cover"
                loading="lazy"
              />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-2 font-semibold text-soft-white">{{ line.name }}</p>
                <p class="mt-1 text-sm text-neutral-400">
                  {{ formatMoney(line.price) }} c/u
                </p>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="flex items-center rounded-xl border border-white/10 bg-black/20">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-sm text-neutral-300 transition hover:text-soft-white"
                      @click="cart.setQuantity(line.productId, line.quantity - 1)"
                    >
                      -
                    </button>
                    <span class="min-w-10 px-2 text-center text-sm font-semibold text-soft-white">
                      {{ line.quantity }}
                    </span>
                    <button
                      type="button"
                      class="px-3 py-1.5 text-sm text-neutral-300 transition hover:text-soft-white"
                      @click="cart.setQuantity(line.productId, line.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    class="text-sm font-semibold text-red-300 hover:text-red-200"
                    @click="cart.removeLine(line.productId)"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3 text-sm text-neutral-400">
            <span>Subtotal productos</span>
            <span class="font-semibold text-soft-white">{{ formatMoney(cart.total) }}</span>
          </div>
          <div class="flex items-start justify-between gap-3 text-sm text-neutral-400">
            <span>{{ selectedShippingLabel }}</span>
            <span class="font-semibold text-soft-white">
              {{ shippingPrice > 0 ? formatMoney(shippingPrice) : 'Gratis' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span class="text-base font-semibold text-soft-white">Total estimado</span>
            <span class="text-3xl font-black text-industrial-yellow">{{ formatMoney(grandTotal) }}</span>
          </div>
        </div>

        <button
          type="button"
          class="btn-primary w-full px-5 py-3 text-sm font-bold disabled:opacity-60"
          :disabled="paying || (shipping === 'correo_argentino' && (loadingQuote || !selectedShippingRate))"
          @click="goToMercadoPago"
        >
          {{ paying ? 'Abriendo Mercado Pago…' : 'Continuar al pago' }}
        </button>

        <p class="text-xs leading-5 text-neutral-500">
          Serás redirigido al checkout seguro de Mercado Pago. El pedido queda pendiente hasta que el pago se acredite.
        </p>
        <p v-if="shipping === 'correo_argentino'" class="text-xs leading-5 text-neutral-500">
          La tarifa se vuelve a validar en el servidor antes de abrir Mercado Pago para que el total no quede
          desfasado.
        </p>
      </aside>
    </div>
  </div>
</template>
