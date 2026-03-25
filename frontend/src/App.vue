<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Footer from './components/Footer.vue'
import Navbar from './components/Navbar.vue'
import WhatsAppButton from './components/WhatsAppButton.vue'

const route = useRoute()
const showPublicChrome = computed(() => !route.path.startsWith('/admin'))
const mainPadTop = computed(() => (showPublicChrome.value ? 'pt-20' : 'pt-0'))
</script>

<template>
  <div class="relative isolate min-h-screen text-soft-white">
    <div class="pointer-events-none fixed inset-0 -z-30 wood-bg-photo" aria-hidden="true" />
    <div class="pointer-events-none fixed inset-0 -z-20 inferno-gradient" aria-hidden="true" />
    <div class="pointer-events-none fixed inset-0 -z-10 inferno-noise" aria-hidden="true" />
    <Navbar v-if="showPublicChrome" />
    <main class="relative z-10" :class="mainPadTop">
      <RouterView />
    </main>
    <Footer />
    <WhatsAppButton v-if="showPublicChrome" phone="5492236955009" />
  </div>
</template>
