<script setup lang="ts">
import { onMounted } from 'vue'
import { useProducts } from '../../composables/useProducts'
import HeroSection from '../HeroSection.vue'
import ProductCard from '../ProductCard.vue'

const { products, loading, limit, fetchProducts } = useProducts()

limit.value = 3

onMounted(() => {
  void fetchProducts()
})
</script>

<template>
  <div>
    <HeroSection
      title="Fabricamos calidad en madera"
      subtitle="Disenamos muebles a medida con enfoque artesanal, materiales nobles y terminaciones premium para hogares y espacios comerciales."
      media-url="https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1600&q=80"
    />

    <section class="section-container py-16">
      <div class="mb-8 flex items-end justify-between">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Destacados</p>
          <h2 class="mt-2 text-4xl font-black text-deep-black">Productos recomendados</h2>
        </div>
      </div>

      <div v-if="loading" class="grid gap-6 md:grid-cols-3">
        <div v-for="n in 3" :key="n" class="h-80 animate-pulse rounded-2xl bg-neutral-200" />
      </div>

      <div v-else class="grid gap-6 md:grid-cols-3">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          @detail="$router.push(`/catalogo?producto=${$event}`)"
        />
      </div>
    </section>

    <section class="bg-deep-black py-14 text-soft-white">
      <div class="section-container flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-3xl font-extrabold">Seguinos en redes</h3>
          <p class="mt-2 text-neutral-300">Nuevos proyectos, procesos de taller y lanzamientos exclusivos.</p>
        </div>
        <div class="flex gap-3">
          <a href="https://instagram.com/maderaenveta/" target="_blank" rel="noreferrer" class="rounded-lg border border-neutral-700 px-4 py-2 hover:border-industrial-yellow hover:text-industrial-yellow">Instagram</a>
        </div>
      </div>
    </section>
  </div>
</template>