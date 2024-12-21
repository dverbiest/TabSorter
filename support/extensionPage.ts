import { type BrowserContext, Page } from "@playwright/test";

export class ExtensionPage {
  constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    readonly toggle = page.locator('[data-region-name="header"]')
  ) {}
}
