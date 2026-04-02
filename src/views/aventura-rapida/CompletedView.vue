<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.js'
import * as API from '@/api/index.js'
import AppLayout from '@/layout/AppLayout.vue'

const { t } = useI18n()
const router = useRouter()
const gameStore = useGameStore()

const journalEntries = ref([])

const game = computed(() => gameStore.game)
const finalRoll = computed(() =>
  game.value?.roll_results?.find(r => r.phase === 'epilogue_final') ?? null
)
const outcomeClass = computed(() => finalRoll.value?.outcome || 'miss')
const outcomeLabel = computed(() =>
  finalRoll.value ? t(`outcomes.${finalRoll.value.outcome}`, finalRoll.value.outcome) : '—'
)

onMounted(async () => {
  try {
    journalEntries.value = await API.fetchJournalEntries(game.value.id)
  } catch { /* non-critical */ }
})

function getBookForEntry(entry) {
  if (!entry.book_id) return null
  return game.value?.books?.find(b => b.id === entry.book_id) ?? null
}

function getPhaseLabel(phase) {
  return t(`phases.${phase}`, phase)
}

function getAttrLabel(type) {
  return t(`attributes.${type}`, type)
}

function startNewGame() {
  if (confirm(t('completed.confirm_new_game'))) {
    gameStore.resetState()
    router.push('/')
  }
}
</script>

<template>
  <AppLayout>
    <div class="screen-header">
      <h2 class="screen-title">{{ t('completed.title') }}</h2>
      <p class="screen-subtitle">{{ t('completed.subtitle') }}</p>
    </div>

    <!-- Summary header -->
    <div class="summary-header">
      <div style="font-size:48px;">📚</div>
      <h3 style="font-family:var(--font-heading);font-size:var(--fs-xl);color:var(--color-gold);">
        {{ game?.character_name || t('start.no_name') }}
      </h3>
      <div style="display:flex;gap:var(--space-3);">
        <span class="setting-badge">{{ game?.genre || '—' }}</span>
        <span class="setting-badge">{{ game?.epoch || '—' }}</span>
      </div>
      <div v-if="finalRoll" :class="['summary-final-result', outcomeClass]">
        {{ outcomeLabel }} — {{ t('completed.overcome_points', { score: game?.overcome_score ?? 0 }) }}
      </div>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-secondary" @click="window.print()">
          {{ t('completed.export_btn') }}
        </button>
        <button class="btn btn-danger btn-sm" @click="startNewGame">
          {{ t('completed.new_game_btn') }}
        </button>
      </div>
    </div>

    <!-- Journal entries -->
    <div class="content-section">
      <h3 class="section-title">{{ t('completed.full_journal_title') }}</h3>
      <div id="full-journal" style="display:flex;flex-direction:column;gap:var(--space-5);">
        <p v-if="!journalEntries.length" class="text-muted text-sm" style="font-style:italic;">
          {{ t('completed.no_journal') }}
        </p>
        <div v-for="entry in journalEntries" :key="entry.id" class="journal-entry">
          <div class="journal-entry-header">
            <span class="journal-entry-phase">{{ getPhaseLabel(entry.phase) }}</span>
            <span v-if="getBookForEntry(entry)" class="journal-entry-book">
              {{ getBookForEntry(entry).color }} · {{ getBookForEntry(entry).binding }}
            </span>
          </div>
          <div class="journal-entry-body">{{ entry.content }}</div>
        </div>
      </div>
    </div>

    <!-- Roll log -->
    <div class="content-section">
      <h3 class="section-title">{{ t('completed.roll_log_title') }}</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <p v-if="!game?.roll_results?.length" class="text-muted text-sm">{{ t('completed.no_rolls') }}</p>
        <div
          v-for="roll in game?.roll_results"
          :key="roll.id"
          style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-3) var(--space-4);background:rgba(26,26,46,0.5);border:1px solid var(--color-border-panel);border-radius:var(--radius-md);"
        >
          <span style="font-family:var(--font-heading);font-size:var(--fs-xs);color:var(--color-text-muted);min-width:120px;">
            {{ getPhaseLabel(roll.phase) }}
          </span>
          <span style="font-size:var(--fs-xs);color:var(--color-text-panel);">
            {{ getAttrLabel(roll.attribute_type) }}
          </span>
          <span
            style="margin-left:auto;font-family:var(--font-heading);font-size:var(--fs-xs);"
            :class="`outcome-${roll.outcome === 'hit' ? 'hit' : roll.outcome === 'weak_hit' ? 'partial' : 'miss'}`"
          >
            {{ t(`outcomes.${roll.outcome}`, roll.outcome) }}
          </span>
          <span style="font-family:var(--font-heading);font-size:var(--fs-sm);color:var(--color-gold);">
            {{ roll.action_score ?? '—' }}
          </span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
