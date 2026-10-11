import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { executablePath } from "./browser.mjs";

const dir = "docs/development/visual-refinement/2026-10-11";
await mkdir(`${dir}/after`, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: executablePath(), args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [], layouts = [], assets = [];
let realPlanet;
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", e => errors.push(e.message));
page.on("console", e => { if (e.type() === "error") errors.push(e.text()); });
const nav = label => page.getByRole("navigation").getByRole("button", { name: label, exact: true }).click();
async function capture(name) {
  await page.screenshot({ path: `${dir}/after/${name}.png`, timeout: 60000 });
  layouts.push(await page.evaluate(name => ({ name, viewport: innerWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, content: document.querySelector("main").clientHeight, scroll: document.querySelector("main").scrollHeight }), name));
}
try {
  const base = process.env.PORTAL_PREVIEW_URL ?? "http://127.0.0.1:8445/";
  await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("iframe.is-ready").waitFor({ timeout: 60000 });
  const first = page.frames().find(f => f.url().includes("planet.html"));
  await first.waitForFunction(() => window.__PORTAL_PLANET__?.stats().lods.includes(63));
  await capture("home");
  await page.getByRole("button", { name: "View plan", exact: true }).click();
  await capture("today-plan");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await capture("edit-plan");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open account" }).click();
  await capture("account");
  await page.keyboard.press("Escape");
  await nav("Train"); await capture("train");
  await page.getByRole("button", { name: "View workout", exact: true }).click();
  await capture("workout-plan");
  await page.getByRole("button", { name: "Start training", exact: true }).click();
  await capture("workout-active");
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await capture("exercise-picker");
  await page.keyboard.press("Escape");
  await nav("Body Planet");
  await page.locator("iframe.is-ready").waitFor({ timeout: 60000 });
  const planet = page.frames().find(f => f.url().includes("planet.html"));
  await planet.waitForFunction(() => window.__PORTAL_PLANET__?.stats().lods.includes(63));
  await capture("body");
  realPlanet = await planet.evaluate(() => window.__PORTAL_PLANET__.stats());
  await page.getByRole("button", { name: "Muscle 32.8 kg", exact: true }).click();
  await capture("body-selected");
  await page.getByRole("button", { name: "Update body data", exact: true }).click();
  await capture("edit-body");
  await page.keyboard.press("Escape");
  await nav("AI Coach"); await capture("coach");
  for (const width of [320, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ["Home", "Train", "Body Planet", "AI Coach"]) {
      await nav(tab);
      layouts.push(await page.evaluate(tab => ({ name: tab, viewport: innerWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, content: document.querySelector("main").clientHeight, scroll: document.querySelector("main").scrollHeight }), tab));
    }
  }
  const renderedArt = await page.evaluate(() => [...document.querySelectorAll("img")].map(e => ({ src: e.getAttribute("src"), loaded: e.complete && e.naturalWidth > 0 })));
  for (const name of ["body-metric-atlas", "maya-exercise-atlas", "alpine-night"]) {
    const path = `public/assets/visual-v2/${name}.png`, bytes = await readFile(path);
    assets.push({ path, bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const report = { date: new Date().toISOString(), visualReference: "Approved Home V6 / Body Planet V5 / Train V2", errors, layouts, assets, renderedArt, realPlanet };
  await writeFile(`${dir}/verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors, horizontalOverflow: layouts.filter(x => x.horizontalOverflow), screenshots: 12, assets: assets.map(x => ({ path: x.path, width: x.width, height: x.height })) }, null, 2));
  if (errors.length || layouts.some(x => x.horizontalOverflow)) process.exitCode = 1;
} finally { await browser.close(); }
