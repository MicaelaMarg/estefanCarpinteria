import { computed, ref } from 'vue'
import configApi from '../api/configApi'
import type { ApiResponse } from '../interfaces/api'
import type { Product, ProductFilters } from '../interfaces/product'

const DEFAULT_LIMIT = 9

export function useProducts() {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const page = ref(1)
  const limit = ref(DEFAULT_LIMIT)
  const total = ref(0)
  const selectedProduct = ref<Product | null>(null)
  const filters = ref<ProductFilters>({
    q: '',
    category: '',
    minPrice: null,
    maxPrice: null,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

  const fetchProducts = async () => {
    loading.value = true

    try {
      const { data } = await configApi.get<ApiResponse<Product[]>>('/products', {
        params: {
          page: page.value,
          limit: limit.value,
          q: filters.value.q || undefined,
          category: filters.value.category || undefined,
          minPrice: filters.value.minPrice ?? undefined,
          maxPrice: filters.value.maxPrice ?? undefined,
        },
      })

      products.value = data.data
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  const fetchProductById = async (id: number) => {
    loading.value = true
    try {
      const { data } = await configApi.get<ApiResponse<Product>>(`/products/${id}`)
      selectedProduct.value = data.data
    } finally {
      loading.value = false
    }
  }

  const setPage = async (nextPage: number) => {
    page.value = nextPage
    await fetchProducts()
  }

  const applyFilters = async (nextFilters: ProductFilters) => {
    filters.value = nextFilters
    page.value = 1
    await fetchProducts()
  }

  return {
    products,
    loading,
    selectedProduct,
    page,
    limit,
    total,
    totalPages,
    filters,
    fetchProducts,
    fetchProductById,
    setPage,
    applyFilters,
  }
}
