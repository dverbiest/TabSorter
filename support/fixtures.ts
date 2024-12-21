import { test as base, chromium, BrowserContext, Response } from "@playwright/test"

const createUtils = (context: BrowserContext) => ({
  newTab: async (url: string): Promise<Response | null> => {
    return (await context.newPage()).goto(url)
  }
})

interface TestFixtures {
  context: BrowserContext
  extensionId: string
  utils: ReturnType<typeof createUtils>
}

export const test = base.extend<TestFixtures>({
  context: async ({ context }, use) => {
    const pathToExtension = 'dist'
    context = await chromium.launchPersistentContext('', {
      viewport: { width: 400, height: 800 },
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--browser-test'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    })
    await use(context)
    // await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background)
      background = await context.waitForEvent("serviceworker")
    const extensionId = background.url().split("/")[2]
    await use(extensionId)
  },
  utils: async ({ context }, use) => {
    await use(createUtils(context))
  }
})

export const expect = test.expect
