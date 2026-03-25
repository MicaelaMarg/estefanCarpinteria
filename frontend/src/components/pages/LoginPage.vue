<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import { useAuth } from '../../composables/useAuth'
import { adminUrl } from '../../utils/adminLinks'

const form = reactive({
  email: '',
  password: '',
})

const route = useRoute()
const router = useRouter()
const { loading, login, isAuthenticated, logout } = useAuth()

const adminLinks = [
  { label: 'Panel', path: '/admin/dashboard' },
  { label: 'Pedidos', path: '/admin/pedidos' },
  { label: 'Productos', path: '/admin/productos' },
] as const

const handleSubmit = async () => {
  try {
    await login({
      email: form.email,
      password: form.password,
    })
    toast.success('Sesion iniciada correctamente')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.push(redirect.startsWith('/') ? redirect : '/admin/dashboard')
  } catch {
    /* mensaje de error vía interceptor de axios */
  }
}

const handleLogout = () => {
  logout()
  void router.push('/')
}
</script>

<template>
  <section class="section-container py-16">
    <div class="mx-auto max-w-md card-soft p-7">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Acceso</p>
      <h1 class="mt-2 text-3xl font-black text-soft-white">Iniciar sesion</h1>
      <p class="mt-2 text-sm text-neutral-400">Panel preparado para autenticacion JWT.</p>

      <div v-if="isAuthenticated" class="mt-6 space-y-4 rounded-lg border border-industrial-yellow/25 bg-black/25 p-5">
        <p class="text-sm font-semibold text-soft-white">Ya tenés sesión iniciada.</p>
        <p class="text-xs text-neutral-400">
          Abrí el panel en una pestaña nueva para no mezclarlo con la tienda.
        </p>
        <ul class="space-y-2">
          <li v-for="item in adminLinks" :key="item.path">
            <a
              :href="adminUrl(item.path)"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-between rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-soft-white transition-colors hover:border-industrial-yellow hover:text-industrial-yellow"
            >
              {{ item.label }}
              <span class="text-xs text-neutral-500">Nueva pestaña ↗</span>
            </a>
          </li>
        </ul>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row">
          <button type="button" class="btn-primary flex-1 px-4 py-2.5 text-sm" @click="handleLogout">
            Salir
          </button>
          <RouterLink
            to="/"
            class="flex flex-1 items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-soft-white hover:border-industrial-yellow"
          >
            Ir al inicio
          </RouterLink>
        </div>
      </div>

      <form v-else class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-semibold text-neutral-300">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="input-inferno w-full px-4 py-3"
            placeholder="mattiuccimicaelammm@gmail.com"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-neutral-300">Contrasena</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="input-inferno w-full px-4 py-3"
            placeholder="********"
          />
        </div>

        <button class="btn-primary w-full px-4 py-3 text-sm" :disabled="loading" type="submit">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </section>
</template>