
import { test as baseTest, chromium } from '@playwright/test';

const bravePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

export const test = baseTest.extend({
  browser: async ({}, use) => {
    const browser = await chromium.launch({
      executablePath: bravePath,
    });
    await use(browser);
    // await browser.close();
  },
});

export { expect } from '@playwright/test';
