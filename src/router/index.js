
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { waitForAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/deck/:id',
      name: 'deck-editor',
      component: () => import('../views/DeckEditorView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
  ],
})

// Keep authenticated users away from the login and registration pages.
router.beforeEach(async (to) => {
  const user = await waitForAuth()

  if (to.meta.guestOnly && user) {
    return { name: 'home' }
  }
})

export default router