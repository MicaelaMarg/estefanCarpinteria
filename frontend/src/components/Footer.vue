<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { adminUrl } from '../utils/adminLinks'
import { waMeUrl, WHATSAPP_DEFAULT_MESSAGE } from '../utils/whatsapp'

const route = useRoute()
const { isAuthenticated } = useAuth()

const isAdminPage = computed(() => route.path.startsWith('/admin'))

const year = new Date().getFullYear()

/** Mismo número que WhatsAppButton / contacto del sitio */
const PHONE_E164 = '5492236955009'
const EMAIL = 'contacto@estefancarpinteria.com'

const waHref = waMeUrl(PHONE_E164, WHATSAPP_DEFAULT_MESSAGE)
const telHref = 'tel:+5492236955009'
const mailHref = `mailto:${EMAIL}?subject=Consulta%20muebles%20a%20medida`
</script>

<template>
  <footer class="relative z-10 overflow-hidden border-t border-white/10 text-soft-white">
    <!-- Capa de lectura: fija contraste sobre textura de fondo del layout -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-deep-black via-deep-black/95 to-[#0d0a08]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-deep-black/88 backdrop-blur-sm"
      aria-hidden="true"
    />

    <div class="section-container relative z-10 pt-14 pb-10">
      <div class="grid gap-10 md:gap-12 lg:grid-cols-12 lg:gap-10 lg:items-start">
        <!-- Marca -->
        <div class="lg:col-span-4">
          <p
            class="inline-flex items-center rounded border border-industrial-yellow/35 bg-industrial-yellow/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-industrial-yellow"
          >
            Carpintería · A medida
          </p>
          <h2 class="mt-4 text-2xl font-black tracking-tight text-soft-white sm:text-3xl">
            Estefan Carpintería
          </h2>
          <p class="mt-3 max-w-sm text-sm leading-relaxed text-neutral-300">
            Diseñamos y fabricamos muebles con medición real, madera seleccionada y estética industrial moderna. Tu
            espacio, hecho para durar.
          </p>
        </div>

        <!-- Contacto + CTA -->
        <div class="lg:col-span-5 lg:pl-2">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-industrial-yellow/90">
            Contacto directo
          </p>
          <p class="mt-2 text-lg font-bold text-soft-white">¿Presupuesto o idea en mente?</p>
          <p class="mt-1 max-w-md text-sm text-neutral-400">
            Escribinos: respondemos por WhatsApp con tiempos, materiales y próximos pasos.
          </p>

          <a
            :href="waHref"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-6 flex w-full max-w-md items-center justify-center gap-3 rounded-xl bg-[#25D366] px-5 py-4 text-base font-black text-[#05301f] shadow-lg shadow-black/40 transition hover:bg-[#20bd5c] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:inline-flex sm:w-auto"
          >
            <svg class="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            Consultar por WhatsApp
          </a>

          <ul class="mt-6 space-y-3 text-sm">
            <li>
              <a
                :href="telHref"
                class="group inline-flex items-center gap-2 font-medium text-neutral-200 underline decoration-white/20 underline-offset-4 transition hover:text-industrial-yellow hover:decoration-industrial-yellow/50"
              >
                <span class="text-neutral-500 group-hover:text-industrial-yellow" aria-hidden="true">Tel.</span>
                +54 9 223 695-5009
              </a>
            </li>
            <li>
              <a
                :href="mailHref"
                class="group inline-flex items-center gap-2 font-medium text-neutral-200 underline decoration-white/20 underline-offset-4 transition hover:text-industrial-yellow hover:decoration-industrial-yellow/50"
              >
                <span class="text-neutral-500 group-hover:text-industrial-yellow" aria-hidden="true">Email</span>
                {{ EMAIL }}
              </a>
            </li>
            <li class="pt-1">
              <a
                :href="waHref"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-neutral-500 transition hover:text-neutral-300"
              >
                Abrir chat en WhatsApp Web ↗
              </a>
            </li>
          </ul>
        </div>

        <!-- Redes (peso secundario) -->
        <div class="lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-8">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">Seguinos</p>
          <p class="mt-2 text-sm font-semibold text-neutral-300">Trabajos y proceso en Instagram</p>
          <a
            href="https://instagram.com/maderaenveta/"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-soft-white transition hover:border-industrial-yellow/50 hover:bg-industrial-yellow/10 hover:text-industrial-yellow"
          >
            @maderaenveta
            <span class="text-xs font-normal text-neutral-500">↗</span>
          </a>
        </div>
      </div>

      <!-- Panel: en /admin solo “volver”; en la tienda, login discreto o abrir panel si ya hay sesión -->
      <div class="mt-10 border-t border-white/10 pt-8">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Taller</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <RouterLink
            v-if="isAdminPage"
            to="/"
            class="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:border-industrial-yellow/40 hover:text-industrial-yellow"
          >
            Volver a la tienda
          </RouterLink>
          <template v-else-if="!isAuthenticated">
            <RouterLink
              to="/login"
              class="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-400 transition hover:border-industrial-yellow/35 hover:text-industrial-yellow"
            >
              Iniciar sesión (panel)
            </RouterLink>
          </template>
          <a
            v-else
            :href="adminUrl('/admin/dashboard')"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg border border-industrial-yellow/25 px-3 py-2 text-xs font-semibold text-industrial-yellow transition hover:bg-industrial-yellow/10"
          >
            Abrir panel administración ↗
          </a>
        </div>
      </div>

      <!-- Confianza / legal mínimo -->
      <div
        class="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="max-w-prose text-pretty">
          © {{ year }} Estefan Carpintería · Mar del Plata, Argentina · Muebles y proyectos a medida.
        </p>
        <p class="shrink-0 text-neutral-600 sm:max-w-xs sm:text-right">
          Respuesta típica en horario comercial · presupuestos sin compromiso
        </p>
      </div>
    </div>
  </footer>
</template>
