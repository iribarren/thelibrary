import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useGameStore } from '@/stores/game.js'

// Views — lazy loaded
const StartView       = () => import('@/views/StartView.vue')
const PrologueView    = () => import('@/views/aventura-rapida/PrologueView.vue')
const ChapterView     = () => import('@/views/aventura-rapida/ChapterView.vue')
const EpilogueView    = () => import('@/views/aventura-rapida/EpilogueView.vue')
const CompletedView   = () => import('@/views/aventura-rapida/CompletedView.vue')

const routes = [
  { path: '/',                              component: StartView },
  { path: '/aventura-rapida',               redirect: '/aventura-rapida/prologue' },
  { path: '/aventura-rapida/prologue',      component: PrologueView,  meta: { requiresGame: true, requiresAuth: true } },
  { path: '/aventura-rapida/chapter',       component: ChapterView,   meta: { requiresGame: true, requiresAuth: true } },
  { path: '/aventura-rapida/epilogue',      component: EpilogueView,  meta: { requiresGame: true, requiresAuth: true } },
  { path: '/aventura-rapida/completed',     component: CompletedView, meta: { requiresGame: true, requiresAuth: true } },
  // Fallback
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Guard: redirect to start if auth or active game is missing
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      return '/'
    }
  }
  if (to.meta.requiresGame) {
    const gameStore = useGameStore()
    if (!gameStore.gameId) {
      return '/'
    }
  }
})

export default router
