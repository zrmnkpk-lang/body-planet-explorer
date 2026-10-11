import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { executablePath } from "./browser.mjs";
const output = "docs/development/screenshots"; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: executablePath(), args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); const errors = [];
page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("response", r => { if (r.status() >= 400) console.log("HTTP ERROR", r.status(), r.url()); });
await page.goto("http://127.0.0.1:8445/", { waitUntil: "networkidle", timeout: 60000 });
await page.locator(".latest-planet-view iframe.is-ready").waitFor({ timeout: 60000 });
await page.screenshot({ timeout: 60000, path: `${output}/home.png` });
const layouts = { home: await page.locator(".page-content").evaluate(e => ({ client: e.clientHeight, scroll: e.scrollHeight })) };
for (const [tab, label] of [["train", "Train"], ["body", "Body Planet"], ["coach", "AI Coach"]]) {
  await page.getByRole("navigation").getByRole("button", { name: label, exact: true }).click();
  if (tab === "body") { await page.locator(".latest-planet-view iframe.is-ready").waitFor({ timeout: 60000 }); const f = page.frames().find(f => f.url().includes("planet.html")); await f.waitForFunction(() => window.__PORTAL_PLANET__?.stats().lods.includes(63), { timeout: 30000 }); console.log("REAL PLANET", await f.evaluate(() => window.__PORTAL_PLANET__.stats())); }
  await page.screenshot({ timeout: 60000, path: `${output}/${tab}.png` }); layouts[tab] = await page.locator(".page-content").evaluate(e => ({ client: e.clientHeight, scroll: e.scrollHeight }));
}
await page.getByRole("navigation").getByRole("button", { name: "Home", exact: true }).click(); await page.getByRole("button", { name: "Open account" }).click(); await page.screenshot({ timeout: 60000, path: `${output}/account.png` });
console.log(JSON.stringify({ errors, layouts }, null, 2)); await writeFile("docs/development/visual-smoke.json", JSON.stringify({ errors, layouts }, null, 2)); await browser.close(); if (errors.length) process.exitCode = 1;
