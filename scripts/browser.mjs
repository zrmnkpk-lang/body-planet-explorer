import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export function executablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (process.platform !== "win32") return undefined;
  const cache = join(homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  return readdirSync(cache).filter(p => /^chromium-\d+$/.test(p)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])).map(p => join(cache, p, "chrome-win64", "chrome.exe")).find(existsSync);
}
