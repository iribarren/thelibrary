import { test, expect } from '@playwright/test'
import { registerNewPlayer, uniqueEmail } from './helpers.js'

// Mirrors authentication.feature at the UI level: a visitor registers, becomes
// authenticated, and can log back out. (Backend-only rules — validation,
// throttling, anti-enumeration — are pinned by Behat, not re-tested here.)

test.describe('Authentication', () => {
  test('a visitor can register and is then authenticated', async ({ page }) => {
    await registerNewPlayer(page, uniqueEmail())

    await expect(page.locator('.auth-section--logged-in')).toBeVisible()
    // A registered player may start a new game.
    await expect(page.locator('#btn-new-game')).toBeEnabled()
  })

  test('an authenticated player can log out', async ({ page }) => {
    await registerNewPlayer(page, uniqueEmail())

    await page.locator('.auth-section--logged-in button.btn-ghost').click() // "Logout"

    await expect(page.locator('.auth-section--guest')).toBeVisible()
    await expect(page.locator('#btn-new-game')).toBeDisabled()
  })
})
