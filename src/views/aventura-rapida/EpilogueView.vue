<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/game.js'
import { useNavigation } from '@/composables/useNavigation.js'
import * as API from '@/api/index.js'
import AppLayout from '@/layout/AppLayout.vue'
import BookReveal from '@/components/BookReveal.vue'
import DiceRoll from '@/components/DiceRoll.vue'
import AttributeSelector from '@/components/AttributeSelector.vue'
import MessageBar from '@/components/MessageBar.vue'

const { t } = useI18n()
const gameStore = useGameStore()
const { navigateToPhase } = useNavigation()

// Sub-state: 'book-discovery' | 'action' | 'final'
const subState = computed(() => {
  const phase = gameStore.currentPhase
  // Keep 'final' sub-screen after resolveFinalRoll advances phase to 'completed'
  if (phase === 'epilogue_final' || phase === 'completed') return 'final'
  const hasBook = gameStore.game?.books?.some(b => b.phase?.startsWith('epilogue'))
  if (phase === 'epilogue_action_1' && !hasBook) return 'book-discovery'
  return 'action'
})

const actionNum = computed(() => gameStore.currentEpilogueActionNumber)
const epilogueBook = computed(() =>
  gameStore.game?.books?.find(b => b.phase?.startsWith('epilogue')) ?? null
)
const lastEpilogueJournal = computed(() => {
  const entries = (gameStore.game?.journal_entries ?? [])
    .filter(j => j.phase?.startsWith('epilogue'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  return entries.at(-1) ?? null
})

// Book discovery
const bookLoading    = ref(false)
const bookError      = ref('')
const bookRevealed   = ref(false)
const newBook        = ref(null)
const preJournal     = ref('')
const preJournalErr  = ref('')
const preJournalLoad = ref(false)
const showPreJournal = ref(false)

// Action roll
const selectedAttr    = ref(null)
const selectedSupport = ref(null)
const actionLoading   = ref(false)
const actionError     = ref('')
const actionRollResult = ref(null)
const showPostRoll    = ref(false)
const postRollJournal = ref('')
const postRollErr     = ref('')
const postRollLoad    = ref(false)
const step            = ref('select') // 'select' | 'rolled' | 'journal-saved'

// Final roll
const finalLoading      = ref(false)
const finalError        = ref('')
const finalRollResult   = ref(null)
const showPostFinal     = ref(false)
const postFinalJournal  = ref('')
const postFinalErr      = ref('')
const postFinalLoad     = ref(false)
const showFinishButton  = ref(false)

onMounted(() => {
  gameStore.clearRollResult()
})

// ── Book discovery ────────────────────────────────────────────
async function onDiscoverEpilogueBook() {
  bookError.value = ''
  bookLoading.value = true
  try {
    const book = await API.generateEpilogueBook(gameStore.gameId)
    newBook.value = book
    gameStore.setCurrentBook(book)
    bookRevealed.value = true
  } catch (err) {
    bookError.value = err.message
  } finally {
    bookLoading.value = false
  }
}

function onBookRevealComplete() {
  showPreJournal.value = true
}

async function onPreJournalContinue() {
  preJournalErr.value = ''
  if (!preJournal.value.trim()) {
    preJournalErr.value = t('journal.write_before_continue')
    return
  }
  preJournalLoad.value = true
  try {
    const book = newBook.value ?? epilogueBook.value
    await API.saveJournalEntry(gameStore.gameId, preJournal.value.trim(), book?.id ?? null)
    // Refresh game so epilogueBook computed picks up the newly generated book
    const updatedGame = await API.fetchGame(gameStore.gameId)
    gameStore.setGame(updatedGame)
    // subState computed will switch to 'action' once game.books is populated
    window.scrollTo(0, 0)
  } catch (err) {
    preJournalErr.value = err.message
  } finally {
    preJournalLoad.value = false
  }
}

// ── Epilogue action ───────────────────────────────────────────
async function onRollAction() {
  if (!selectedAttr.value) return
  actionError.value = ''
  actionLoading.value = true
  try {
    const response = await API.rollEpilogueAction(
      gameStore.gameId,
      selectedAttr.value,
      selectedSupport.value,
    )
    gameStore.setGameWithRoll(response.game, response.roll_result)
    actionRollResult.value = response.roll_result
    // DiceRoll watcher fires
  } catch (err) {
    actionError.value = err.message
    actionLoading.value = false
  }
}

function onActionDiceComplete() {
  actionLoading.value = false
  showPostRoll.value = true
}

async function onPostRollContinue() {
  postRollErr.value = ''
  if (!postRollJournal.value.trim()) {
    postRollErr.value = t('journal.write_before_continue')
    return
  }
  postRollLoad.value = true
  try {
    const book = epilogueBook.value ?? newBook.value
    await API.saveJournalEntry(gameStore.gameId, postRollJournal.value.trim(), book?.id ?? null)
    // Phase was already advanced by resolveEpilogueAction during the roll (stored via setGameWithRoll).
    // Reset local state so the next action starts clean; subState computed drives the sub-screen switch.
    showPostRoll.value     = false
    actionRollResult.value = null
    selectedAttr.value     = null
    selectedSupport.value  = null
    postRollJournal.value  = ''
    actionError.value      = ''
    postRollErr.value      = ''
    window.scrollTo(0, 0)
  } catch (err) {
    postRollErr.value = err.message
  } finally {
    postRollLoad.value = false
  }
}

// ── Final roll ────────────────────────────────────────────────
async function onRollFinal() {
  finalError.value = ''
  finalLoading.value = true
  try {
    const response = await API.rollEpilogueFinal(gameStore.gameId)
    gameStore.setGameWithRoll(response.game, response.roll_result)
    finalRollResult.value = response.roll_result
  } catch (err) {
    finalError.value = err.message
    finalLoading.value = false
  }
}

function onFinalDiceComplete() {
  finalLoading.value = false
  showPostFinal.value = true
  showFinishButton.value = true
}

async function onEpilogueFinish() {
  postFinalErr.value = ''
  if (!postFinalJournal.value.trim()) {
    postFinalErr.value = t('journal.write_before_continue')
    return
  }
  postFinalLoad.value = true
  try {
    const book = epilogueBook.value ?? newBook.value
    await API.saveJournalEntry(gameStore.gameId, postFinalJournal.value.trim(), book?.id ?? null)
    // Phase is already 'completed' in the store (set by resolveFinalRoll via setGameWithRoll)
    navigateToPhase('completed')
  } catch (err) {
    postFinalErr.value = err.message
    postFinalLoad.value = false
  }
}
</script>

<template>
  <AppLayout>
    <!-- ── Book discovery sub-screen ─────────────────────── -->
    <template v-if="subState === 'book-discovery'">
      <div class="screen-header">
        <h2 class="screen-title">{{ t('epilogue.title') }}</h2>
        <p class="screen-subtitle">{{ t('epilogue.subtitle') }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">{{ t('epilogue.book_title') }}</h3>
        <MessageBar :message="bookError" />
        <div id="epilogue-book-container">
          <button v-if="!bookRevealed" class="btn btn-secondary" :disabled="bookLoading" @click="onDiscoverEpilogueBook">
            <span class="btn-text">📖 {{ t('epilogue.discover_epilogue_btn') }}</span>
            <span v-if="bookLoading" class="btn-spinner"><span class="spinner" /></span>
          </button>
          <BookReveal v-if="bookRevealed && newBook" :book="newBook" @complete="onBookRevealComplete" />
        </div>
      </div>

      <div v-if="showPreJournal" class="content-section">
        <h3 class="section-title">{{ t('epilogue.pre_journal_title') }}</h3>
        <MessageBar :message="preJournalErr" />
        <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.pre_journal_help') }}</p>
        <textarea v-model="preJournal" class="journal-textarea" :placeholder="t('epilogue.pre_journal_placeholder')" />
        <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
          <button class="btn btn-primary" :disabled="preJournalLoad" @click="onPreJournalContinue">
            <span class="btn-text">{{ t('chapter.continue') }}</span>
            <span v-if="preJournalLoad" class="btn-spinner"><span class="spinner" /></span>
          </button>
        </div>
      </div>
    </template>

    <!-- ── Epilogue action sub-screen ────────────────────── -->
    <template v-else-if="subState === 'action'">
      <div class="screen-header">
        <h2 class="screen-title">{{ t('epilogue.action_title', { num: actionNum }) }}</h2>
        <p class="screen-subtitle">{{ t('epilogue.subtitle') }}</p>
      </div>

      <!-- Book info (context) -->
      <div v-if="epilogueBook" class="content-section">
        <h3 class="section-title">{{ t('epilogue.book_title') }}</h3>
        <div class="book-card">
          <div class="book-card-header">
            <span class="book-card-icon">📚</span>
            <span class="book-card-title">{{ t('book.mysterious_volume') }}</span>
          </div>
          <div class="book-card-body">
            <div v-for="trait in ['color', 'binding', 'smell', 'interior']" :key="trait" class="book-trait">
              <span class="book-trait-label">{{ t(`book.${trait}`) }}</span>
              <span class="book-trait-value">{{ epilogueBook[trait] || '—' }}</span>
              <span v-if="epilogueBook[`${trait}_hint`]" class="book-trait-hint">{{ epilogueBook[`${trait}_hint`] }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Last epilogue journal (read-only context) -->
      <div v-if="lastEpilogueJournal" class="content-section">
        <h3 class="section-title">📜 {{ t('epilogue.last_entry_title') }}</h3>
        <blockquote class="journal-entry-display">{{ lastEpilogueJournal.content }}</blockquote>
      </div>

      <!-- Action: attribute selection + roll -->
      <div class="content-section">
        <h3 class="section-title">{{ t('epilogue.action_section_title', { num: actionNum }) }}</h3>
        <MessageBar :message="actionError" />

        <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.action_choose_attr') }}</p>
        <AttributeSelector
          :attributes="gameStore.attributes"
          :used-attributes="gameStore.usedEpilogueAttributes"
          :selected-attribute="selectedAttr"
          :show-support="true"
          :support-used="gameStore.supportUsed"
          :selected-support="selectedSupport"
          @select="selectedAttr = $event"
          @select-support="selectedSupport = $event"
        />

        <div style="margin-top:var(--space-4);">
          <button
            class="btn btn-primary"
            :disabled="!selectedAttr || actionLoading || showPostRoll"
            @click="onRollAction"
          >
            <span class="btn-text">⚄ {{ t('epilogue.roll_btn') }}</span>
            <span v-if="actionLoading" class="btn-spinner"><span class="spinner" /></span>
          </button>
        </div>

        <div id="epilogue-action-result" style="margin-top:var(--space-5);">
          <DiceRoll :result="actionRollResult" context="epilogue_action" @complete="onActionDiceComplete" />
        </div>

        <div class="overcome-display" style="margin-top:var(--space-4);">
          <span class="overcome-label">{{ t('epilogue.accumulated_points') }}</span>
          <span class="overcome-value">{{ gameStore.overcomeScore }}</span>
        </div>
      </div>

      <!-- Post-roll journal -->
      <div v-if="showPostRoll" class="content-section">
        <h3 class="section-title">{{ t('epilogue.post_roll_title') }}</h3>
        <MessageBar :message="postRollErr" />
        <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.post_roll_help') }}</p>
        <textarea v-model="postRollJournal" class="journal-textarea" :placeholder="t('epilogue.post_roll_placeholder')" />
        <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
          <button class="btn btn-primary" :disabled="postRollLoad" @click="onPostRollContinue">
            <span class="btn-text">{{ t('chapter.continue') }}</span>
            <span v-if="postRollLoad" class="btn-spinner"><span class="spinner" /></span>
          </button>
        </div>
      </div>
    </template>

    <!-- ── Final roll sub-screen ──────────────────────────── -->
    <template v-else-if="subState === 'final'">
      <div class="screen-header">
        <h2 class="screen-title">{{ t('epilogue.final_title') }}</h2>
        <p class="screen-subtitle">{{ t('epilogue.subtitle') }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">{{ t('epilogue.final_section_title') }}</h3>
        <MessageBar :message="finalError" />
        <div class="card" style="text-align:center;padding:var(--space-8);">
          <p class="text-muted text-sm" style="margin-bottom:var(--space-4);">{{ t('epilogue.final_help') }}</p>
          <div class="overcome-display" style="margin:var(--space-5) auto;max-width:200px;">
            <span class="overcome-label">{{ t('epilogue.your_score') }}</span>
            <span class="overcome-value" style="font-size:var(--fs-3xl);">{{ gameStore.overcomeScore }}</span>
          </div>
          <button class="btn btn-primary btn-lg" :disabled="finalLoading || !!finalRollResult" @click="onRollFinal">
            <span class="btn-text">⚄ {{ t('epilogue.final_roll_btn') }}</span>
            <span v-if="finalLoading" class="btn-spinner"><span class="spinner" /></span>
          </button>
          <div id="epilogue-final-result" style="margin-top:var(--space-6);">
            <DiceRoll
              :result="finalRollResult"
              context="epilogue_final"
              :extra-data="{ overcome_score: gameStore.overcomeScore }"
              @complete="onFinalDiceComplete"
            />
          </div>
        </div>
      </div>

      <!-- Post-final journal -->
      <div v-if="showPostFinal" class="content-section">
        <h3 class="section-title">{{ t('epilogue.post_final_title') }}</h3>
        <MessageBar :message="postFinalErr" />
        <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.post_final_help') }}</p>
        <textarea v-model="postFinalJournal" class="journal-textarea" :placeholder="t('epilogue.post_final_placeholder')" />
      </div>

      <div v-if="showFinishButton" style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
        <button class="btn btn-primary btn-lg" :disabled="postFinalLoad" @click="onEpilogueFinish">
          <span class="btn-text">{{ t('epilogue.view_summary') }}</span>
          <span v-if="postFinalLoad" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </div>
    </template>
  </AppLayout>
</template>
