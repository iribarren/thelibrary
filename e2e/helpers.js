import { expect } from '@playwright/test'

/** A fresh, collision-free email for each registration. */
export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e5)}@biblioteca.test`
}

/**
 * Registers a brand-new player through the UI and waits until the authenticated
 * header is shown. Mirrors authentication.feature (registration → token).
 */
export async function registerNewPlayer(page, email = uniqueEmail(), password = 'password123') {
  await page.goto('/')
  await page.locator('.auth-section--guest button.btn-ghost').click() // "Register"
  await page.fill('#auth-reg-email', email)
  await page.fill('#auth-reg-password', password)
  await page.fill('#auth-reg-confirm', password)
  await page.locator('form.auth-form button[type="submit"]').click()
  await expect(page.locator('.auth-section--logged-in')).toBeVisible()
  return { email, password }
}

/**
 * Registers then logs in. Registration only returns an access token, but logging
 * in also issues a refresh token — which App.vue needs to re-authenticate (and
 * auto-resume) after a full page reload.
 */
export async function registerAndLogin(page) {
  const { email, password } = await registerNewPlayer(page)
  await page.locator('.auth-section--logged-in button.btn-ghost').click() // logout
  await page.locator('.auth-section--guest button.btn-secondary').click() // open login
  await page.fill('#auth-login-email', email)
  await page.fill('#auth-login-password', password)
  await page.locator('form.auth-form button[type="submit"]').click()
  await expect(page.locator('.auth-section--logged-in')).toBeVisible()
  return { email, password }
}

/** Creates a new game from the start screen and waits for the prologue. */
export async function startNewGame(page) {
  await page.locator('#btn-new-game').click()
  await expect(page).toHaveURL(/#\/aventura-rapida\/prologue/)
}

/**
 * Skips the dice animation by clicking the active animator (the dice-animator
 * component resolves its promise immediately on click).
 */
export async function skipDice(page, resultContainerSelector) {
  const animator = page.locator(`${resultContainerSelector} .dice-animator:not(.dice-placeholder)`)
  await animator.click()
}
