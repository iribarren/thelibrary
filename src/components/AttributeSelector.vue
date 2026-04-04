<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  attributes:        { type: Array, required: true },
  usedAttributes:    { type: Object, default: () => new Set() }, // Set<string>
  selectedAttribute: { type: String, default: null },
  // Support selection (epilogue only)
  showSupport:    { type: Boolean, default: false },
  supportUsed:    { type: Boolean, default: false },
  selectedSupport: { type: String, default: null },
})
const emit = defineEmits(['select', 'select-support'])

const { t } = useI18n()

function getTotal(attr) {
  return (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0)
}

function isUsed(attr) {
  return props.usedAttributes.has(attr.type)
}

// The attribute object matching the current selection (used for contextual support prompt)
const selectedAttrObj = computed(() =>
  props.attributes.find(a => a.type === props.selectedAttribute) ?? null
)

// Show the contextual support prompt when: epilogue mode, attribute selected, it has support, not yet used
const showSupportPrompt = computed(() =>
  props.showSupport &&
  !props.supportUsed &&
  selectedAttrObj.value !== null &&
  (selectedAttrObj.value.support ?? 0) > 0
)
</script>

<template>
  <div>
    <!-- Main attribute buttons -->
    <div class="attribute-selector">
      <button
        v-for="attr in attributes"
        :key="attr.type"
        :class="['btn-attribute', { used: isUsed(attr), selected: selectedAttribute === attr.type }]"
        :disabled="isUsed(attr)"
        :data-attribute="attr.type"
        @click="!isUsed(attr) && $emit('select', attr.type)"
      >
        <span class="attr-name">{{ t(`attributes.${attr.type}`) }}</span>
        <span class="attr-value">{{ getTotal(attr) }}</span>
        <span class="attr-details">{{ attr.base_value ?? 0 }}+{{ attr.background ?? 0 }}+{{ attr.support ?? 0 }}</span>
      </button>
    </div>

    <!-- Contextual support prompt (epilogue): shown only for the selected attribute if it has support -->
    <div v-if="showSupportPrompt" class="support-option" style="margin-top:var(--space-4);">
      <p class="form-label" style="margin-bottom:var(--space-2);">
        {{ t('epilogue.support_confirm_prompt', { title: selectedAttrObj.support_title || `+${selectedAttrObj.support}` }) }}
      </p>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.support_once_reminder') }}</p>
      <div style="display:flex;gap:var(--space-2);">
        <button
          :class="['btn', 'btn-secondary', { 'btn-active': selectedSupport === selectedAttribute }]"
          @click="$emit('select-support', selectedAttribute)"
        >
          {{ t('epilogue.use_support_btn') }}
        </button>
        <button
          :class="['btn', 'btn-secondary', { 'btn-active': selectedSupport === null }]"
          @click="$emit('select-support', null)"
        >
          {{ t('epilogue.no_support_btn') }}
        </button>
      </div>
    </div>
    <p v-else-if="showSupport && supportUsed" class="text-muted text-sm">
      <em>{{ t('epilogue.support_used') }}</em>
    </p>
  </div>
</template>
