import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const APP_URL = '/alpakka/'

async function freshPage(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage()
  // Grant clipboard so the modal's Copy buttons don't error.
  // (We read values directly from inputs, but this avoids permission prompts.)
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(300)
  return page
}

test('two peers sync edits in real time', async ({ browser }) => {
  test.setTimeout(45_000)
  const hostCtx = await browser.newContext()
  const joinerCtx = await browser.newContext()
  const host = await freshPage(hostCtx)
  const joiner = await freshPage(joinerCtx)

  host.on('pageerror', (e) => console.log('HOST PAGEERROR:', e.message))
  joiner.on('pageerror', (e) => console.log('JOINER PAGEERROR:', e.message))

  // Host clicks Share, waits for the invite URL to appear.
  await host.getByRole('button', { name: 'Share' }).click()
  await expect(host.locator('.modal')).toBeVisible({ timeout: 5_000 })
  const inviteInput = host.locator('.modal__input')
  await expect(inviteInput).toBeVisible({ timeout: 15_000 })
  const inviteUrl = await inviteInput.inputValue()
  expect(inviteUrl).toContain('#join=')

  // Joiner navigates to the invite URL. Use the path from the host so the dev
  // server's base path (/alpakka/) is preserved.
  const url = new URL(inviteUrl)
  await joiner.goto(url.pathname + url.search + url.hash)
  await joiner.waitForLoadState('domcontentloaded')

  // Joiner accepts.
  await joiner.getByRole('button', { name: 'Join' }).click()
  const answerArea = joiner.locator('.modal__textarea')
  await expect(answerArea).toBeVisible({ timeout: 15_000 })
  const answer = await answerArea.inputValue()
  expect(answer.length).toBeGreaterThan(50)

  // Host pastes the answer back.
  const hostAnswerArea = host.locator('.modal__textarea')
  await hostAnswerArea.fill(answer)
  await host.getByRole('button', { name: 'Connect' }).click()

  // Wait for both sides to report Connected and the modals to close.
  await expect(host.locator('.session-pill--connected')).toBeVisible({ timeout: 20_000 })
  await expect(joiner.locator('.session-pill--connected')).toBeVisible({ timeout: 20_000 })
  await expect(host.locator('.modal')).toBeHidden({ timeout: 5_000 })
  await expect(joiner.locator('.modal')).toBeHidden({ timeout: 5_000 })

  // Host edit propagates to joiner.
  await host.getByText('Tape').first().click()
  // Joiner now has the host's list as the active list (added on join).
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
