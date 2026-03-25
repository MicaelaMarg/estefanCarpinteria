<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { adminUrl, spaUrl } from '../utils/adminLinks'

const route = useRoute()
const { isAuthenticated } = useAuth()

const isAdminPage = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <footer
    class="relative z-10 border-t border-white/10 bg-deep-black/90 py-12 text-soft-white backdrop-blur-md"
  >
    <div class="section-container grid gap-8 md:grid-cols-3">
      <div>
        <p class="text-xl font-bold text-industrial-yellow">Estefan Carpinteria</p>
        <p class="mt-3 text-sm text-neutral-300">
          Muebles y proyectos a medida con terminaciones premium y estilo industrial moderno.
        </p>
      </div>

      <div>
        <p class="font-semibold">Contacto</p>
        <ul class="mt-3 space-y-2 text-sm text-neutral-300">
          <li>
            <a class="hover:text-industrial-yellow" href="mailto:contacto@estefancarpinteria.com">
              contacto@estefancarpinteria.com
            </a>
          </li>
          <li>
            <a class="hover:text-industrial-yellow" href="https://wa.me/5492236955009" target="_blank" rel="noreferrer">
              WhatsApp: +54 9 223 695 5009
            </a>
          </li>
        </ul>
      </div>

      <div>
        <p class="font-semibold">Redes</p>
        <div class="mt-3 flex flex-wrap gap-3 text-sm">
          <a
            class="rounded-lg border border-neutral-700 px-3 py-2 hover:border-industrial-yellow hover:text-industrial-yellow"
            href="https://instagram.com/maderaenveta/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>

        <p class="mt-6 font-semibold">Administración</p>
        <p class="mt-1 text-xs text-neutral-500">
          El acceso no está en el menú superior; se abre en una pestaña nueva.
        </p>
        <div class="mt-3 space-y-2 text-sm">
          <template v-if="isAdminPage">
            <RouterLink
              to="/"
              class="inline-flex rounded-lg border border-neutral-700 px-3 py-2 font-semibold hover:border-industrial-yellow hover:text-industrial-yellow"
            >
              Volver a la tienda
            </RouterLink>
          </template>
          <template v-else>
            <a
              :href="spaUrl('/login')"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 font-semibold hover:border-industrial-yellow hover:text-industrial-yellow"
            >
              Iniciar sesión
              <span class="text-[10px] font-normal text-neutral-500">nueva pestaña ↗</span>
            </a>
            <a
              v-if="isAuthenticated"
              :href="adminUrl('/admin/dashboard')"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 flex items-center gap-2 rounded-lg border border-industrial-yellow/40 px-3 py-2 font-semibold text-industrial-yellow hover:bg-industrial-yellow/10"
            >
              Abrir panel
              <span class="text-[10px] font-normal text-neutral-400">nueva pestaña ↗</span>
            </a>
          </template>
        </div>
      </div>
    </div>
  </footer>
</template>
