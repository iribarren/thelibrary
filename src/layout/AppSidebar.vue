<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.js'
import { fetchJournalEntries } from '@/api/index.js'
import PhaseStepper from '@/components/PhaseStepper.vue'
import { setLocale, getCurrentLocale } from '@/i18n/index.js'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()

const journalOpen     = ref(false)
const journalEntries  = ref([])
const journalLoading  = ref(false)
const showExitConfirm = ref(false)

const game = computed(() => gameStore.game)
const phase = computed(() => gameStore.currentPhase)
const showOvercome = computed(() => {
  const p = phase.value || ''
  return p.startsWith('epilogue') || p === 'completed'
})

function getAttributeTotal(attr) {
  return (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0)
}

function isAttrUsed(attr) {
  const p = phase.value || ''
  if (p.startsWith('epilogue') || p === 'completed') {
    return gameStore.usedEpilogueAttributes.has(attr.type)
  }
  return gameStore.usedChapterAttributes.has(attr.type)
}

async function openJournal() {
  journalOpen.value = true
  journalLoading.value = true
  try {
    journalEntries.value = await fetchJournalEntries(gameStore.gameId)
  } catch {
    journalEntries.value = []
  } finally {
    journalLoading.value = false
  }
}

function closeJournal() {
  journalOpen.value = false
}

function confirmExit() {
  showExitConfirm.value = true
}

function cancelExit() {
  showExitConfirm.value = false
}

function exitGame() {
  gameStore.resetState()
  showExitConfirm.value = false
  router.replace('/')
}

function onLocaleChange(e) {
  setLocale(e.target.value)
}

const currentLocale = computed(() => getCurrentLocale())

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}
</script>

<template>
  <aside class="sidebar" id="sidebar">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div id="sidebar-brand-title" class="sidebar-brand-title">{{ t('sidebar.title') }}</div>
      <div id="sidebar-brand-subtitle" class="sidebar-brand-subtitle">{{ t('sidebar.subtitle') }}</div>
    </div>

    <!-- Phase indicator -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">{{ t('sidebar.current_phase') }}</div>
      <div id="sidebar-phase">
        <span class="phase-indicator-text">{{ phase ? t(`phases.${phase}`, phase) : '—' }}</span>
      </div>
    </div>

    <!-- Character info -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">{{ t('sidebar.character') }}</div>
      <div id="sidebar-character">
        <template v-if="game?.character_name">
          <div class="character-name">{{ game.character_name }}</div>
          <div v-if="game.character_description" class="character-detail">
            {{ truncate(game.character_description, 80) }}
          </div>
          <div class="character-setting">
            <span v-if="game.genre" class="setting-badge">{{ game.genre }}</span>
            <span v-if="game.epoch" class="setting-badge">{{ game.epoch }}</span>
          </div>
        </template>
        <div v-else class="character-detail text-muted">{{ t('sidebar.no_character') }}</div>
      </div>
    </div>

    <!-- Attributes -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">{{ t('sidebar.attributes') }}</div>
      <div id="sidebar-attributes">
        <div
          v-for="attr in gameStore.attributes"
          :key="attr.type"
          :class="['attribute-row', { used: isAttrUsed(attr) }]"
        >
          <div class="attribute-row-header">
            <span class="attribute-label">{{ t(`attributes.${attr.type}`) }}</span>
            <span class="attribute-total">{{ getAttributeTotal(attr) }}</span>
          </div>
          <div class="attribute-breakdown">
            <div class="attr-pip">
              <span class="attr-pip-label">{{ t('attribute_breakdown.base') }}</span>
              <span class="attr-pip-value">{{ attr.base_value ?? 0 }}</span>
            </div>
            <div class="attr-pip">
              <span class="attr-pip-label">{{ t('attribute_breakdown.background') }}</span>
              <span class="attr-pip-value">{{ attr.background ?? 0 }}</span>
            </div>
            <div class="attr-pip">
              <span class="attr-pip-label">{{ t('attribute_breakdown.support') }}</span>
              <span class="attr-pip-value">{{ attr.support ?? 0 }}</span>
              <span v-if="(attr.support ?? 0) > 0 && attr.support_title" class="attr-pip-subtitle">{{ attr.support_title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overcome score (epilogue+) -->
    <div v-if="showOvercome" id="sidebar-overcome" class="sidebar-section">
      <span class="sidebar-section-label">{{ t('sidebar.overcome_points') }}</span>
      <span class="overcome-value">{{ gameStore.overcomeScore }}</span>
    </div>

    <!-- Phase progress -->
    <div class="sidebar-section">
      <div class="sidebar-section-label">{{ t('sidebar.progress') }}</div>
      <PhaseStepper />
    </div>

    <!-- Actions -->
    <div class="sidebar-actions">
      <button id="btn-journal-toggle" class="btn btn-ghost btn-sm" @click="openJournal">
        📜 {{ t('sidebar.view_journal') }}
      </button>
      <button id="btn-exit-game" class="btn btn-ghost btn-sm" @click="confirmExit">
        ← {{ t('sidebar.back_to_start') }}
      </button>
    </div>

    <!-- Locale switcher -->
    <div class="sidebar-locale">
      <select id="locale-select-sidebar" class="form-control form-control-sm" :value="currentLocale" @change="onLocaleChange">
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>

    <!-- Exit confirmation overlay -->
    <Teleport to="body">
      <div v-if="showExitConfirm" class="exit-confirm-overlay">
        <div class="exit-confirm-box">
          <p class="exit-confirm-title">{{ t('modal.exit_title') }}</p>
          <p class="exit-confirm-text text-muted text-sm">{{ t('modal.exit_text') }}</p>
          <div class="exit-confirm-actions">
            <button class="btn btn-danger btn-sm" @click="exitGame">{{ t('modal.exit_no_save') }}</button>
            <button class="btn btn-ghost btn-sm" @click="cancelExit">{{ t('modal.cancel') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Journal panel -->
    <div :class="['journal-panel', { open: journalOpen }]" id="journal-panel">
      <div class="journal-panel-header">
        <span id="journal-panel-title-text">📜 {{ t('journal.title') }}</span>
        <button id="journal-panel-close" :aria-label="t('journal.close_aria')" class="btn btn-ghost btn-sm" @click="closeJournal">✕</button>
      </div>
      <div class="journal-panel-body">
        <p v-if="journalLoading" class="text-muted text-sm">…</p>
        <p v-else-if="!journalEntries.length" id="journal-panel-empty" class="text-muted text-sm">
          {{ t('journal.empty_prompt') }}
        </p>
        <div v-else>
          <div v-for="entry in journalEntries" :key="entry.id" class="journal-entry-item">
            <div class="journal-entry-phase text-muted text-sm">{{ t(`phases.${entry.phase}`, entry.phase) }}</div>
            <blockquote class="journal-entry-display">{{ entry.content }}</blockquote>
          </div>
        </div>
      </div>
    </div>
    <div v-if="journalOpen" class="panel-overlay" @click="closeJournal" />
  </aside>
</template>
