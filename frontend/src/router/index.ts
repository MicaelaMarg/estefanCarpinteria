import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '../views/AboutView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue'
import AdminOrdersView from '../views/AdminOrdersView.vue'
import AdminProductsView from '../views/AdminProductsView.vue'
import CartView from '../views/CartView.vue'
import CatalogView from '../views/CatalogView.vue'
import ContactView from '../views/ContactView.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import PaymentFailureView from '../views/PaymentFailureView.vue'
import PaymentPendingView from '../views/PaymentPendingView.vue'
import PaymentSuccessView from '../views/PaymentSuccessView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/catalogo', name: 'catalog', component: CatalogView },
    { path: '/carrito', name: 'cart', component: CartView },
    { path: '/pago/exito', name: 'payment-success', component: PaymentSuccessView },
    { path: '/pago/error', name: 'payment-failure', component: PaymentFailureView },
    { path: '/pago/pendiente', name: 'payment-pending', component: PaymentPendingView },
    { path: '/nosotros', name: 'about', component: AboutView },
    { path: '/contacto', name: 'contact', component: ContactView },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'admin-dashboard' } },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboardView,
        },
        {
          path: 'pedidos',
          name: 'admin-orders',
          component: AdminOrdersView,
        },
        {
          path: 'productos',
          name: 'admin-products',
          component: AdminProductsView,
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to) => {
  const needsAuth = to.matched.some((r) => r.meta.requiresAuth)
  if (needsAuth && !localStorage.getItem('token')) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
