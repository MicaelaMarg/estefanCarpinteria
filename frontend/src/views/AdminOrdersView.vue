<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { AdminOrder, OrderFulfillmentStatus } from '../interfaces/order'

const orders = ref<AdminOrder[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref<string | null>(null)
const statusFilter = ref<'all' | 'pending' | 'paid' | 'failed'>('all')
const fulfillmentFilter = ref<'all' | OrderFulfillmentStatus>('all')
const searchInput = ref('')
const searchQ = ref('')
const expandedId = ref<number | null>(null)
const updatingFulfillmentId = ref<number | null>(null)

const fulfillmentOptions: { value: OrderFulfillmentStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'listo', label: 'Listo' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
]

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

const fulfillmentLabel = (f: string) => {
  const o = fulfillmentOptions.find((x) => x.value === f)
  return o?.label ?? f
}

const fulfillmentBadgeClass = (f: string) => {
  if (f === 'entregado') return 'bg-emerald-600/25 text-emerald-200'
  if (f === 'enviado') return 'bg-sky-600/25 text-sky-200'
  if (f === 'listo') return 'bg-industrial-yellow/20 text-industrial-yellow'
  return 'bg-neutral-600/30 text-neutral-300'
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

const normalizeOrder = (raw: AdminOrder): AdminOrder => ({
  ...raw,
  fulfillment_status: (raw.fulfillment_status ?? 'pendiente') as OrderFulfillmentStatus,
})

const fetchOrders = async () => {
  loading.value = true
  loadError.value = null
  try {
    const params: Record<string, string | number> = { limit: 100, page: 1 }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    if (fulfillmentFilter.value !== 'all') params.fulfillment = fulfillmentFilter.value
    const q = searchQ.value.trim()
    if (q.length > 0) params.q = q

    const { data } = await configApi.get<ApiResponse<AdminOrder[]>>('/admin/orders', { params })
    if (data.status === 'error') {
      loadError.value = data.message
      toast.error(data.message)
      return
    }
    const list = Array.isArray(data.data) ? data.data : []
    orders.value = list.map(normalizeOrder)
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

const applySearch = () => {
  searchQ.value = searchInput.value.trim()
  void fetchOrders()
}

const onFulfillmentFilterChange = () => {
  void fetchOrders()
}

const onPaymentStatusChange = () => {
  void fetchOrders()
}

const toggleExpand = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}

const itemsSubtotal = (o: AdminOrder) =>
  o.items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0)

const showEnvioLine = (o: AdminOrder) =>
  o.shipping_method === 'delivery' && (o.shipping_cost ?? 0) > 0

const patchFulfillment = async (
  o: AdminOrder,
  value: OrderFulfillmentStatus,
  selectEl: HTMLSelectElement,
) => {
  const previous = o.fulfillment_status
  if (previous === value) return
  updatingFulfillmentId.value = o.id
  try {
    const { data } = await configApi.patch<ApiResponse<{ id: number; fulfillment_status: string }>>(
      `/admin/orders/${o.id}/fulfillment`,
      { fulfillment_status: value },
    )
    if (data.status === 'error') {
      selectEl.value = previous
      toast.error(data.message)
      return
    }
    o.fulfillment_status = value
    toast.success('Estado de entrega actualizado')
  } catch (e: unknown) {
    selectEl.value = previous
    const msg = axios.isAxiosError(e)
      ? String(e.response?.data?.message ?? e.message ?? 'No se pudo guardar')
      : 'No se pudo guardar'
    toast.error(msg)
  } finally {
    updatingFulfillmentId.value = null
  }
}

const onFulfillmentSelect = (o: AdminOrder, ev: Event) => {
  const el = ev.target as HTMLSelectElement
  const v = el.value as OrderFulfillmentStatus
  void patchFulfillment(o, v, el)
}

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
        <p class="text-sm text-neutral-400">Apunte de compras · {{ total }} pedido(s) con este filtro</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <RouterLink
          to="/admin/dashboard"
          class="rounded-lg border border-white/20 px-4 py-2 text-sm text-soft-white hover:border-industrial-yellow"
        >
          Panel
        </RouterLink>
        <RouterLink
          to="/admin/productos"
          class="rounded-lg border border-white/20 px-4 py-2 text-sm text-soft-white hover:border-industrial-yellow"
        >
          Productos
        </RouterLink>
        <button type="button" class="btn-primary px-4 py-2 text-sm" :disabled="loading" @click="fetchOrders">
          Actualizar
        </button>
      </div>
    </div>

    <div class="mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:flex-row md:flex-wrap md:items-end">
      <label class="block min-w-[200px] flex-1 text-xs text-neutral-400">
        Buscar por nombre o teléfono
        <div class="mt-1 flex gap-2">
          <input
            v-model="searchInput"
            type="search"
            class="input-inferno flex-1 px-3 py-2 text-sm text-soft-white"
            placeholder="Ej. Juan o 11…"
            @keydown.enter.prevent="applySearch"
          />
          <button type="button" class="btn-primary shrink-0 px-4 py-2 text-sm" :disabled="loading" @click="applySearch">
            Buscar
          </button>
        </div>
      </label>
      <label class="text-xs text-neutral-400">
        Pago MP
        <select
          v-model="statusFilter"
          class="input-inferno ml-0 mt-1 block w-full min-w-[180px] px-3 py-2 text-sm md:ml-2 md:mt-0 md:inline-block"
          @change="onPaymentStatusChange"
        >
          <option value="all">Todos</option>
          <option value="pending">Pendiente de pago</option>
          <option value="paid">Pagados</option>
          <option value="failed">Fallidos</option>
        </select>
      </label>
      <label class="text-xs text-neutral-400">
        Entrega manual
        <select
          v-model="fulfillmentFilter"
          class="input-inferno ml-0 mt-1 block w-full min-w-[180px] px-3 py-2 text-sm md:ml-2 md:mt-0 md:inline-block"
          @change="onFulfillmentFilterChange"
        >
          <option value="all">Todas</option>
          <option v-for="opt in fulfillmentOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>
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
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-sm font-bold text-soft-white">#{{ o.id }}</span>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="fulfillmentBadgeClass(o.fulfillment_status)"
                  :title="'Estado manual: ' + fulfillmentLabel(o.fulfillment_status)"
                >
                  {{ fulfillmentLabel(o.fulfillment_status) }}
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
              <p
                v-if="o.shipping_contact_name || o.shipping_phone"
                class="mt-1 text-xs text-neutral-400"
              >
                {{ o.shipping_contact_name ?? '—' }}
                <span v-if="o.shipping_phone" class="font-mono text-neutral-300"> · {{ o.shipping_phone }}</span>
              </p>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label class="text-[10px] uppercase tracking-wide text-neutral-500 sm:mr-1">
                Estado manual
                <select
                  class="input-inferno mt-0.5 block min-w-[11rem] px-2 py-1.5 text-sm"
                  :value="o.fulfillment_status"
                  :disabled="updatingFulfillmentId === o.id"
                  @change="onFulfillmentSelect(o, $event)"
                >
                  <option v-for="opt in fulfillmentOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </label>
              <button
                type="button"
                class="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-soft-white hover:border-industrial-yellow"
                @click="toggleExpand(o.id)"
              >
                {{ expandedId === o.id ? 'Ocultar detalle' : 'Ver detalle' }}
              </button>
            </div>
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
