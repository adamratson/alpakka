import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const APP_URL = '/alpakka/'

// These tests exercise the full Trystero flow against public Nostr relays.
// They're slow (10–30s each) and depend on external services. Each step has
// generous timeouts so transient relay slowness doesn't fail the run.

async function freshPage(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage()
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(300)
  return page
}

async function shareAndJoin(host: Page, joiner: Page) {
  await host.getByRole('button', { name: 'Share' }).click()
  const inviteInput = host.locator('[data-testid=share-url]')
  await expect(inviteInput).toBeVisible({ timeout: 10_000 })
  const inviteUrl = await inviteInput.inputValue()
  expect(inviteUrl).toContain('#join=')

  // Dismiss the host's share modal so it doesn't cover anything.
  await host.getByRole('button', { name: 'Done' }).click()
  await expect(host.locator('.modal')).toBeHidden()

  const url = new URL(inviteUrl)
  await joiner.goto(url.pathname + url.search + url.hash)
  await joiner.waitForLoadState('domcontentloaded')
  await joiner.getByRole('button', { name: 'Join' }).click()
  await expect(joiner.locator('.modal')).toBeHidden({ timeout: 5_000 })

  // Both sides should reach Connected once the relay matchmakes them.
  await expect(host.locator('.session-pill--connected')).toBeVisible({ timeout: 60_000 })
  await expect(joiner.locator('.session-pill--connected')).toBeVisible({ timeout: 60_000 })
}

test('two peers sync edits in real time', async ({ browser }) => {
  test.setTimeout(120_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await shareAndJoin(host, joiner)

  await expect(host.locator('.sidebar__shared-dot')).toBeVisible()
  await expect(joiner.locator('.sidebar__shared-dot')).toBeVisible()

  await host.getByText('Tape').first().click()
  await expect(
    joiner.getByText('Tape').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 15_000 })

  await joiner.getByText('Cable ties').first().click()
  await expect(
    host.getByText('Cable ties').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 15_000 })

  await hostCtx.close()
  await joinerCtx.close()
})

test('host can Stop sharing to remove the room', async ({ browser }) => {
  test.setTimeout(120_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await shareAndJoin(host, joiner)

  // Host stops sharing: pill, dot, and stop button all go away; Share returns.
  await host.getByRole('button', { name: 'Stop sharing' }).click()
  await expect(host.locator('.session-pill')).toHaveCount(0)
  await expect(host.locator('.sidebar__shared-dot')).toHaveCount(0)
  await expect(host.getByRole('button', { name: 'Share' })).toBeVisible()

  await hostCtx.close()
  await joinerCtx.close()
})

test('reload reconnects automatically without resharing', async ({ browser }) => {
  test.setTimeout(120_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await shareAndJoin(host, joiner)

  // Host edits something so the joiner has a marker we can verify after.
  await host.getByText('Tape').first().click()
  await expect(
    joiner.getByText('Tape').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 15_000 })

  // Reload the joiner — the persisted sessionId should make it auto-rejoin.
  await joiner.reload()
  await joiner.waitForLoadState('domcontentloaded')

  // Pill returns to Connected on its own, no clicks involved.
  await expect(joiner.locator('.session-pill--connected')).toBeVisible({ timeout: 60_000 })
  await expect(joiner.locator('.sidebar__shared-dot')).toBeVisible()

  // The previous edit is still reflected (CRDT state survived reload).
  await expect(
    joiner.getByText('Tape').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/)

  // A new edit on the joiner side propagates to the host.
  await joiner.getByText('Cable ties').first().click()
  await expect(
    host.getByText('Cable ties').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 15_000 })

  await hostCtx.close()
  await joinerCtx.close()
})
