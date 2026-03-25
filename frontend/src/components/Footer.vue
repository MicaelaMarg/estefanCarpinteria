<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { isAuthenticated } = useAuth()
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
          <RouterLink
            v-if="!isAuthenticated"
            to="/login"
            class="rounded-lg border border-neutral-700 px-3 py-2 hover:border-industrial-yellow hover:text-industrial-yellow"
          >
            Login
          </RouterLink>
          <RouterLink
            v-else
            to="/admin/productos"
            class="rounded-lg border border-neutral-700 px-3 py-2 hover:border-industrial-yellow hover:text-industrial-yellow"
          >
            Administración
          </RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>
