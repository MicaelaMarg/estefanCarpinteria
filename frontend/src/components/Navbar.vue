<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { label: 'Inicio', to: '/' },
  { label: 'Catalogo', to: '/catalogo' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
  { label: 'Login', to: '/login' },
]

const isActive = computed(() => (path: string) => route.path === path)
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-deep-black/95 backdrop-blur-md">
    <div class="section-container flex items-center justify-between py-4">
      <RouterLink to="/" class="flex items-center gap-2 text-industrial-yellow">
        <span class="rounded-md bg-industrial-yellow px-2 py-1 font-black text-deep-black">EC</span>
        <span class="text-lg font-bold tracking-wide">Estefan Carpinteria</span>
      </RouterLink>

      <nav class="hidden gap-6 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-sm font-semibold transition-colors hover:text-industrial-yellow"
          :class="isActive(link.to) ? 'text-industrial-yellow' : 'text-soft-white'"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>