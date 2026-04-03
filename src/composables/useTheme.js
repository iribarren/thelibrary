import { computed } from 'vue'
import { useGameStore } from '@/stores/game.js'
import { THEME_NAMES, GENRE_THEME_MAP, EPOCH_THEME_MAP } from '@/constants/themes.js'

const THEME_CLASS_PREFIX = 'theme-'

function applyTheme(themeName) {
  const html = document.documentElement
  Array.from(html.classList)
    .filter(cls => cls.startsWith(THEME_CLASS_PREFIX))
    .forEach(cls => html.classList.remove(cls))
  html.classList.add(themeName)
}

function applyRandomTheme() {
  applyTheme(THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)])
}

export function useTheme() {
  const gameStore = useGameStore()

  const currentTheme = computed(() => {
    const epoch = gameStore.game?.epoch
    const genre = gameStore.game?.genre
    if (epoch && EPOCH_THEME_MAP[epoch]) return EPOCH_THEME_MAP[epoch]
    if (genre && GENRE_THEME_MAP[genre]) return GENRE_THEME_MAP[genre]
    return null
  })

  function applyGameTheme() {
    if (currentTheme.value) applyTheme(currentTheme.value)
  }

  return { currentTheme, applyTheme, applyGameTheme, applyRandomTheme }
}
