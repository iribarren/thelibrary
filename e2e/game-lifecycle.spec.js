import { test, expect } from '@playwright/test'
import { registerAndLogin, startNewGame } from './helpers.js'

// Mirrors game-lifecycle.feature at the UI level: an authenticated player creates
// a session they own, and it shows up in their "My Sessions" list.

test.describe('Game lifecycle', () => {
  test('a created game is owned by the player and listed in My Sessions', async ({ page }) => {
    await registerAndLogin(page)
    await startNewGame(page) // creates an owned session, lands on the prologue

    // Drop the auto-resume marker so reloading returns to the start screen
    // instead of bouncing straight back into the game.
    await page.evaluate(() => localStorage.removeItem('biblioteca_game_id'))
    await page.goto('/')

    await expect(page.locator('.auth-section--logged-in')).toBeVisible()

    // Open "My Sessions" (the secondary button in the authenticated header).
    await page.locator('.auth-section--logged-in button.btn-secondary').click()

    // The session just created is listed.
    await expect(page.locator('.session-card').first()).toBeVisible()
  })
})
