import { chromium } from "@playwright/test";
import { executablePath } from "./browser.mjs";
const browser = await chromium.launch({ headless: true, executablePath: executablePath(), args: ["--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
 const page = await browser.newPage({ viewport: {width:390,height:844} });
 page.on("console", m => { if(m.type()==="error")console.log("CONSOLE ERROR",m.text(),m.location()); });
 await page.goto("http://127.0.0.1:8445/#body"); await page.locator("iframe.is-ready").waitFor({timeout:60000});
 const frame=page.frames().find(f=>f.url().includes("planet.html"));
 await frame.evaluate(()=>{window.keys=[];document.addEventListener("keydown",e=>window.keys.push({key:e.key,target:e.target.id}),true);});
 await frame.locator("#scene").press("ArrowRight"); await page.waitForTimeout(1000);
 console.log("KEYBOARD",await frame.evaluate(()=>({keys:window.keys,stats:window.__PORTAL_PLANET__.stats(),active:document.activeElement.id,hidden:document.hidden})));
 await frame.locator("#scene").dispatchEvent("keydown",{key:"ArrowLeft"});await page.waitForTimeout(1000);
 console.log("DISPATCH",await frame.evaluate(()=>({keys:window.keys,stats:window.__PORTAL_PLANET__.stats()})));
} finally {await browser.close();}
