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
      <h1 class="mt-2 text-3xl font-black text-soft-white">Iniciar sesion</h1>
      <p class="mt-2 text-sm text-neutral-400">Panel preparado para autenticacion JWT.</p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
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