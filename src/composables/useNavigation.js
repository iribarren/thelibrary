import { useRouter } from 'vue-router'

export function useNavigation() {
  const router = useRouter()

  function navigateToPhase(phase) {
    if (!phase) return router.push('/')
    if (phase === 'prologue')                return router.push('/aventura-rapida/prologue')
    if (phase.startsWith('chapter_'))        return router.push('/aventura-rapida/chapter')
    if (phase.startsWith('epilogue'))        return router.push('/aventura-rapida/epilogue')
    if (phase === 'completed')               return router.push('/aventura-rapida/completed')
    return router.push('/')
  }

  return { navigateToPhase }
}
