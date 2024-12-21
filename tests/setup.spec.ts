import { test } from '../support/fixtures';

test('Allow and start extension', async ({ page, extensionId }) => {
  await page.goto(`chrome://extensions/?id=${extensionId}`)
  if(await page.locator('#allow-incognito cr-toggle').getAttribute('checked') === null)
    await page.locator('#allow-incognito cr-toggle').click({ force: true })
  await page.goto(`chrome-extension://${extensionId}/index.html`);
});
