import { defineConfig } from "@playwright/test"
import { executablePath } from "./scripts/browser.mjs"
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/development/test-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:8445",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: executablePath(),
      args: [
        "--enable-webgl",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8445",
    reuseExistingServer: true,
    timeout: 60000,
  },
})
