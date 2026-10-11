import { chromium } from "@playwright/test";
import { executablePath } from "./browser.mjs";
const browser = await chromium.launch({ headless: true, executablePath: executablePath(), args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("console", m => { if (m.type() === "error") console.log("ERROR", m.text()); }); page.on("pageerror", console.error);
  await page.goto("http://127.0.0.1:8445/", { waitUntil: "domcontentloaded" }); await page.locator("iframe.is-ready").waitFor({ timeout: 60000 });
  console.log("OUTER", await page.locator("iframe").evaluate(e => ({ bounds: e.getBoundingClientRect().toJSON(), css: getComputedStyle(e).opacity })));
  const frame = page.frames().find(f => f.url().includes("planet.html"));
  console.log("INNER", await frame.evaluate(() => ({ stats: window.__PORTAL_PLANET__.stats(), elements: ["html", "body", "#app", "#scene", "canvas"].map(s => { const e = document.querySelector(s); const c = getComputedStyle(e); return { tag: s, rect: e.getBoundingClientRect().toJSON(), display: c.display, opacity: c.opacity, visibility: c.visibility }; }) })));
  await page.screenshot({ path: "docs/development/screenshots/home-debug.png", timeout: 60000 });
  await page.getByRole("navigation").getByRole("button", { name: "Body Planet", exact: true }).click(); await page.locator("iframe.is-ready").waitFor({ timeout: 60000 });
  console.log("BODY READY"); await page.screenshot({ path: "docs/development/screenshots/body-debug.png", timeout: 60000 });
} finally { await browser.close(); }
