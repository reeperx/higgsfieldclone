/**
 * Capture selected pages at desktop and mobile widths into docs/screens/vendo-<page>-<width>.png.
 *   BASE_URL=http://localhost:3000 pnpm exec tsx scripts/screenshots.ts
 */
import { chromium } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const PAGES: [name: string, path: string][] = [
  ["home", "/"],
  ["image", "/image"],
  ["video", "/video"],
  ["effects", "/effects"],
  ["effects-detail", "/effects/neon-noir"],
  ["community", "/community"],
  ["pricing", "/pricing"],
  ["login", "/login"],
]

/**
 * Tries the Chrome brand channel, then CHROMIUM_PATH (a pinned cache build or
 * system chromium), then Playwright's own chromium — the npm package's browser
 * revision does not always match what a machine has cached.
 */
async function launch() {
  const candidates: Parameters<typeof chromium.launch>[0][] = [
    { channel: "chrome" },
    ...(process.env.CHROMIUM_PATH
      ? [{ executablePath: process.env.CHROMIUM_PATH }]
      : []),
    { channel: "chromium" },
  ]
  const failures: string[] = []
  for (const options of candidates) {
    try {
      return await chromium.launch(options)
    } catch (error) {
      failures.push(String(error))
    }
  }
  throw new Error(
    `No usable browser; install Chrome or set CHROMIUM_PATH.\n${failures.join("\n")}`
  )
}

const browser = await launch()
for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    deviceScaleFactor: width === 390 ? 2 : 1,
    isMobile: width === 390,
    hasTouch: width === 390,
  })
  await context.addInitScript(() =>
    localStorage.setItem(
      "vireo.consent.v1",
      JSON.stringify({
        essential: true,
        analytics: false,
        marketing: false,
        at: 0,
      })
    )
  )
  const page = await context.newPage()
  for (const [name, path] of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `docs/screens/vendo-${name}-${width}.png` })
    console.log(`captured ${name} @ ${width}`)
  }
  await context.close()
}
await browser.close()
