<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'

interface ShippingSettingsPayload {
  shipping_delivery_price_ars: number
  env_fallback_ars: number
  updated_at: string | null
}

const loading = ref(false)
const saving = ref(false)
const priceInput = ref('')
const envFallback = ref<number | null>(null)
const updatedAt = ref<string | null>(null)

const formatMoney = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const loadSettings = async () => {
  loading.value = true
  try {
    const { data } = await configApi.get<ApiResponse<ShippingSettingsPayload>>('/admin/settings/shipping')
    if (data.status === 'error') {
      toast.error(data.message)
      return
    }
    const p = data.data as ShippingSettingsPayload
    priceInput.value = String(p.shipping_delivery_price_ars)
    envFallback.value = p.env_fallback_ars
    updatedAt.value = p.updated_at
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e)
      ? String(e.response?.data?.message ?? e.message ?? 'Error al cargar')
      : 'Error al cargar'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

const saveShipping = async () => {
  const n = Number(priceInput.value.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) {
    toast.error('Ingresá un monto válido (0 o más)')
    return
  }
  saving.value = true
  try {
    const { data } = await configApi.patch<ApiResponse<{ shipping_delivery_price_ars: number }>>(
      '/admin/settings/shipping',
      { shipping_delivery_price_ars: n },
    )
    if (data.status === 'error') {
      toast.error(data.message)
      return
    }
    const saved = (data.data as { shipping_delivery_price_ars: number }).shipping_delivery_price_ars
    priceInput.value = String(saved)
    toast.success('Precio de envío guardado')
    await loadSettings()
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e)
      ? String(e.response?.data?.message ?? e.message ?? 'No se pudo guardar')
      : 'No se pudo guardar'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

const formatUpdated = (iso: string | null) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <section class="section-container pb-16 pt-6 md:pt-8">
    <div class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Administración</p>
      <h1 class="text-3xl font-black text-soft-white">Ajustes</h1>
      <p class="mt-1 text-sm text-neutral-400">Precio de envío a domicilio que ve el cliente en el carrito y en Mercado Pago.</p>
    </div>

    <div class="card-soft max-w-lg p-6">
      <h2 class="text-lg font-bold text-soft-white">Envío a domicilio</h2>
      <p class="mt-2 text-sm text-neutral-400">
        Monto fijo en pesos (ARS) que se suma al total cuando el cliente elige “Envío a domicilio”. Podés poner 0 para
        envío sin cargo.
      </p>

      <div v-if="loading" class="mt-6 text-sm text-neutral-500">Cargando…</div>
      <form v-else class="mt-6 space-y-4" @submit.prevent="saveShipping">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Precio (ARS)</label>
          <input
            v-model="priceInput"
            type="text"
            inputmode="decimal"
            class="input-inferno w-full max-w-xs px-4 py-3 font-mono text-soft-white"
            placeholder="8000"
          />
        </div>
        <p v-if="envFallback != null" class="text-xs text-neutral-500">
          Si la base no tiene la tabla de ajustes, el servidor usa el respaldo del entorno:
          {{ formatMoney(envFallback) }}.
        </p>
        <p v-if="formatUpdated(updatedAt)" class="text-xs text-neutral-600">
          Última actualización: {{ formatUpdated(updatedAt) }}
        </p>
        <button type="submit" class="btn-primary px-5 py-2.5 text-sm" :disabled="saving">
          {{ saving ? 'Guardando…' : 'Guardar precio de envío' }}
        </button>
      </form>
    </div>
  </section>
</template>
