<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCartStore } from '../stores/cart'
import { adminUrl } from '../utils/adminLinks'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, logout } = useAuth()
const cart = useCartStore()

const links = [
  { label: 'Inicio', to: '/' },
  { label: 'Catalogo', to: '/catalogo' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
]

const isActive = computed(() => (path: string) => route.path === path)

const isAdminRoute = computed(
  () => route.path.startsWith('/admin/') || route.path === '/login',
)

const handleLogout = () => {
  logout()
  void router.push('/')
}

const adminLinks = [
  { label: 'Panel', path: '/admin/dashboard' },
  { label: 'Pedidos', path: '/admin/pedidos' },
  { label: 'Productos', path: '/admin/productos' },
] as const
</script>

<template>
  <header class="navbar-glass fixed inset-x-0 top-0 z-50">
    <div class="section-container flex flex-wrap items-center justify-between gap-3 py-4">
      <RouterLink to="/" class="flex items-center gap-2 text-industrial-yellow">
        <span class="rounded-md bg-industrial-yellow px-2 py-1 font-black text-deep-black">EC</span>
        <span class="text-lg font-bold tracking-wide">Estefan Carpinteria</span>
      </RouterLink>

      <nav class="flex max-w-full flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-sm font-semibold transition-colors hover:text-industrial-yellow"
          :class="isActive(link.to) ? 'text-industrial-yellow' : 'text-soft-white'"
        >
          {{ link.label }}
        </RouterLink>
        <RouterLink
          to="/carrito"
          class="relative text-sm font-semibold transition-colors hover:text-industrial-yellow"
          :class="isActive('/carrito') ? 'text-industrial-yellow' : 'text-soft-white'"
        >
          Carrito
          <span
            v-if="cart.itemCount > 0"
            class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-inferno-red px-1 text-[10px] font-bold text-white"
          >
            {{ cart.itemCount > 99 ? '99+' : cart.itemCount }}
          </span>
        </RouterLink>

        <RouterLink
          v-if="!isAuthenticated"
          to="/login"
          class="text-sm font-semibold text-neutral-300 transition-colors hover:text-industrial-yellow"
          :class="isActive('/login') ? 'text-industrial-yellow' : ''"
        >
          Acceso
        </RouterLink>

        <details
          v-if="isAuthenticated"
          class="relative [&_summary::-webkit-details-marker]:hidden"
        >
          <summary
            class="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-soft-white transition-colors hover:text-industrial-yellow [&_svg]:transition-transform open:[&_svg]:rotate-180"
            :class="isAdminRoute ? 'text-industrial-yellow' : ''"
          >
            Administración
            <svg class="h-4 w-4 opacity-80" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </summary>
          <div
            class="absolute right-0 z-[60] mt-2 w-52 rounded-lg border border-white/15 bg-deep-black/95 py-1 shadow-xl backdrop-blur-md"
            role="menu"
          >
            <a
              v-for="item in adminLinks"
              :key="item.path"
              :href="adminUrl(item.path)"
              target="_blank"
              rel="noopener noreferrer"
              class="block px-4 py-2.5 text-sm font-semibold text-soft-white transition-colors hover:bg-white/10 hover:text-industrial-yellow"
              role="menuitem"
            >
              {{ item.label }}
              <span class="ml-1 text-[10px] font-normal text-neutral-500">↗</span>
            </a>
            <div class="my-1 border-t border-white/10" />
            <button
              type="button"
              class="w-full px-4 py-2.5 text-left text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-inferno-red"
              role="menuitem"
              @click="handleLogout"
            >
              Salir
            </button>
          </div>
        </details>
      </nav>
    </div>
  </header>
</template>
