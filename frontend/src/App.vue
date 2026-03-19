<script setup lang="ts">
import { RouterView } from 'vue-router'
import Footer from './components/Footer.vue'
import Navbar from './components/Navbar.vue'
import WhatsAppButton from './components/WhatsAppButton.vue'
</script>

<template>
  <div class="min-h-screen bg-soft-white text-deep-black">
    <Navbar />
    <main class="pt-20">
      <RouterView />
    </main>
    <Footer />
    <WhatsAppButton phone="5491112345678" />
  </div>
</template>
