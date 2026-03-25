<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const cart = useCartStore()

const links = [
  { label: 'Inicio', to: '/' },
  { label: 'Catalogo', to: '/catalogo' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
]

const isActive = computed(() => (path: string) => route.path === path)
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
      </nav>
    </div>
  </header>
</template>
