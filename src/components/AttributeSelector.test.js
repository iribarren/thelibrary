import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import AttributeSelector from './AttributeSelector.vue'

// ── i18n fixture ────────────────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      attributes: { body: 'Body', mind: 'Mind', social: 'Social' },
      epilogue: {
        support_confirm_prompt: "Use your support '{title}'? (+1)",
        support_once_reminder: 'Support can only be used once.',
        use_support_btn: 'Use support',
        no_support_btn: 'Do not use',
        support_used: 'Support already used.',
      },
    },
  },
})

// ── Attribute fixtures ───────────────────────────────────────────────────────

const attrs = [
  { type: 'body',   base_value: 2, background: 1, support: 1, support_title: 'Ancient map' },
  { type: 'mind',   base_value: 1, background: 0, support: 0, support_title: null },
  { type: 'social', base_value: 1, background: 0, support: 0, support_title: null },
]

function mountSelector(props = {}) {
  return mount(AttributeSelector, {
    props: {
      attributes: attrs,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AttributeSelector — support prompt visibility', () => {
  it('does not show the support prompt when showSupport is false', () => {
    const wrapper = mountSelector({ showSupport: false, selectedAttribute: 'body' })

    expect(wrapper.find('.support-option').exists()).toBe(false)
  })

  it('does not show the support prompt when the selected attribute has support=0', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: 'mind' })

    expect(wrapper.find('.support-option').exists()).toBe(false)
  })

  it('does not show the support prompt when no attribute is selected', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: null })

    expect(wrapper.find('.support-option').exists()).toBe(false)
  })

  it('shows the support prompt when showSupport=true, supportUsed=false, and selected attr has support > 0', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: 'body' })

    expect(wrapper.find('.support-option').exists()).toBe(true)
  })

  it('does not show the support prompt when supportUsed=true even if selected attr has support > 0', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: true, selectedAttribute: 'body' })

    expect(wrapper.find('.support-option').exists()).toBe(false)
  })
})

describe('AttributeSelector — support prompt button emissions', () => {
  it('"Use support" button emits select-support with the selected attribute type', async () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: 'body' })

    const buttons = wrapper.find('.support-option').findAll('button')
    const useBtn = buttons.find(b => b.text() === 'Use support')
    await useBtn.trigger('click')

    expect(wrapper.emitted('select-support')).toBeTruthy()
    expect(wrapper.emitted('select-support')[0][0]).toBe('body')
  })

  it('"Do not use" button emits select-support with null', async () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: 'body' })

    const buttons = wrapper.find('.support-option').findAll('button')
    const noBtn = buttons.find(b => b.text() === 'Do not use')
    await noBtn.trigger('click')

    expect(wrapper.emitted('select-support')).toBeTruthy()
    expect(wrapper.emitted('select-support')[0][0]).toBeNull()
  })
})

describe('AttributeSelector — support prompt content', () => {
  it('includes the support_title in the prompt text', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: false, selectedAttribute: 'body' })

    const promptText = wrapper.find('.support-option .form-label').text()
    expect(promptText).toContain('Ancient map')
  })

  it('falls back to +N when support_title is null', () => {
    // Use an attrs list where body has support=1 but support_title=null
    const attrsNoTitle = [
      { type: 'body', base_value: 2, background: 1, support: 1, support_title: null },
      { type: 'mind', base_value: 1, background: 0, support: 0, support_title: null },
    ]
    const wrapper = mount(AttributeSelector, {
      props: { attributes: attrsNoTitle, showSupport: true, supportUsed: false, selectedAttribute: 'body' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('.support-option').exists()).toBe(true)
    const promptText = wrapper.find('.support-option .form-label').text()
    expect(promptText).toContain('+1')
  })
})

describe('AttributeSelector — support used state', () => {
  it('shows the "support already used" note when supportUsed=true', () => {
    const wrapper = mountSelector({ showSupport: true, supportUsed: true, selectedAttribute: 'body' })

    expect(wrapper.find('.support-option').exists()).toBe(false)
    expect(wrapper.text()).toContain('Support already used.')
  })

  it('does not show the "support already used" note when showSupport=false', () => {
    const wrapper = mountSelector({ showSupport: false, supportUsed: true, selectedAttribute: 'body' })

    expect(wrapper.text()).not.toContain('Support already used.')
  })
})
