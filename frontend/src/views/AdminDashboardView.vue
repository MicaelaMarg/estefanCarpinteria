<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { AdminDashboardStats } from '../interfaces/dashboard'
import type { OrderFulfillmentStatus } from '../interfaces/order'

const stats = ref<AdminDashboardStats | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const formatMoney = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fulfillmentLabels: Record<OrderFulfillmentStatus, string> = {
  pendiente: 'Pendiente',
  listo: 'Listo',
  enviado: 'Enviado',
  entregado: 'Entregado',
}

const fetchStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    const { data } = await configApi.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard')
    if (data.status === 'error') {
      loadError.value = data.message
      toast.error(data.message)
      return
    }
    stats.value = data.data as AdminDashboardStats
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e)
      ? String(e.response?.data?.message ?? e.message ?? 'No se pudo cargar el panel')
      : 'No se pudo cargar el panel'
    loadError.value = msg
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchStats()
})
</script>

<template>
  <section class="section-container pb-20 pt-28">
    <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Administración</p>
        <h1 class="text-3xl font-black text-soft-white">Panel</h1>
        <p class="text-sm text-neutral-400">Ventas y resumen de pedidos</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <RouterLink
          to="/admin/pedidos"
          class="rounded-lg border border-white/20 px-4 py-2 text-sm text-soft-white hover:border-industrial-yellow"
        >
          Pedidos
        </RouterLink>
        <RouterLink
          to="/admin/productos"
          class="rounded-lg border border-white/20 px-4 py-2 text-sm text-soft-white hover:border-industrial-yellow"
        >
          Productos
        </RouterLink>
        <button type="button" class="btn-primary px-4 py-2 text-sm" :disabled="loading" @click="fetchStats">
          Actualizar
        </button>
      </div>
    </div>

    <div v-if="loading" class="card-soft p-12 text-center text-neutral-500">Cargando estadísticas…</div>
    <div v-else-if="loadError" class="card-soft p-8 text-center text-sm text-red-400">
      <p class="font-semibold">{{ loadError }}</p>
      <button type="button" class="btn-primary mt-4 px-4 py-2 text-sm" @click="fetchStats">Reintentar</button>
    </div>
    <div v-else-if="stats" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card-soft p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Ingresos (pagados)</p>
          <p class="mt-2 text-2xl font-black text-industrial-yellow">{{ formatMoney(stats.revenue_paid) }}</p>
          <p class="mt-1 text-xs text-neutral-400">Suma de pedidos con pago acreditado</p>
        </div>
        <div class="card-soft p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Este mes (pagados)</p>
          <p class="mt-2 text-2xl font-black text-soft-white">{{ formatMoney(stats.revenue_month_paid) }}</p>
          <p class="mt-1 text-xs text-neutral-400">Mes calendario actual</p>
        </div>
        <div class="card-soft p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Pedidos pagados</p>
          <p class="mt-2 text-2xl font-black text-emerald-300">{{ stats.orders_paid }}</p>
          <p class="mt-1 text-xs text-neutral-400">De {{ stats.total_orders }} totales</p>
        </div>
        <div class="card-soft p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-neutral-500">Pendientes / fallidos</p>
          <p class="mt-2 text-xl font-bold text-soft-white">
            <span class="text-amber-200">{{ stats.orders_pending }}</span>
            <span class="mx-1 text-neutral-600">/</span>
            <span class="text-red-300">{{ stats.orders_failed }}</span>
          </p>
          <p class="mt-1 text-xs text-neutral-400">Estado de pago Mercado Pago</p>
        </div>
      </div>

      <div class="card-soft p-6">
        <h2 class="text-lg font-bold text-soft-white">Estado manual de entrega (pedidos pagados)</h2>
        <p class="mt-1 text-sm text-neutral-400">Conteo por etapa: listo, enviado, entregado</p>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="key in (['pendiente', 'listo', 'enviado', 'entregado'] as const)"
            :key="key"
            class="rounded-lg bg-black/30 px-4 py-3"
          >
            <span class="text-xs text-neutral-500">{{ fulfillmentLabels[key] }}</span>
            <p class="text-xl font-black text-industrial-yellow">{{ stats.fulfillment_breakdown[key] ?? 0 }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
