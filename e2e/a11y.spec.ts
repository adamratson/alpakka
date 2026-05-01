import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const APP_URL = '/alpakka/'

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
})

/**
 * Run axe with our standard tag set. We assert on:
 *   - No `serious` or `critical` violations (these are the must-fix bands).
 *   - `moderate` and `minor` violations are reported but not failed; they
 *     surface in the report so they can be triaged.
 */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()


  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )

  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => {
        const head = `${v.impact?.toUpperCase()} ${v.id}: ${v.help} (${v.nodes.length} node(s))\n  ${v.helpUrl}`
        const nodes = v.nodes
          .slice(0, 8)
          .map((n) => `    - ${n.target.join(' ')}: ${n.failureSummary?.replace(/\n/g, ' ')}`)
          .join('\n')
        return `${head}\n${nodes}`
      })
      .join('\n\n')
    throw new Error(`[${label}] axe found blocking violations:\n${summary}`)
  }

  // Surface non-blocking findings in the test output so they're visible.
  const advisory = results.violations.filter(
    (v) => v.impact !== 'serious' && v.impact !== 'critical'
  )
  if (advisory.length > 0) {
    console.warn(
      `[${label}] non-blocking axe findings:\n` +
        advisory.map((v) => `  - ${v.impact} ${v.id}: ${v.help}`).join('\n')
    )
  }
}

test('initial app state has no serious or critical a11y violations', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Alpakka' })).toBeVisible()
  await scan(page, 'initial')
})

test('renaming a section (edit input visible) is clean', async ({ page }) => {
  const section = page.locator('.kit-section').first()
  await section.getByRole('button', { name: /^rename section/i }).click()
  await expect(page.locator('.kit-section__title-input').first()).toBeVisible()
  await scan(page, 'section-edit')
})

test('editing an item (title + description inputs visible) is clean', async ({ page }) => {
  const itemRow = page.locator('.item').first()
  await itemRow.hover()
  await itemRow.getByRole('button', { name: /^edit /i }).click()
  await expect(itemRow.locator('.item__edit-input--title')).toBeVisible()
  await scan(page, 'item-edit')
})

test('renaming a list (sidebar input visible) is clean', async ({ page }) => {
  const wrapper = page.locator('.sidebar__item-wrapper').first()
  await wrapper.hover()
  await wrapper.getByRole('button', { name: /^rename "/i }).click()
  await expect(page.locator('.sidebar__edit-input')).toBeVisible()
  await scan(page, 'sidebar-edit')
})

test('Share dialog is clean', async ({ page }) => {
  await page.getByRole('button', { name: 'Share' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await scan(page, 'share-modal')
})

test('Join dialog (opened via #join hash) is clean', async ({ page }) => {
  await page.evaluate(() => {
    window.location.hash = '#join=test-session-id'
  })
  await expect(page.getByRole('dialog', { name: /join shared/i })).toBeVisible()
  await scan(page, 'join-modal')
})
