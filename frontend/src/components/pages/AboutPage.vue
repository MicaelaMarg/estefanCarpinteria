<template>
  <section class="section-container py-16">
    <div class="mx-auto max-w-4xl space-y-10">
      <header class="space-y-4">
        <p class="text-sm font-semibold uppercase tracking-[0.16em] text-industrial-yellow">Nosotros</p>
        <h1 class="title-xl text-5xl text-deep-black">Historia, oficio y precision</h1>
        <p class="text-lg text-neutral-700">
          Somos un taller de carpinteria enfocado en piezas de alto valor estetico y funcional, combinando tradicion artesanal con procesos modernos de fabricacion.
        </p>
      </header>

      <img
        src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=1400&q=80"
        alt="Taller de carpinteria"
        class="h-[420px] w-full rounded-2xl object-cover shadow-xl"
        loading="lazy"
      />

      <div class="grid gap-8 md:grid-cols-2">
        <article class="card-soft p-6">
          <h2 class="text-2xl font-bold text-deep-black">Nuestra filosofia</h2>
          <p class="mt-3 text-neutral-700">
            Disenamos para durar. Cada proyecto se define junto al cliente, seleccionando maderas, herrajes y acabados que expresan personalidad y calidad.
          </p>
        </article>
        <article class="card-soft p-6">
          <h2 class="text-2xl font-bold text-deep-black">Proceso de trabajo</h2>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
            <li>Relevamiento y concepto</li>
            <li>Diseno tecnico y materiales</li>
            <li>Fabricacion en taller</li>
            <li>Instalacion y control final</li>
          </ul>
        </article>
      </div>

      <div class="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 class="text-2xl font-bold text-deep-black">Linea de tiempo</h3>
        <ol class="mt-5 space-y-4 border-l-2 border-industrial-yellow pl-5">
          <li>
            <p class="text-sm font-bold text-wood-brown">2017</p>
            <p class="text-neutral-700">Inicio del taller con enfoque en mobiliario residencial.</p>
          </li>
          <li>
            <p class="text-sm font-bold text-wood-brown">2021</p>
            <p class="text-neutral-700">Expansion a proyectos comerciales y piezas a medida premium.</p>
          </li>
          <li>
            <p class="text-sm font-bold text-wood-brown">2026</p>
            <p class="text-neutral-700">Integracion digital completa con catalogo online y atencion directa.</p>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>