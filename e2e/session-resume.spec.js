import { test, expect } from '@playwright/test'
import { registerAndLogin, startNewGame } from './helpers.js'

// A reload mid-game must resume the player at their current phase, driven by the
// localStorage game id + refresh token (App.vue auto-resume on mount).

test.describe('Session resume', () => {
  test('reloading mid-game returns the player to their current phase', async ({ page }) => {
    await registerAndLogin(page)
    await startNewGame(page)

    await expect(page).toHaveURL(/#\/aventura-rapida\/prologue/)

    await page.reload()

    // Auto-resume brings the player back to the prologue (not the start screen).
    await expect(page).toHaveURL(/#\/aventura-rapida\/prologue/)
    await expect(page.locator('#select-genre')).toBeVisible()
  })
})
