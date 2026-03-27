<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'

interface ShippingSettingsPayload {
  shipping_delivery_price_ars: number
  shipping_correo_argentino_price_ars: number
  env_fallback_delivery_ars: number
  env_fallback_correo_ars: number
  updated_at: string | null
}

const loading = ref(false)
const saving = ref(false)
const deliveryInput = ref('')
const correoInput = ref('')
const envFallbackDelivery = ref<number | null>(null)
const envFallbackCorreo = ref<number | null>(null)
const updatedAt = ref<string | null>(null)

const formatMoney = (n: number) =>
  `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const loadSettings = async () => {
  loading.value = true
  try {
    const { data } = await configApi.get<ApiResponse<ShippingSettingsPayload>>('/admin/settings/shipping')
    if (data.status === 'error') {
      toast.error(data.message)
      return
    }
    const p = data.data as ShippingSettingsPayload
    deliveryInput.value = String(p.shipping_delivery_price_ars)
    correoInput.value = String(p.shipping_correo_argentino_price_ars)
    envFallbackDelivery.value = p.env_fallback_delivery_ars
    envFallbackCorreo.value = p.env_fallback_correo_ars
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
  const d = Number(deliveryInput.value.replace(',', '.'))
  const c = Number(correoInput.value.replace(',', '.'))
  if (!Number.isFinite(d) || d < 0 || !Number.isFinite(c) || c < 0) {
    toast.error('Ingresá montos válidos (0 o más) en ambos campos')
    return
  }
  saving.value = true
  try {
    const { data } = await configApi.patch<
      ApiResponse<{ shipping_delivery_price_ars: number; shipping_correo_argentino_price_ars: number }>
    >('/admin/settings/shipping', {
      shipping_delivery_price_ars: d,
      shipping_correo_argentino_price_ars: c,
    })
    if (data.status === 'error') {
      toast.error(data.message)
      return
    }
    toast.success('Precios de envío guardados')
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
      <p class="mt-1 text-sm text-neutral-400">
        Precios fijos que ve el cliente en el carrito y en Mercado Pago (no incluye cotización en línea con Correo
        Argentino).
      </p>
    </div>

    <div class="card-soft max-w-lg p-6">
      <h2 class="text-lg font-bold text-soft-white">Envíos</h2>
      <p class="mt-2 text-sm text-neutral-400">
        Podés poner 0 si el envío va sin cargo. Los pedidos guardan el método elegido (domicilio, Correo o retiro).
      </p>

      <div v-if="loading" class="mt-6 text-sm text-neutral-500">Cargando…</div>
      <form v-else class="mt-6 space-y-5" @submit.prevent="saveShipping">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Envío a domicilio (ARS)
          </label>
          <input
            v-model="deliveryInput"
            type="text"
            inputmode="decimal"
            class="input-inferno w-full max-w-xs px-4 py-3 font-mono text-soft-white"
            placeholder="8000"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Envío por Correo Argentino (ARS)
          </label>
          <input
            v-model="correoInput"
            type="text"
            inputmode="decimal"
            class="input-inferno w-full max-w-xs px-4 py-3 font-mono text-soft-white"
            placeholder="10000"
          />
        </div>
        <p v-if="envFallbackDelivery != null && envFallbackCorreo != null" class="text-xs text-neutral-500">
          Respaldo por variable de entorno si falta la tabla o columna en MySQL: domicilio
          {{ formatMoney(envFallbackDelivery) }}, Correo {{ formatMoney(envFallbackCorreo) }}.
        </p>
        <p v-if="formatUpdated(updatedAt)" class="text-xs text-neutral-600">
          Última actualización: {{ formatUpdated(updatedAt) }}
        </p>
        <button type="submit" class="btn-primary px-5 py-2.5 text-sm" :disabled="saving">
          {{ saving ? 'Guardando…' : 'Guardar precios de envío' }}
        </button>
      </form>
    </div>
  </section>
</template>
