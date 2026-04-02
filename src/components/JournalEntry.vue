<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MessageBar from './MessageBar.vue'

const props = defineProps({
  label:       { type: String, required: true },
  helpText:    { type: String, default: '' },
  placeholder: { type: String, default: '' },
  bookId:      { type: Number, default: null },
  loading:     { type: Boolean, default: false },
  submitLabel: { type: String, default: '' },
})
const emit = defineEmits(['save'])

const { t } = useI18n()
const content = ref('')
const error   = ref('')

function onSave() {
  if (!content.value.trim()) {
    error.value = t('journal.write_before_continue')
    return
  }
  error.value = ''
  emit('save', { content: content.value.trim(), bookId: props.bookId })
}
</script>

<template>
  <div class="content-section">
    <h3 class="section-title">{{ label }}</h3>
    <MessageBar :message="error" />
    <p v-if="helpText" class="text-muted text-sm" style="margin-bottom:var(--space-3);">
      {{ helpText }}
    </p>
    <textarea
      v-model="content"
      class="journal-textarea"
      :placeholder="placeholder"
    />
    <div v-if="submitLabel" style="display:flex;justify-content:flex-end;padding-top:var(--space-4);">
      <button class="btn btn-secondary" :disabled="loading" @click="onSave">
        <span class="btn-text">{{ submitLabel }}</span>
        <span v-if="loading" class="btn-spinner"><span class="spinner" /></span>
      </button>
    </div>
  </div>
</template>
