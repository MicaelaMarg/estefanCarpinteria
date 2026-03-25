<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()

const items = [
  { label: 'Panel', to: '/admin/dashboard' },
  { label: 'Pedidos', to: '/admin/pedidos' },
  { label: 'Productos', to: '/admin/productos' },
  { label: 'Ajustes', to: '/admin/ajustes' },
] as const

const linkClass = (to: string) => {
  const active =
    to === '/admin/dashboard'
      ? route.path === '/admin/dashboard'
      : to === '/admin/ajustes'
        ? route.path === '/admin/ajustes'
        : route.path === to || route.path.startsWith(`${to}/`)
  return [
    'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
    active
      ? 'bg-industrial-yellow/15 text-industrial-yellow'
      : 'text-neutral-300 hover:bg-white/5 hover:text-soft-white',
  ].join(' ')
}

const handleLogout = () => {
  logout()
  void router.push('/')
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-1px)] flex-col md:flex-row">
    <aside
      class="shrink-0 border-b border-white/10 bg-deep-black/95 backdrop-blur-md md:sticky md:top-0 md:flex md:h-screen md:w-56 md:flex-col md:border-b-0 md:border-r"
    >
      <div class="section-container flex flex-wrap items-center gap-2 py-3 md:flex-col md:items-stretch md:px-4 md:py-6">
        <p class="hidden w-full text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 md:block">
          Administración
        </p>
        <RouterLink
          to="/"
          class="mr-auto text-sm font-bold text-industrial-yellow hover:underline md:mb-4 md:mr-0"
        >
          ← Estefan Carpintería
        </RouterLink>
        <nav class="flex w-full flex-wrap gap-1 md:flex-col md:gap-0.5" aria-label="Secciones del panel">
          <RouterLink v-for="item in items" :key="item.to" :to="item.to" :class="linkClass(item.to)">
            {{ item.label }}
          </RouterLink>
        </nav>
        <button
          type="button"
          class="mt-2 w-full rounded-lg border border-white/15 px-3 py-2.5 text-left text-sm font-semibold text-neutral-400 transition-colors hover:border-inferno-red/50 hover:text-inferno-red md:mt-4"
          @click="handleLogout"
        >
          Salir
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
