import { test, expect } from '@playwright/test'
import { registerNewPlayer, startNewGame, skipDice } from './helpers.js'

// End-to-end play-through mirroring the Behat "full playthrough" scenario
// (epilogue.feature): prologue → 3 chapters → 3 epilogue actions → final roll →
// completed. Dice are random on the backend, so we assert STRUCTURE and PHASE
// PROGRESSION, never specific die values.

const ATTRS = ['body', 'mind', 'social'] // distinct per phase — reuse is banned

async function completePrologue(page) {
  // Pick a random setting (fills genre + epoch from the oracle).
  await page.locator('.setting-random-row button').click()
  await expect(page.locator('#select-genre')).not.toHaveValue('')
  await expect(page.locator('#select-epoch')).not.toHaveValue('')

  await page.fill('#input-char-name', 'Aria')
  await page.fill('#input-char-desc', 'A determined investigator.')
  await page.fill('#journal-prologue', 'The story begins on a rainy night.')

  await page.locator('button.btn-lg').click() // "Start adventure"
  await expect(page).toHaveURL(/#\/aventura-rapida\/chapter/)
}

async function playChapter(page, attribute) {
  // 1. Discover the book and let it reveal.
  await page.locator('#chapter-book-section button').click()
  await expect(page.locator('#chapter-pre-journal-section')).toBeVisible({ timeout: 30_000 })

  // 2. Pre-roll journal.
  await page.fill('#chapter-pre-journal-section textarea', 'Before the roll, I steel myself.')
  await page.locator('#chapter-pre-journal-section button').click()
  await expect(page.locator('#chapter-roll-section')).toBeVisible()

  // 3. Choose an attribute and roll.
  await page.locator(`button.btn-attribute[data-attribute="${attribute}"]`).click()
  await page.locator('#chapter-roll-section button.btn-primary').click()
  await skipDice(page, '#chapter-roll-result')

  // 3b. A weak_hit asks for a support title before continuing.
  const supportTitle = page.locator('#chapter-support-title-section')
  const postJournal = page.locator('#chapter-post-journal-section')
  await expect(supportTitle.or(postJournal)).toBeVisible({ timeout: 20_000 })
  if (await supportTitle.isVisible()) {
    await page.fill('#chapter-support-title-section input', 'Loyal ally')
    await page.locator('#chapter-support-title-section button').click()
    await expect(postJournal).toBeVisible()
  }

  // 4. Post-roll journal, then advance.
  await page.fill('#chapter-post-journal-section textarea', 'After the roll, the story moves on.')
  await page.locator('button.btn-lg').click()
}

async function selectAttributeAndRoll(page, attribute) {
  await page.locator(`button.btn-attribute[data-attribute="${attribute}"]`).click()

  // If the support prompt appears, decline it (keeps the flow deterministic).
  const noSupport = page.locator('.support-option button').nth(1)
  if (await noSupport.isVisible().catch(() => false)) {
    await noSupport.click()
  }

  await page.locator('button.btn-primary').first().click() // roll the action
}

// Actions 1 & 2: the phase advances to the next action, so the post-roll journal
// is shown before the next action.
async function playEpilogueActionWithJournal(page, attribute) {
  await selectAttributeAndRoll(page, attribute)
  await skipDice(page, '#epilogue-action-result')

  await expect(page.locator('#epilogue-post-roll-section')).toBeVisible({ timeout: 20_000 })
  await page.fill('#epilogue-post-roll-section textarea', 'Reflecting on this epilogue action.')
  await page.locator('#epilogue-post-roll-section button').click()
  // Wait for the view to reset (selectedAttr cleared) before the next action,
  // otherwise the next selection would be wiped by the async reset.
  await expect(page.locator('#epilogue-post-roll-section')).toBeHidden()
}

test('a full play-through runs from the prologue to a completed game', async ({ page }) => {
  await registerNewPlayer(page)
  await startNewGame(page)

  await completePrologue(page)

  // Three chapters, each with a distinct attribute.
  for (const attr of ATTRS) {
    await playChapter(page, attr)
  }

  // Into the epilogue.
  await expect(page).toHaveURL(/#\/aventura-rapida\/epilogue/, { timeout: 30_000 })

  // Discover the epilogue book and write the opening entry.
  await page.locator('#epilogue-book-container button').click()
  await expect(page.locator('#epilogue-pre-journal-section')).toBeVisible({ timeout: 30_000 })
  await page.fill('#epilogue-pre-journal-section textarea', 'The end draws near.')
  await page.locator('#epilogue-pre-journal-section button').click()

  // Three epilogue actions, each with a distinct attribute. The first two show a
  // post-roll journal; the third advances the phase to the final roll directly.
  await expect(page.locator('button.btn-attribute').first()).toBeVisible({ timeout: 20_000 })
  await playEpilogueActionWithJournal(page, 'body')
  await playEpilogueActionWithJournal(page, 'mind')
  await selectAttributeAndRoll(page, 'social') // 3rd action → straight to the final screen

  // Final roll closes the game.
  await expect(page.locator('.card button.btn-lg')).toBeVisible({ timeout: 20_000 })
  await page.locator('.card button.btn-lg').click()
  await skipDice(page, '#epilogue-final-result')

  await expect(page.locator('#epilogue-post-final-section')).toBeVisible({ timeout: 20_000 })
  await page.fill('#epilogue-post-final-section textarea', 'And so the library closes its doors.')
  await page.locator('button.btn-lg').last().click() // "View summary"

  await expect(page).toHaveURL(/#\/aventura-rapida\/completed/, { timeout: 20_000 })
})
