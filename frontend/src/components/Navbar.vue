<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCartStore } from '../stores/cart'

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

const handleLogout = () => {
  logout()
  void router.push('/')
}
</script>

<template>
  <header class="navbar-glass fixed inset-x-0 top-0 z-50">
    <div class="section-container flex items-center justify-between py-4">
      <RouterLink to="/" class="flex items-center gap-2 text-industrial-yellow">
        <span class="rounded-md bg-industrial-yellow px-2 py-1 font-black text-deep-black">EC</span>
        <span class="text-lg font-bold tracking-wide">Estefan Carpinteria</span>
      </RouterLink>

      <nav class="hidden items-center gap-6 md:flex">
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
          v-if="isAuthenticated"
          to="/admin/pedidos"
          class="text-sm font-semibold transition-colors hover:text-industrial-yellow"
          :class="isActive('/admin/pedidos') ? 'text-industrial-yellow' : 'text-soft-white'"
        >
          Pedidos
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/admin/productos"
          class="text-sm font-semibold transition-colors hover:text-industrial-yellow"
          :class="isActive('/admin/productos') ? 'text-industrial-yellow' : 'text-soft-white'"
        >
          Productos
        </RouterLink>
        <button
          v-if="isAuthenticated"
          type="button"
          class="text-sm font-semibold text-soft-white transition-colors hover:text-industrial-yellow"
          @click="handleLogout"
        >
          Salir
        </button>
      </nav>
    </div>
  </header>
</template>