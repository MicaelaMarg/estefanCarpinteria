<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { Product } from '../interfaces/product'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { stockVendido } from '../utils/stock'

const MAX_BYTES = 5 * 1024 * 1024

const products = ref<Product[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const ingresoLoading = ref(false)

const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  description: '',
  price: '' as string | number,
  category: '',
  video_url: '',
  image_url: '',
  stock_cargado: 0,
  stock_disponible: 0,
})

const ingresoCantidad = ref<number | ''>('')

const vendidoPreview = computed(() =>
  stockVendido(Number(form.value.stock_cargado) || 0, Number(form.value.stock_disponible) || 0),
)

const imageFile = ref<File | null>(null)
const pickedPreview = ref('')

const coverImageSrc = computed(() => {
  if (pickedPreview.value) return pickedPreview.value
  if (form.value.image_url) return resolveMediaUrl(form.value.image_url)
  return ''
})

const lineaStock = (p: Product) => {
  const c = Number(p.stock_cargado ?? 0)
  const d = Number(p.stock_disponible ?? 0)
  const v = stockVendido(c, d)
  return `Cargadas ${c} · Disponibles ${d} · Vendidas ${v}`
}

const resetForm = () => {
  if (pickedPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(pickedPreview.value)
  }
  editingId.value = null
  form.value = {
    name: '',
    description: '',
    price: '',
    category: '',
    video_url: '',
    image_url: '',
    stock_cargado: 0,
    stock_disponible: 0,
  }
  imageFile.value = null
  pickedPreview.value = ''
  ingresoCantidad.value = ''
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  imageFile.value = file

  if (pickedPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(pickedPreview.value)
  }
  pickedPreview.value = file ? URL.createObjectURL(file) : ''

  if (file && file.size > MAX_BYTES) {
    toast.error('La imagen no puede superar 5 MB')
    input.value = ''
    imageFile.value = null
    pickedPreview.value = ''
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await configApi.get<ApiResponse<Product[]>>('/admin/products', {
      params: { limit: 200, page: 1 },
    })
    products.value = data.data
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const resolveImageUrlForSave = async (): Promise<string> => {
  if (imageFile.value) {
    const fd = new FormData()
    fd.append('image', imageFile.value)
    const { data } = await configApi.post<ApiResponse<{ url: string }>>('/admin/upload', fd)
    return data.data.url
  }
  if (!form.value.image_url?.trim()) {
    throw new Error('Subí una imagen o indicá una URL')
  }
  return form.value.image_url.trim()
}

const saveProduct = async () => {
  saving.value = true
  try {
    const image_url = await resolveImageUrlForSave()
    const price = Number(form.value.price)
    const name = form.value.name.trim()
    const description = form.value.description.trim()
    const category = form.value.category.trim()
    const video_url = form.value.video_url.trim() || null
    const stock_cargado = Math.floor(Number(form.value.stock_cargado)) || 0
    const stock_disponible = Math.floor(Number(form.value.stock_disponible)) || 0

    if (!name || !description || !category || !Number.isFinite(price) || price < 0) {
      toast.error('Completá nombre, descripción, categoría y precio válido')
      return
    }
    if (stock_disponible > stock_cargado) {
      toast.error('Disponible no puede ser mayor que mercadería cargada')
      return
    }

    if (editingId.value) {
      await configApi.patch(`/admin/products/${editingId.value}`, {
        name,
        description,
        price,
        category,
        image_url,
        video_url,
        stock_cargado,
        stock_disponible,
      })
      toast.success('Producto actualizado')
    } else {
      await configApi.post('/admin/products', {
        name,
        description,
        price,
        category,
        image_url,
        video_url,
        stock_cargado,
        stock_disponible,
      })
      toast.success('Producto creado')
    }
    await fetchList()
    resetForm()
  } catch (err) {
    if (err instanceof Error && err.message === 'Subí una imagen o indicá una URL') {
      toast.error(err.message)
    }
  } finally {
    saving.value = false
  }
}

const aplicarIngresoMercaderia = async () => {
  if (!editingId.value) {
    toast.error('Seleccioná un producto para ingreso')
    return
  }
  const n = Math.floor(Number(ingresoCantidad.value))
  if (!Number.isFinite(n) || n < 1) {
    toast.error('Ingresá una cantidad entera mayor a 0')
    return
  }
  ingresoLoading.value = true
  try {
    await configApi.post(`/admin/products/${editingId.value}/stock-ingreso`, { cantidad: n })
    toast.success(`Se sumaron ${n} unidad(es) a cargado y disponible`)
    ingresoCantidad.value = ''
    await fetchList()
    const p = products.value.find((x) => x.id === editingId.value)
    if (p) startEdit(p)
  } finally {
    ingresoLoading.value = false
  }
}

const startEdit = (p: Product) => {
  if (pickedPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(pickedPreview.value)
  }
  editingId.value = p.id
  form.value = {
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    video_url: p.video_url ?? '',
    image_url: p.image_url,
    stock_cargado: Number(p.stock_cargado ?? 0),
    stock_disponible: Number(p.stock_disponible ?? 0),
  }
  imageFile.value = null
  pickedPreview.value = ''
  ingresoCantidad.value = ''
}

const removeProduct = async (p: Product) => {
  if (!window.confirm(`¿Eliminar "${p.name}"?`)) return
  try {
    await configApi.delete(`/admin/products/${p.id}`)
    toast.success('Producto eliminado')
    if (editingId.value === p.id) resetForm()
    await fetchList()
  } catch {
    /* toast vía interceptor */
  }
}

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <section class="section-container py-10">
    <div class="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.14em] text-industrial-yellow">Administración</p>
        <h1 class="text-3xl font-black text-deep-black">Productos y stock</h1>
        <p class="text-sm text-neutral-600">{{ total }} en catálogo</p>
      </div>
      <button type="button" class="btn-primary px-4 py-2 text-sm" @click="resetForm">Nuevo producto</button>
    </div>

    <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div class="card-soft overflow-hidden p-0">
        <div v-if="loading" class="p-8 text-center text-neutral-500">Cargando…</div>
        <ul v-else class="divide-y divide-neutral-200">
          <li
            v-for="p in products"
            :key="p.id"
            class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 items-center gap-4">
              <img
                :src="resolveMediaUrl(p.image_url)"
                :alt="p.name"
                class="h-16 w-20 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
              <div class="min-w-0">
                <p class="truncate font-bold text-deep-black">{{ p.name }}</p>
                <p class="text-sm text-neutral-500">{{ p.category }} · ${{ p.price.toLocaleString('es-AR') }}</p>
                <p class="text-xs font-medium text-neutral-600">{{ lineaStock(p) }}</p>
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <button type="button" class="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" @click="startEdit(p)">
                Editar
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                @click="removeProduct(p)"
              >
                Eliminar
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="card-soft space-y-4 p-6">
        <h2 class="text-lg font-black text-deep-black">{{ editingId ? 'Editar producto' : 'Alta de producto' }}</h2>

        <p class="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-700">
          <strong>Stock manual:</strong> «Mercadería cargada» es lo que pusiste a la venta (referencia). «Disponible» es lo
          que queda ahora (lo actualizás cuando vendés o inventariás).
          <strong>Vendidas</strong> se calcula solo: cargadas − disponibles. Para nueva mercadería sin cambiar lo ya vendido,
          usá «Ingreso de mercadería».
        </p>

        <div class="rounded-xl border border-neutral-200 bg-soft-white p-3">
          <p class="text-xs font-semibold text-neutral-600">Vendidas (automático)</p>
          <p class="text-2xl font-black text-deep-black">{{ vendidoPreview }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-neutral-600">Mercadería cargada (unid.)</label>
            <input
              v-model.number="form.stock_cargado"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-neutral-600">Disponible ahora (unid.)</label>
            <input
              v-model.number="form.stock_disponible"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div v-if="editingId" class="flex flex-wrap items-end gap-2 rounded-xl border border-industrial-yellow/40 bg-industrial-yellow/10 p-3">
          <div class="min-w-[120px] flex-1">
            <label class="mb-1 block text-xs font-semibold text-neutral-700">Ingreso de mercadería (+unid.)</label>
            <input
              v-model.number="ingresoCantidad"
              type="number"
              min="1"
              step="1"
              placeholder="Ej. 10"
              class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            class="btn-primary px-4 py-2 text-sm"
            :disabled="ingresoLoading"
            @click="aplicarIngresoMercaderia"
          >
            {{ ingresoLoading ? '…' : 'Sumar ingreso' }}
          </button>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-neutral-600">Imagen (WebP optimizado al subir)</label>
          <input type="file" accept="image/*" class="w-full text-sm" @change="onFileChange" />
          <p class="mt-1 text-xs text-neutral-500">Máx. 5 MB. Si editás sin cambiar archivo, se mantiene la imagen actual.</p>
          <div v-if="coverImageSrc" class="mt-3 overflow-hidden rounded-xl border border-neutral-200">
            <img :src="coverImageSrc" alt="Vista previa" class="h-40 w-full object-cover" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-neutral-600">Nombre</label>
          <input v-model="form.name" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-neutral-600">Descripción</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-neutral-600">Precio</label>
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-neutral-600">Categoría</label>
            <input v-model="form.category" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-neutral-600">Video URL (opcional)</label>
          <input v-model="form.video_url" type="url" class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
        </div>

        <div class="flex gap-2 pt-2">
          <button type="button" class="btn-primary flex-1 px-4 py-2.5 text-sm" :disabled="saving" @click="saveProduct">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm" @click="resetForm">
            Limpiar
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
