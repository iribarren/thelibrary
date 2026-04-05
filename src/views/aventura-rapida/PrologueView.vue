<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/game.js'
import { useNavigation } from '@/composables/useNavigation.js'
import * as API from '@/api/index.js'
import AppLayout from '@/layout/AppLayout.vue'
import MessageBar from '@/components/MessageBar.vue'

const { t } = useI18n()
const gameStore = useGameStore()
const { navigateToPhase } = useNavigation()

// Form state
const genre    = ref('')
const epoch    = ref('')
const charName = ref('')
const charDesc = ref('')
const journal  = ref('')

// UI state
const loading         = ref(false)
const randomLoading   = ref(false)
const settingError    = ref('')
const characterError  = ref('')
const journalError    = ref('')
const settingPreview  = ref('')

const oracleTables = computed(() => gameStore.oracleTables)
const oraclesLoading = computed(() => gameStore.oracleTablesLoading)
const genreOptions = computed(() => oracleTables.value?.genre ?? [])
const epochOptions = computed(() => oracleTables.value?.epoch ?? [])

onMounted(async () => {
  if (!gameStore.oracleTables) {
    gameStore.setOracleTablesLoading(true)
    try {
      gameStore.setOracleTables(await API.fetchOracleTables())
    } catch (err) {
      settingError.value = t('errors.load_oracle', { message: err.message })
    } finally {
      gameStore.setOracleTablesLoading(false)
    }
  }
})

function updateSettingPreview() {
  const lines = []
  if (genre.value && oracleTables.value?.genre) {
    const g = oracleTables.value.genre.find(e => e.value === genre.value)
    if (g?.hint) lines.push(`<strong>${g.value}:</strong> ${g.hint}`)
  }
  if (epoch.value && oracleTables.value?.epoch) {
    const e = oracleTables.value.epoch.find(e => e.value === epoch.value)
    if (e?.hint) lines.push(`<strong>${e.value}:</strong> ${e.hint}`)
  }
  settingPreview.value = lines.join('<br>')
}

async function onRandomSetting() {
  settingError.value = ''
  randomLoading.value = true
  try {
    const result = await API.fetchRandomSetting()
    if (result.genre) genre.value = result.genre.value
    if (result.epoch) epoch.value = result.epoch.value
    updateSettingPreview()
  } catch (err) {
    settingError.value = err.message
  } finally {
    randomLoading.value = false
  }
}

async function onSubmit() {
  settingError.value = ''
  characterError.value = ''
  journalError.value = ''

  if (!genre.value)    { settingError.value   = t('errors.choose_genre');       return }
  if (!epoch.value)    { settingError.value   = t('errors.choose_epoch');       return }
  if (!charName.value.trim()) { characterError.value = t('errors.need_name');   return }
  if (!charDesc.value.trim()) { characterError.value = t('errors.need_description'); return }
  if (!journal.value.trim())  { journalError.value   = t('errors.need_journal');     return }

  loading.value = true
  try {
    const gameId = gameStore.gameId
    // Save journal BEFORE completing prologue so it records phase = 'prologue'
    await API.saveJournalEntry(gameId, journal.value.trim(), null)
    const updatedGame = await API.submitPrologue(gameId, {
      character_name:        charName.value.trim(),
      character_description: charDesc.value.trim(),
      genre: genre.value,
      epoch: epoch.value,
    })
    gameStore.setGame(updatedGame)
    navigateToPhase(updatedGame.current_phase)
  } catch (err) {
    settingError.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="screen-header">
      <h2 class="screen-title">{{ t('prologue.title') }}</h2>
      <p class="screen-subtitle">{{ t('prologue.subtitle') }}</p>
    </div>

    <!-- Setting selection -->
    <div class="content-section">
      <h3 class="section-title">{{ t('prologue.setting_title') }}</h3>
      <MessageBar :message="settingError" />
      <p v-if="oraclesLoading" class="text-muted text-sm" style="margin-bottom:var(--space-3);">
        {{ t('prologue.loading_oracles') }}
      </p>
      <div class="setting-grid">
        <div class="form-group">
          <label class="form-label" for="select-genre">{{ t('prologue.genre_label') }}</label>
          <select id="select-genre" v-model="genre" class="form-control" :disabled="oraclesLoading" @change="updateSettingPreview">
            <option value="">{{ t('prologue.genre_placeholder') }}</option>
            <option v-for="opt in genreOptions" :key="opt.value" :value="opt.value" :title="opt.hint">
              {{ opt.value }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="select-epoch">{{ t('prologue.epoch_label') }}</label>
          <select id="select-epoch" v-model="epoch" class="form-control" :disabled="oraclesLoading" @change="updateSettingPreview">
            <option value="">{{ t('prologue.epoch_placeholder') }}</option>
            <option v-for="opt in epochOptions" :key="opt.value" :value="opt.value" :title="opt.hint">
              {{ opt.value }}
            </option>
          </select>
        </div>
        <div class="setting-random-row">
          <span class="text-muted text-sm">{{ t('prologue.or') }}</span>
          <button class="btn btn-secondary btn-sm" :class="{ loading: randomLoading }" :disabled="randomLoading" @click="onRandomSetting">
            <span class="btn-text">✦ {{ t('prologue.random') }}</span>
            <span v-if="randomLoading" class="btn-spinner"><span class="spinner" /></span>
          </button>
        </div>
        <div v-if="settingPreview" class="setting-preview visible">
          <div class="setting-preview-text" v-html="settingPreview" />
        </div>
      </div>
    </div>

    <!-- Character creation -->
    <div class="content-section">
      <h3 class="section-title">{{ t('prologue.character_title') }}</h3>
      <MessageBar :message="characterError" />
      <div class="card card-ornate">
        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <div class="form-group">
            <label class="form-label" for="input-char-name">{{ t('prologue.name_label') }}</label>
            <input
              id="input-char-name"
              v-model="charName"
              class="form-control"
              type="text"
              :placeholder="t('prologue.name_placeholder')"
              maxlength="100"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="input-char-desc">{{ t('prologue.desc_label') }}</label>
            <textarea
              id="input-char-desc"
              v-model="charDesc"
              class="form-control"
              rows="4"
              :placeholder="t('prologue.desc_placeholder')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Journal entry -->
    <div class="content-section">
      <h3 class="section-title">{{ t('prologue.first_page_title') }}</h3>
      <MessageBar :message="journalError" />
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('prologue.first_page_help') }}</p>
      <textarea
        id="journal-prologue"
        v-model="journal"
        class="journal-textarea"
        :placeholder="t('prologue.first_page_placeholder')"
      />
    </div>

    <div style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-primary btn-lg" :class="{ loading }" :disabled="loading" @click="onSubmit">
        <span class="btn-text">{{ t('prologue.start_adventure') }}</span>
        <span v-if="loading" class="btn-spinner"><span class="spinner" /></span>
      </button>
    </div>
  </AppLayout>
</template>
