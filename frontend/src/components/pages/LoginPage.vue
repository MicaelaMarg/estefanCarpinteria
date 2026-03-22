<script setup lang="ts">
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import { useAuth } from '../../composables/useAuth'

const form = reactive({
  email: '',
  password: '',
})

const route = useRoute()
const router = useRouter()
const { loading, login } = useAuth()

const handleSubmit = async () => {
  try {
    await login({
      email: form.email,
      password: form.password,
    })
    toast.success('Sesion iniciada correctamente')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.push(redirect.startsWith('/') ? redirect : '/admin/productos')
  } catch {
    /* mensaje de error vía interceptor de axios */
  }
}
</script>

<template>
  <section class="section-container py-16">
    <div class="mx-auto max-w-md card-soft p-7">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Acceso</p>
      <h1 class="mt-2 text-3xl font-black text-deep-black">Iniciar sesion</h1>
      <p class="mt-2 text-sm text-neutral-600">Panel preparado para autenticacion JWT.</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-semibold text-neutral-700">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none ring-industrial-yellow focus:ring-2"
            placeholder="admin@carpinteria.com"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-neutral-700">Contrasena</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none ring-industrial-yellow focus:ring-2"
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