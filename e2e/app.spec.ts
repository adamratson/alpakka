import { test, expect } from '@playwright/test'

const APP_URL = '/pakka/'

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
})

test('shows the app title and initial sections', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Pakka' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bike Repair Kit' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Food & Drink' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Toiletries' })).toBeVisible()
  // Sidebar should be visible with the default list
  await expect(page.getByRole('button', { name: 'Bikepacking kit list' })).toBeVisible()
})

test('can check and uncheck an item', async ({ page }) => {
  const item = page.getByText('Tape').first()
  const row = item.locator('xpath=ancestor::li')

  await expect(row).not.toHaveClass(/item--checked/)
  await item.click()
  await expect(row).toHaveClass(/item--checked/)
  await item.click()
  await expect(row).not.toHaveClass(/item--checked/)
})

test('progress counter updates as items are checked', async ({ page }) => {
  const label = page.locator('.progress__label')
  const initial = await label.textContent()
  // match[1] = checked, match[2] = total
  const match = initial!.match(/(\d+) \/ (\d+)/)!
  const total = match[2]

  await page.getByText('Tape').first().click()
  await expect(label).toContainText(`1 / ${total} packed`)
})

test('can update item quantity', async ({ page }) => {
  const input = page.locator('.item__qty-input').first()
  await input.fill('5')
  await input.blur()
  await expect(input).toHaveValue('5')
})

test('per-day items show a trip total', async ({ page }) => {
  const tripTotal = page.locator('.item__trip-total').first()
  await expect(tripTotal).toBeVisible()
  await expect(tripTotal).toContainText('=')
})

test('changing trip days updates per-day totals', async ({ page }) => {
  const daysInput = page.locator('.trip-days__input')
  const tripTotal = page.locator('.item__trip-total').first()

  await daysInput.fill('3')
  await daysInput.blur()
  const at3 = await tripTotal.textContent()

  await daysInput.fill('6')
  await daysInput.blur()
  const at6 = await tripTotal.textContent()

  expect(at3).not.toBe(at6)
})

test('can add an item to a section', async ({ page }) => {
  await page.getByRole('button', { name: /add item/i }).first().click()
  await page.getByPlaceholder('Item name').fill('GPS Device')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('GPS Device')).toBeVisible()
})

test('can remove an item via the confirmation flow', async ({ page }) => {
  const firstItem = page.locator('.item').first()
  const titleBefore = await firstItem.locator('.item__title').textContent()

  // Hover to trigger CSS :hover which sets opacity:1 on the delete button
  await firstItem.hover()
  await firstItem.getByTitle('Remove item').click()
  await firstItem.getByRole('button', { name: 'Remove' }).click()

  await expect(page.locator('.item__title').first()).not.toHaveText(titleBefore!)
})

test('cancelling a remove confirmation keeps the item', async ({ page }) => {
  const firstItem = page.locator('.item').first()
  const titleBefore = await firstItem.locator('.item__title').textContent()

  await firstItem.getByTitle('Remove item').click({ force: true })
  await page.getByRole('button', { name: 'Cancel' }).first().click()

  await expect(page.locator('.item__title').first()).toHaveText(titleBefore!)
})

test('can add a new section', async ({ page }) => {
  await page.getByRole('button', { name: /add section/i }).click()
  await page.getByPlaceholder('Section name').fill('Electronics')
  await page.getByRole('button', { name: 'Add section' }).click()
  await expect(page.getByRole('heading', { name: 'Electronics' })).toBeVisible()
})

test('can remove a section via the confirmation flow', async ({ page }) => {
  await page.getByTitle('Remove section').first().click()
  await expect(page.getByText('Remove section?').first()).toBeVisible()
  await page.getByRole('button', { name: 'Remove' }).first().click()
  await expect(page.getByRole('heading', { name: 'Bike Repair Kit' })).not.toBeVisible()
})

test('Reset clears all checked items', async ({ page }) => {
  await page.getByText('Tape').first().click()
  await page.getByText('Multi tool').first().click()
  await expect(page.locator('.progress__label')).toContainText('2 /')

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.locator('.progress__label')).toContainText('0 /')
})

test('state persists across a page reload', async ({ page }) => {
  await page.getByText('Tape').first().click()
  await expect(page.locator('.progress__label')).toContainText('1 /')

  await page.reload()
  await expect(page.locator('.progress__label')).toContainText('1 /')
  await expect(page.locator('.item--checked')).toHaveCount(1)
})

test('can create a new list from the sidebar', async ({ page }) => {
  await page.getByRole('button', { name: '+ New list' }).click()
  // The new list should be created and become active
  await expect(page.locator('.sidebar__item--active')).toContainText('New kit list')
  // The new empty list should have no sections
  await expect(page.locator('.kit-section')).toHaveCount(0)
})

test('can switch between lists in the sidebar', async ({ page }) => {
  // Check an item in the default list
  await page.getByText('Tape').first().click()
  await expect(page.locator('.progress__label')).toContainText('1 /')

  // Create a second list (empty)
  await page.getByRole('button', { name: '+ New list' }).click()
  // This new list should have 0 items checked
  await expect(page.locator('.progress__label')).toContainText('0 /')
  // Sidebar should show the new list as active
  await expect(page.locator('.sidebar__item--active')).toContainText('New kit list')

  // Switch back to the first list
  const lists = page.locator('.sidebar__item')
  const firstList = lists.nth(0)
  await firstList.click()
  // Should show the previously checked item
  await expect(page.locator('.progress__label')).toContainText('1 /')
})

test('can delete a list from the sidebar', async ({ page }) => {
  // Create a second list
  await page.getByRole('button', { name: '+ New list' }).click()
  await expect(page.locator('.sidebar__item')).toHaveCount(2)

  // Hover to show delete button and click it
  const sidebarItem = page.locator('.sidebar__item-wrapper').nth(1)
  await sidebarItem.hover()
  await sidebarItem.getByRole('button', { name: 'Delete list' }).click()
  // Confirm deletion
  await page.getByRole('button', { name: 'Delete' }).click()
  // Should be back to one list
  await expect(page.locator('.sidebar__item')).toHaveCount(1)
})

test('cannot delete the last list', async ({ page }) => {
  // Should only have one list initially
  const deleteButtons = page.locator('[title="Delete list"]')
  await expect(deleteButtons).toHaveCount(0)
})

test('can rename a list by double-clicking', async ({ page }) => {
  const listButton = page.getByRole('button', { name: 'Bikepacking kit list' })
  await listButton.dblclick()
  // Should show an input
  const input = page.locator('.sidebar__edit-input')
  await expect(input).toBeVisible()
  await input.fill('My Renamed List')
  await input.blur()
  // Should show the new name
  await expect(page.getByRole('button', { name: 'My Renamed List' })).toBeVisible()
})
