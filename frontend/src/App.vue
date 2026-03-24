<script setup lang="ts">
import { RouterView } from 'vue-router'
import Footer from './components/Footer.vue'
import Navbar from './components/Navbar.vue'
import WhatsAppButton from './components/WhatsAppButton.vue'
</script>

<template>
  <div class="relative isolate min-h-screen text-soft-white">
    <div class="pointer-events-none fixed inset-0 -z-30 wood-bg-photo" aria-hidden="true" />
    <div class="pointer-events-none fixed inset-0 -z-20 inferno-gradient" aria-hidden="true" />
    <div class="pointer-events-none fixed inset-0 -z-10 inferno-noise" aria-hidden="true" />
    <Navbar />
    <main class="relative z-10 pt-20">
      <RouterView />
    </main>
    <Footer />
    <WhatsAppButton phone="5492236955009" />
  </div>
</template>
