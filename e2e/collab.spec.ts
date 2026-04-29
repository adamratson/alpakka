import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const APP_URL = '/alpakka/'

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

async function connectPair(host: Page, joiner: Page) {
  await host.getByRole('button', { name: 'Share' }).click()
  const inviteInput = host.locator('.modal__input')
  await expect(inviteInput).toBeVisible({ timeout: 15_000 })
  const inviteUrl = await inviteInput.inputValue()

  const url = new URL(inviteUrl)
  await joiner.goto(url.pathname + url.search + url.hash)
  await joiner.waitForLoadState('domcontentloaded')
  await joiner.getByRole('button', { name: 'Join' }).click()
  const answerArea = joiner.locator('.modal__textarea')
  await expect(answerArea).toBeVisible({ timeout: 15_000 })
  const answer = await answerArea.inputValue()

  await host.locator('.modal__textarea').fill(answer)
  await host.getByRole('button', { name: 'Connect' }).click()

  await expect(host.locator('.session-pill--connected')).toBeVisible({ timeout: 20_000 })
  await expect(joiner.locator('.session-pill--connected')).toBeVisible({ timeout: 20_000 })
  await expect(host.locator('.modal')).toBeHidden({ timeout: 5_000 })
  await expect(joiner.locator('.modal')).toBeHidden({ timeout: 5_000 })
}

test('two peers sync edits in real time', async ({ browser }) => {
  test.setTimeout(45_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await connectPair(host, joiner)

  // Both sides show the shared-list dot in the sidebar.
  await expect(host.locator('.sidebar__shared-dot')).toBeVisible()
  await expect(joiner.locator('.sidebar__shared-dot')).toBeVisible()

  // Host edit propagates to joiner.
  await host.getByText('Tape').first().click()
  await expect(
    joiner.getByText('Tape').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 10_000 })

  // Joiner edit propagates back to host.
  await joiner.getByText('Cable ties').first().click()
  await expect(
    host.getByText('Cable ties').first().locator('xpath=ancestor::li')
  ).toHaveClass(/item--checked/, { timeout: 10_000 })

  await hostCtx.close()
  await joinerCtx.close()
})

test('host Leave clears its session and the joiner sees Disconnected', async ({ browser }) => {
  test.setTimeout(45_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await connectPair(host, joiner)

  // Host clicks Leave: session and dot are gone, Share button comes back.
  await host.getByRole('button', { name: 'Leave' }).click()
  await expect(host.locator('.session-pill')).toHaveCount(0)
  await expect(host.locator('.sidebar__shared-dot')).toHaveCount(0)
  await expect(host.getByRole('button', { name: 'Share' })).toBeVisible()

  // Joiner detects the disconnect and surfaces it in the pill. The dot stays
  // visible on the disconnected pill (until the joiner clicks Leave too).
  await expect(joiner.locator('.session-pill--disconnected')).toBeVisible({ timeout: 20_000 })

  // Joiner can clear the disconnected state via Leave.
  await joiner.getByRole('button', { name: 'Leave' }).click()
  await expect(joiner.locator('.session-pill')).toHaveCount(0)
  await expect(joiner.locator('.sidebar__shared-dot')).toHaveCount(0)

  await hostCtx.close()
  await joinerCtx.close()
})

test('host can Reshare after a disconnect', async ({ browser }) => {
  test.setTimeout(45_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  await connectPair(host, joiner)

  // Closing the joiner's context drops the connection. The host's pc detects
  // the loss and transitions to Disconnected.
  await joinerCtx.close()
  await expect(host.locator('.session-pill--disconnected')).toBeVisible({ timeout: 30_000 })

  // Reshare button appears (host role). Clicking it opens a fresh ShareModal.
  await host.getByRole('button', { name: 'Reshare' }).click()
  await expect(host.locator('.modal')).toBeVisible({ timeout: 5_000 })
  await expect(host.locator('.modal__input')).toBeVisible({ timeout: 15_000 })
  const newUrl = await host.locator('.modal__input').inputValue()
  expect(newUrl).toContain('#join=')

  await hostCtx.close()
})
