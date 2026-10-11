import { test, expect, type Page } from "@playwright/test"
const key = "portal-fitness:v1"
const nav = (page: Page, label: string) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name: label, exact: true })
    .click()
const saved = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key)
test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })
})
test("four-tab home fits the mobile viewport and drawer closes with restored focus", async ({
  page,
}) => {
  await expect(page.getByRole("navigation").getByRole("button")).toHaveCount(4)
  const main = page.locator(".page-content")
  expect(
    await main.evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
  ).toBeTruthy()
  await page.getByRole("button", { name: "Open account" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(
    page.getByText("Account information", { exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Settings", { exact: true })).toBeVisible()
  await expect(page.getByText("weekly goal", { exact: false })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Open account" })).toBeFocused()
})
test("saved plan and canceled drafts stay consistent across home and train", async ({
  page,
}) => {
  await page.getByRole("button", { name: "View plan", exact: true }).click()
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Training duration", { exact: true }).fill("15")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await nav(page, "Train")
  await expect(page.getByText("20 min · 5 exercises")).toBeVisible()
  await page.getByRole("button", { name: "View workout", exact: true }).click()
  await page.getByRole("button", { name: "Edit today’s plan" }).click()
  await page.getByLabel("Training duration", { exact: true }).fill("15")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await page.reload()
  await expect(page.getByText("15 min · 5 exercises")).toBeVisible()
  expect((await saved(page)).plan.version).toBe(2)
})
test("free workout selection, pause and reload preserve the live session; partial save is idempotent", async ({
  page,
}) => {
  await nav(page, "Train")
  await page
    .getByRole("button", { name: "Start a free workout", exact: true })
    .click()
  await expect(page.getByText("Your workout, your way")).toBeVisible()
  await page.getByRole("button", { name: "Add exercises", exact: true }).click()
  await page.getByRole("checkbox", { name: /Bodyweight squat/ }).check()
  await page.getByRole("checkbox", { name: /Plank/ }).check()
  await page.getByRole("button", { name: "Add 2 exercises" }).click()
  await page.getByRole("button", { name: "Complete set", exact: true }).click()
  await page.getByRole("button", { name: "Skip rest", exact: true }).click()
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const before = await saved(page)
  await page.reload()
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click()
  await expect(page.getByText("Paused", { exact: true })).toBeVisible()
  expect((await saved(page)).session.id).toBe(before.session.id)
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Save partial workout", exact: true })
    .click()
  const after = await saved(page)
  expect(
    after.records.filter((r: any) => r.id === after.session.id),
  ).toHaveLength(1)
  expect(after.xp).toBe(320)
  await page.reload()
  expect((await saved(page)).records).toHaveLength(after.records.length)
})
test("planned workout completes all sets and updates XP once", async ({
  page,
}) => {
  await nav(page, "Train")
  await page.getByRole("button", { name: "View workout", exact: true }).click()
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click()
  for (let i = 0; i < 10; i++) {
    await page
      .getByRole("button", { name: "Complete set", exact: true })
      .click()
    if (i < 9)
      await page.getByRole("button", { name: "Skip rest", exact: true }).click()
  }
  await page.getByRole("button", { name: "Save workout", exact: true }).click()
  await expect(
    page.getByText("Workout completed", { exact: true }),
  ).toBeVisible()
  const value = await saved(page)
  expect(value.xp).toBe(340)
  expect(value.plan.completed).toBe(true)
  await page.reload()
  expect((await saved(page)).xp).toBe(340)
})
test("changing today’s plan leaves an active workout snapshot unchanged", async ({
  page,
}) => {
  await nav(page, "Train")
  await page.getByRole("button", { name: "View workout", exact: true }).click()
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click()
  const before = await saved(page)
  await nav(page, "Home")
  await page.getByRole("button", { name: "View plan", exact: true }).click()
  await page.getByRole("button", { name: "Edit", exact: true }).click()
  await page.getByLabel("Training duration", { exact: true }).fill("15")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  const after = await saved(page)
  expect(after.plan.duration).toBe(15)
  expect(after.session.exercises).toEqual(before.session.exercises)
  expect(after.session.planVersion).toBe(1)
})
test("body validation and cancel do not publish; save changes real geometry and worker profile", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGL|GLSL/i.test(m.text()))
      errors.push(m.text())
  })
  await nav(page, "Body Planet")
  await page.locator("iframe.is-ready").waitFor({ timeout: 60000 })
  const initial = await page
    .frames()
    .find((f) => f.url().includes("planet.html"))!
    .evaluate(() => (window as any).__PORTAL_PLANET__.stats())
  await page.getByRole("button", { name: "Update body data" }).click()
  await page.getByLabel("Water", { exact: true }).fill("101")
  await page.getByRole("button", { name: "Save body data" }).click()
  await expect(
    page.getByText("Enter a number between 0 and 100."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(page.getByRole("button", { name: "Water 58.3%" })).toBeVisible()
  await page.getByRole("button", { name: "Update body data" }).click()
  await page.getByLabel("Muscle", { exact: true }).fill("52")
  await page.getByLabel("Bone", { exact: true }).fill("5")
  await page.getByLabel("Water", { exact: true }).fill("80")
  await page.getByLabel("Body fat", { exact: true }).fill("35")
  await page.getByRole("button", { name: "Save body data" }).click()
  await page.locator("iframe.is-ready").waitFor({ timeout: 60000 })
  const frame = page.frames().find((f) => f.url().includes("planet.html"))!
  const changed = await frame.evaluate(() =>
    (window as any).__PORTAL_PLANET__.stats(),
  )
  expect(changed.body.muscle).toBe(52)
  expect(changed.sampleMountain).not.toBe(initial.sampleMountain)
  expect(changed.sampleIce).not.toBe(initial.sampleIce)
  expect(changed.shape.channel).toBeGreaterThan(1)
  expect(changed.shape.moisture).toBeLessThan(0)
  await expect
    .poll(
      async () =>
        (await frame.evaluate(() => (window as any).__PORTAL_PLANET__.stats()))
          .lods,
    )
    .toContain(63)
  await page.screenshot({
    path: "docs/development/screenshots/body-data-updated.png",
    timeout: 60000,
  })
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Muscle 52.0 kg" }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
test("planet selection, focus, zoom, reset and keyboard rotation operate the actual renderer", async ({
  page,
}) => {
  await nav(page, "Body Planet")
  await page.locator("iframe.is-ready").waitFor({ timeout: 60000 })
  const frame = page.frames().find((f) => f.url().includes("planet.html"))!
  await page.getByRole("button", { name: "Muscle 32.8 kg" }).click()
  await expect(page.getByText("Mountain ranges", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Explore this region" }).click()
  await expect(
    page.getByRole("button", { name: "Return to overview" }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      Math.hypot(
        ...(
          await frame.evaluate(() => (window as any).__PORTAL_PLANET__.stats())
        ).camera,
      ),
    )
    .toBeLessThan(2)
  await page.getByRole("button", { name: "Reset planet view" }).click()
  await expect(page.getByText("Mountain ranges", { exact: true })).toHaveCount(
    0,
  )
  await expect.poll(async () => Math.hypot(...(await frame.evaluate(() => (window as any).__PORTAL_PLANET__.stats())).camera)).toBeGreaterThan(3.4)
  await frame.locator("#scene").press("ArrowRight")
  await expect
    .poll(
      async () =>
        (await frame.evaluate(() => (window as any).__PORTAL_PLANET__.stats()))
          .rotation[1],
    )
    .not.toBe(0)
})
test("local save failure keeps the body draft and existing saved value", async ({
  page,
}) => {
  await nav(page, "Body Planet")
  await page.getByRole("button", { name: "Update body data" }).click()
  await page.getByLabel("Muscle", { exact: true }).fill("40")
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError")
    }
  })
  await page.getByRole("button", { name: "Save body data" }).click()
  await expect(page.getByRole("alert")).toContainText("could not be saved")
  await expect(page.getByLabel("Muscle", { exact: true })).toHaveValue("40")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Muscle 32.8 kg" }),
  ).toBeVisible()
})
test("AI quick entry preserves context and draft; unavailable service is explicit", async ({
  page,
}) => {
  await nav(page, "Train")
  await page.getByRole("button", { name: "Ask AI Coach…", exact: true }).click()
  await expect(
    page.getByText("Context from Train", { exact: false }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "I only have 15 minutes", exact: true })
    .click()
  await expect(page.getByRole("textbox", { name: "Ask AI Coach" })).toHaveValue(
    "I only have 15 minutes",
  )
  await nav(page, "Home")
  await nav(page, "AI Coach")
  await expect(page.getByRole("textbox", { name: "Ask AI Coach" })).toHaveValue(
    "I only have 15 minutes",
  )
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(
    page.getByText("Coach isn’t connected yet", { exact: true }),
  ).toBeVisible()
  expect((await saved(page)).conversations[0].messages).toHaveLength(1)
})
test("connected service contract produces a reviewed 15 minute plan, not an automatic write", async ({
  page,
}) => {
  await page.route("**/api/coach/status", (route) =>
    route.fulfill({ json: { available: true } }),
  )
  await page.route("**/api/coach", (route) =>
    route.fulfill({
      json: {
        content: "Here’s a shorter workout. Review it before saving.",
        plan: {
          duration: 15,
          exerciseIds: ["arm-circles", "squat", "push-up", "plank", "stretch"],
        },
      },
    }),
  )
  await page.reload()
  await nav(page, "AI Coach")
  await page
    .getByRole("button", { name: "I only have 15 minutes", exact: true })
    .click()
  await page.getByRole("button", { name: "Send message" }).click()
  await page.getByRole("button", { name: "Review changes" }).click()
  expect((await saved(page)).plan.duration).toBe(20)
  await page.getByRole("button", { name: "Save to today’s plan" }).click()
  expect((await saved(page)).plan.duration).toBe(15)
  await nav(page, "Train")
  await expect(page.getByText("15 min · 5 exercises")).toBeVisible()
})
test("membership has no fabricated prices; reduce motion persists", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open account" }).click()
  await page
    .getByRole("button", { name: /Portal Plus Explore membership/ })
    .click()
  await expect(
    page.getByText("Plans unavailable", { exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Back to account" }).click()
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await page.getByRole("checkbox", { name: /Reduce motion/ }).check()
  await page.keyboard.press("Escape")
  await page.reload()
  expect((await saved(page)).settings.reduceMotion).toBe(true)
})
for (const width of [320, 430, 1280])
  test(`navigation and content do not overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    for (const label of ["Home", "Train", "Body Planet", "AI Coach"]) {
      await nav(page, label)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      const navBounds = await page.getByRole("navigation").boundingBox()
      expect(navBounds!.y + navBounds!.height).toBeLessThanOrEqual(845)
    }
  })
