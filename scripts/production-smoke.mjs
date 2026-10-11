import { chromium } from "@playwright/test";
import { executablePath } from "./browser.mjs";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, executablePath: executablePath(), args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
 const page = await browser.newPage({ viewport: {width:390,height:844} }); const errors=[];
 page.on("pageerror", e=>errors.push(e.message)); page.on("console", m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto("http://127.0.0.1:8446/#body"); await page.locator("iframe.is-ready").waitFor({timeout:60000});
 let frame=page.frames().find(f=>f.url().includes("planet.html")); await frame.waitForFunction(()=>window.__PORTAL_PLANET__?.stats().lods.includes(63),{timeout:30000}); const original=await frame.evaluate(()=>window.__PORTAL_PLANET__.stats());
 await page.getByRole("button",{name:"Update body data"}).click(); await page.getByLabel("Muscle",{exact:true}).fill("52"); await page.getByRole("button",{name:"Save body data"}).click(); await page.locator("iframe.is-ready").waitFor({timeout:60000});
 frame=page.frames().find(f=>f.url().includes("planet.html")); await frame.waitForFunction(()=>window.__PORTAL_PLANET__?.stats().lods.includes(63),{timeout:30000}); const changed=await frame.evaluate(()=>window.__PORTAL_PLANET__.stats());
 if(changed.sampleMountain===original.sampleMountain||changed.body.muscle!==52||errors.length)throw new Error(JSON.stringify({errors,original,changed}));
 const status=await (await page.request.get("http://127.0.0.1:8446/api/coach/status")).json();
 await writeFile("docs/development/production-smoke.json",JSON.stringify({result:"PASS",errors,original,changed,status},null,2)); console.log("PASS: production React entry, real WebGL globe, worker LOD, saved body geometry changes, same-origin offline coach endpoint");
} finally {await browser.close();}
