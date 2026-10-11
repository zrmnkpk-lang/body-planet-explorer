import { test, expect, type Page } from "@playwright/test";
const nav = (page: Page, label: string) => page.getByRole("navigation").getByRole("button", { name: label, exact: true }).click();
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("portal-fitness:v1")!));
test("AI review detects a plan changed in another tab and requires a new review", async ({ page, context }) => {
  await page.route("**/api/coach/status", r => r.fulfill({ json: { available: true } }));
  await page.route("**/api/coach", r => r.fulfill({ json: { content: "Please review this workout.", plan: { duration: 15, exerciseIds: ["squat", "plank"] } } }));
  await page.goto("/"); await nav(page, "AI Coach"); await page.getByRole("button", { name: "I only have 15 minutes", exact: true }).click(); await page.getByRole("button", { name: "Send message" }).click(); await page.getByRole("button", { name: "Review changes" }).click();
  const other = await context.newPage(); await other.goto("/"); await other.getByRole("button", { name: "View plan", exact: true }).click(); await other.getByRole("button", { name: "Edit", exact: true }).click(); await other.getByLabel("Training duration", { exact: true }).fill("10"); await other.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.bringToFront(); await expect.poll(async () => (await saved(page)).plan.duration).toBe(10); await page.getByRole("button", { name: "Save to today’s plan" }).click(); await expect(page.getByRole("alert")).toContainText("plan changed"); expect((await saved(page)).plan.duration).toBe(10); await page.getByRole("button", { name: "Review against latest plan" }).click(); await page.getByRole("button", { name: "Save to today’s plan" }).click(); expect((await saved(page)).plan.duration).toBe(15); await other.close();
});
test("renderer failure offers an actual retry without a static planet substitute", async ({ page }) => {
  let failed = false;
  await page.route("**/planet.html?**", route => { const query = new URL(route.request().url()).searchParams; if (query.get("thumbnail") === "0" && !failed) { failed = true; return route.fulfill({ contentType: "text/html", body: '<script>parent.postMessage({type:"portal:error"},location.origin)</script>' }); } return route.continue(); });
  await page.goto("/"); await nav(page, "Body Planet"); await expect(page.getByText("Your planet could not be loaded.")).toBeVisible(); await page.getByRole("button", { name: "Try again" }).click(); await page.locator("iframe.is-ready").waitFor({ timeout: 60000 }); await expect(page.getByText("Your planet could not be loaded.")).toHaveCount(0); expect(await page.frames().find(f => f.url().includes("planet.html"))!.evaluate(() => (window as any).__PORTAL_PLANET__.stats().triangles)).toBeGreaterThan(0);
});
