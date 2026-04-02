<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  attributes:        { type: Array, required: true },
  usedAttributes:    { type: Object, default: () => new Set() }, // Set<string>
  selectedAttribute: { type: String, default: null },
  // Support selection (epilogue only)
  showSupport:          { type: Boolean, default: false },
  supportUsed:          { type: Boolean, default: false },
  selectedSupport:      { type: String, default: null },
})
const emit = defineEmits(['select', 'select-support'])

const { t } = useI18n()

function getTotal(attr) {
  return (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0)
}

function isUsed(attr) {
  return props.usedAttributes.has(attr.type)
}
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

    <!-- Support selection (epilogue) -->
    <div v-if="showSupport && !supportUsed && selectedAttribute" class="support-option" style="margin-top:var(--space-4);">
      <p class="form-label" style="margin-bottom:var(--space-2);">{{ t('epilogue.support_title') }}</p>
      <p class="text-muted text-sm" style="margin-bottom:var(--space-3);">{{ t('epilogue.support_help') }}</p>
      <div class="attribute-selector" style="gap:var(--space-2);">
        <button
          :class="['btn-attribute', 'btn-sm', { selected: selectedSupport === 'none' }]"
          style="min-width:80px;opacity:0.6;"
          @click="$emit('select-support', null)"
        >
          <span class="attr-name">{{ t('epilogue.no_support_btn') }}</span>
        </button>
        <template v-for="attr in attributes" :key="attr.type">
          <button
            v-if="(attr.support ?? 0) > 0"
            :class="['btn-attribute', 'btn-sm', { selected: selectedSupport === attr.type }]"
            style="min-width:80px;"
            @click="$emit('select-support', attr.type)"
          >
            <span class="attr-name">{{ t(`attributes.${attr.type}`) }}</span>
            <span class="attr-value">+{{ attr.support }}</span>
          </button>
        </template>
      </div>
    </div>
    <p v-else-if="showSupport && supportUsed" class="text-muted text-sm">
      <em>{{ t('epilogue.support_used') }}</em>
    </p>
  </div>
</template>
