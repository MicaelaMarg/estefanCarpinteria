<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { AdminOrder } from '../interfaces/order'

const orders = ref<AdminOrder[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref<string | null>(null)
const statusFilter = ref<'all' | 'pending' | 'paid' | 'failed'>('all')
const expandedId = ref<number | null>(null)

const statusLabel = (s: string) => {
  if (s === 'paid') return 'Pagado'
  if (s === 'failed') return 'Fallido'
  return 'Pendiente'
}

const statusClass = (s: string) => {
  if (s === 'paid') return 'bg-emerald-500/20 text-emerald-300'
  if (s === 'failed') return 'bg-red-500/20 text-red-300'
  return 'bg-amber-500/20 text-amber-200'
}

const shippingLabel = (o: AdminOrder) => {
  if (o.shipping_method === 'delivery') return 'Envío a domicilio'
  if (o.shipping_method === 'pickup') return 'Retiro en taller'
  return '—'
}

const formatMoney = (n: number) => `$${n.toLocaleString('es-AR')}`

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

const hasShippingDetails = (o: AdminOrder) =>
  o.shipping_method === 'delivery' &&
  Boolean(o.shipping_phone || o.shipping_address || o.shipping_contact_name || o.shipping_notes)

const fetchOrders = async () => {
  loading.value = true
  loadError.value = null
  try {
    const params: Record<string, string | number> = { limit: 100, page: 1 }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    const { data } = await configApi.get<ApiResponse<AdminOrder[]>>('/admin/orders', { params })
    if (data.status === 'error') {
      loadError.value = data.message
      toast.error(data.message)
      return
    }
    orders.value = Array.isArray(data.data) ? data.data : []
    total.value = data.total
    expandedId.value = null
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e)
      ? String(e.response?.data?.message ?? e.message ?? 'No se pudieron cargar los pedidos')
      : 'No se pudieron cargar los pedidos'
    loadError.value = msg
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

const toggleExpand = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}

const itemsSubtotal = (o: AdminOrder) =>
  o.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0)

const showEnvioLine = (o: AdminOrder) =>
  o.shipping_method === 'delivery' && (o.shipping_cost ?? 0) > 0

onMounted(() => {
  void fetchOrders()
})
</script>

<template>
  <section class="section-container pb-20 pt-28">
    <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Administración</p>
        <h1 class="text-3xl font-black text-soft-white">Pedidos y envíos</h1>
        <p class="text-sm text-neutral-400">Apunte de compras Mercado Pago · {{ total }} pedido(s)</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-xs text-neutral-400">
          Estado
          <select
            v-model="statusFilter"
            class="input-inferno ml-2 px-3 py-2 text-sm"
            @change="fetchOrders"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente de pago</option>
            <option value="paid">Pagados</option>
            <option value="failed">Fallidos</option>
          </select>
        </label>
        <RouterLink
          to="/admin/productos"
          class="rounded-lg border border-white/20 px-4 py-2 text-sm text-soft-white hover:border-industrial-yellow"
        >
          Ir a productos
        </RouterLink>
        <button type="button" class="btn-primary px-4 py-2 text-sm" :disabled="loading" @click="fetchOrders">
          Actualizar
        </button>
      </div>
    </div>

    <div class="card-soft min-h-[200px] overflow-hidden p-0">
      <div v-if="loading" class="p-10 text-center text-neutral-500">Cargando pedidos…</div>
      <div v-else-if="loadError" class="p-8 text-center text-sm text-red-400">
        <p class="font-semibold">{{ loadError }}</p>
        <button type="button" class="btn-primary mt-4 px-4 py-2 text-sm" @click="fetchOrders">Reintentar</button>
      </div>
      <div v-else-if="orders.length === 0" class="p-10 text-center text-neutral-400">
        No hay pedidos con este filtro.
      </div>
      <ul v-else class="divide-y divide-white/10">
        <li v-for="o in orders" :key="o.id" class="p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-sm font-bold text-soft-white">#{{ o.id }}</span>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
                <span class="text-xs text-neutral-500">{{ formatDate(o.created_at) }}</span>
              </div>
              <p class="mt-1 text-lg font-black text-industrial-yellow">{{ formatMoney(o.total_amount) }}</p>
              <p class="text-sm text-neutral-300">
                <span class="font-semibold text-soft-white">Entrega:</span> {{ shippingLabel(o) }}
                <span v-if="showEnvioLine(o)" class="text-industrial-yellow">
                  · Envío {{ formatMoney(o.shipping_cost ?? 0) }}
                </span>
              </p>
              <p class="mt-1 text-xs text-neutral-500">
                Productos: {{ o.items.length }} línea(s) · Subtotal ítems {{ formatMoney(itemsSubtotal(o)) }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-soft-white hover:border-industrial-yellow"
              @click="toggleExpand(o.id)"
            >
              {{ expandedId === o.id ? 'Ocultar detalle' : 'Ver detalle' }}
            </button>
          </div>

          <div
            v-if="expandedId === o.id"
            class="mt-4 space-y-4 border-t border-white/10 pt-4 text-sm"
          >
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-wide text-industrial-yellow">Ítems</p>
              <ul class="space-y-2 rounded-lg bg-black/30 p-3">
                <li
                  v-for="it in o.items"
                  :key="it.id"
                  class="flex flex-wrap justify-between gap-2 text-neutral-200"
                >
                  <span>{{ it.title }} <span class="text-neutral-500">(id prod. {{ it.product_id }})</span></span>
                  <span>
                    {{ it.quantity }} × {{ formatMoney(it.unit_price) }} =
                    <span class="font-semibold text-soft-white">{{ formatMoney(it.quantity * it.unit_price) }}</span>
                  </span>
                </li>
              </ul>
            </div>

            <div v-if="hasShippingDetails(o)" class="rounded-lg border border-inferno-red/30 bg-inferno-red/5 p-4">
              <p class="mb-2 text-xs font-bold uppercase tracking-wide text-inferno-red">Datos de envío (cliente)</p>
              <dl class="space-y-1 text-neutral-200">
                <div v-if="o.shipping_contact_name" class="flex gap-2">
                  <dt class="w-28 shrink-0 text-neutral-500">Nombre</dt>
                  <dd>{{ o.shipping_contact_name }}</dd>
                </div>
                <div v-if="o.shipping_phone" class="flex gap-2">
                  <dt class="w-28 shrink-0 text-neutral-500">Teléfono</dt>
                  <dd class="font-mono">{{ o.shipping_phone }}</dd>
                </div>
                <div v-if="o.shipping_address" class="flex gap-2">
                  <dt class="w-28 shrink-0 text-neutral-500">Dirección</dt>
                  <dd class="whitespace-pre-wrap">{{ o.shipping_address }}</dd>
                </div>
                <div v-if="o.shipping_notes" class="flex gap-2">
                  <dt class="w-28 shrink-0 text-neutral-500">Notas</dt>
                  <dd>{{ o.shipping_notes }}</dd>
                </div>
              </dl>
            </div>
            <div v-else-if="o.shipping_method === 'delivery'" class="text-xs text-amber-200/90">
              Envío elegido pero sin datos de contacto en la base (migración 007 o pedido anterior).
            </div>

            <div class="text-xs text-neutral-500">
              <p v-if="o.preference_id">Preferencia MP: {{ o.preference_id }}</p>
              <p v-if="o.payment_id">Pago MP: {{ o.payment_id }}</p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
