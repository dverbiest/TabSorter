import { test, expect } from "../support/fixtures";

test("example test", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page.locator("body")).toHaveText("Changed by my-extension");
});

test("popup page", async ({ page }) => {
  // const newTab = async (url: string) => (await page.context().newPage()).goto(url);
  // await page.goto(`chrome-extension://${extensionId}/index.html`);
  // for (let i = 1; i <= 15; i++) await newTab(`data:,Tab ${i}`);
  // await page.getByText("about:blank").dragTo(page.getByText("Data:,Tab 15"));
  // await page.getByText("Data:,12").dragTo(page.getByText("about:blank"));
  // await page.getByText("about:blank").dragTo(page.getByText("Data:,12"));
  // await page.getByText("Data:,12").dragTo(page.getByText("about:blank"));
  // await page.getByText("about:blank").dragTo(page.getByText("Data:,12"));
  // await page.getByText("Data:,12").dragTo(page.getByText("about:blank"));
  // await page.getByText("about:blank").dragTo(page.getByText("Data:,12"));
  // await page.getByText("Data:,12").dragTo(page.getByText("about:blank"));
  // await page.getByText("about:blank").dragTo(page.getByText("Data:,12"));
  // await page.getByText("Data:,12").dragTo(page.getByText("about:blank"));
  await expect(page.locator(".legend")).toContainText("Last viewed:");
});
