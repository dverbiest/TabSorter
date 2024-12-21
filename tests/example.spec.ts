import { test, expect } from '../support/fixtures';

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`${extensionId}/index.html`)
})

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle('Tab Sorter')
})

test('has last viewed', async ({ page }) => {
  await expect(page.locator('.legend')).toContainText('Last viewed:')
})

test('displays footer after dragging', async ({ page, utils }) => {
  await utils.newTab('data:,Tab 1')
  await page.locator('li', { hasText: 'Tab 1' }).locator('[title="Pop out"]').click()
  await page.getByText('Tab Sorter').dragTo(page.getByText('Tab 1'))
  await page.locator('.window').dragTo(page.locator('footer'))
  await expect(page.locator('footer')).toBeVisible()
})

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
