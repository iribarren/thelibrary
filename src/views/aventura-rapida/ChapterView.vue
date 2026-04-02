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

// Step tracking
// 'book' | 'pre-journal' | 'roll' | 'post-journal' | 'next'
const step = ref('book')

// Data
const book             = ref(null)
const rollResult       = ref(null)
const selectedAttr     = ref(null)

// Loading states
const bookLoading      = ref(false)
const preJournalLoading = ref(false)
const rollLoading      = ref(false)
const nextLoading      = ref(false)

// Journal content
const preJournal  = ref('')
const postJournal = ref('')

// Errors
const bookError      = ref('')
const preJournalErr  = ref('')
const rollError      = ref('')
const postJournalErr = ref('')

const game = computed(() => gameStore.game)
// Frozen at mount — must not change reactively when the backend advances the phase mid-flow
const chapterNum = ref(gameStore.currentChapterNumber ?? 1)
const roman = computed(() => ({ 1: 'I', 2: 'II', 3: 'III' })[chapterNum.value] || chapterNum.value)

onMounted(() => {
  gameStore.clearRollResult()
  gameStore.clearCurrentBook()
})

async function onDiscoverBook() {
  bookError.value = ''
  bookLoading.value = true
  try {
    const result = await API.generateChapterBook(gameStore.gameId)
    book.value = result
    gameStore.setCurrentBook(result)
    // step will advance after animation completes
  } catch (err) {
    bookError.value = err.message
  } finally {
    bookLoading.value = false
  }
}

function onBookRevealComplete() {
  step.value = 'pre-journal'
}

async function onPreJournalContinue() {
  preJournalErr.value = ''
  if (!preJournal.value.trim()) {
    preJournalErr.value = t('journal.write_before_continue')
    return
  }
  preJournalLoading.value = true
  try {
    await API.saveJournalEntry(gameStore.gameId, preJournal.value.trim(), book.value?.id ?? null)
    step.value = 'roll'
  } catch (err) {
    preJournalErr.value = err.message
  } finally {
    preJournalLoading.value = false
  }
}

async function onRoll() {
  if (!selectedAttr.value) return
  rollError.value = ''
  rollLoading.value = true
  try {
    const response = await API.rollChapter(gameStore.gameId, selectedAttr.value)
    gameStore.setGameWithRoll(response.game, response.roll_result)
    rollResult.value = response.roll_result
    // DiceRoll watches rollResult and plays animation, emitting 'complete'
  } catch (err) {
    rollError.value = err.message
    rollLoading.value = false
  }
}

function onDiceComplete() {
  rollLoading.value = false
  step.value = 'post-journal'
}

async function onNext() {
  postJournalErr.value = ''
  if (!postJournal.value.trim()) {
    postJournalErr.value = t('journal.write_before_continue')
    return
  }
  nextLoading.value = true
  try {
    await API.saveJournalEntry(gameStore.gameId, postJournal.value.trim(), book.value?.id ?? null)
    const updatedGame = await API.fetchGame(gameStore.gameId)
    gameStore.setGame(updatedGame)
    gameStore.clearCurrentBook()
    const nextPhase = updatedGame.current_phase
    if (nextPhase?.startsWith('chapter_')) {
      // Same route (/aventura-rapida/chapter) — Vue Router won't remount, reset manually
      const match = nextPhase.match(/^chapter_(\d+)$/)
      chapterNum.value   = match ? parseInt(match[1], 10) : chapterNum.value
      step.value         = 'book'
      book.value         = null
      rollResult.value   = null
      selectedAttr.value = null
      preJournal.value   = ''
      postJournal.value  = ''
      nextLoading.value  = false
    } else {
      navigateToPhase(nextPhase)
    }
  } catch (err) {
    postJournalErr.value = err.message
    nextLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="screen-header">
      <h2 class="screen-title">{{ t('chapter.title', { roman }) }}</h2>
      <p class="screen-subtitle">{{ t('chapter.subtitle') }}</p>
    </div>

    <!-- Step 1: Discover book -->
    <div id="chapter-book-section" class="content-section">
      <h3 class="section-title">{{ t('chapter.discover_title') }}</h3>
      <MessageBar :message="bookError" />
      <div id="chapter-book-container">
        <button
          v-if="!book"
          class="btn btn-secondary"
          :disabled="bookLoading"
          @click="onDiscoverBook"
        >
          <span class="btn-text">📖 {{ t('chapter.discover_btn') }}</span>
          <span v-if="bookLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
        <BookReveal v-if="book" :book="book" @complete="onBookRevealComplete" />
      </div>
    </div>

    <!-- Step 2: Pre-roll journal -->
    <div v-if="step !== 'book'" id="chapter-pre-journal-section" class="content-section">
      <h3 class="section-title">{{ t('chapter.pre_journal_title') }}</h3>
      <MessageBar :message="preJournalErr" />
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('chapter.pre_journal_help') }}</p>
      <textarea
        v-model="preJournal"
        class="journal-textarea"
        :placeholder="t('chapter.pre_journal_placeholder')"
        :disabled="step !== 'pre-journal'"
      />
      <div v-if="step === 'pre-journal'" style="margin-top:var(--space-4);display:flex;justify-content:flex-end;">
        <button class="btn btn-secondary" :disabled="preJournalLoading" @click="onPreJournalContinue">
          <span class="btn-text">{{ t('chapter.continue') }}</span>
          <span v-if="preJournalLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </div>
    </div>

    <!-- Step 3: Attribute selection + Roll -->
    <div v-if="step === 'roll' || step === 'post-journal' || step === 'next'" id="chapter-roll-section" class="content-section">
      <h3 class="section-title">{{ t('chapter.roll_title') }}</h3>
      <MessageBar :message="rollError" />
      <p class="text-muted text-sm" style="margin-bottom:var(--space-4);">{{ t('chapter.roll_help') }}</p>

      <AttributeSelector
        :attributes="gameStore.attributes"
        :used-attributes="gameStore.usedChapterAttributes"
        :selected-attribute="selectedAttr"
        @select="selectedAttr = $event"
      />

      <div style="margin-top:var(--space-4);">
        <button
          class="btn btn-primary"
          :disabled="!selectedAttr || rollLoading || step !== 'roll'"
          @click="onRoll"
        >
          <span class="btn-text">⚄ {{ t('chapter.roll_btn') }}</span>
          <span v-if="rollLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </div>

      <div id="chapter-roll-result" style="margin-top:var(--space-5);">
        <DiceRoll :result="rollResult" context="chapter" @complete="onDiceComplete" />
      </div>
    </div>

    <!-- Step 4: Post-roll journal -->
    <div v-if="step === 'post-journal' || step === 'next'" id="chapter-post-journal-section" class="content-section">
      <h3 class="section-title">{{ t('chapter.post_journal_title') }}</h3>
      <MessageBar :message="postJournalErr" />
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('chapter.post_journal_help') }}</p>
      <textarea
        v-model="postJournal"
        class="journal-textarea"
        :placeholder="t('chapter.post_journal_placeholder')"
      />
    </div>

    <!-- Step 5: Next button -->
    <div v-if="step === 'post-journal'" style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-primary btn-lg" :disabled="nextLoading" @click="onNext">
        <span class="btn-text">
          {{ chapterNum < 3
            ? t('chapter.next_chapter', { roman: ({ 1: 'I', 2: 'II', 3: 'III' })[chapterNum + 1] || '' })
            : t('chapter.go_epilogue') }}
        </span>
        <span v-if="nextLoading" class="btn-spinner"><span class="spinner" /></span>
      </button>
    </div>
  </AppLayout>
</template>
