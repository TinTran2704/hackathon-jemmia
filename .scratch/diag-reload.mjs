import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on("requestfailed", (req) => consoleErrors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`));

await page.goto("http://localhost:5173/jobs/qpuj0NDThD", { waitUntil: "networkidle" });
await page.click('button:has-text("Criteria")');
await page.waitForTimeout(1000);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "shot-diag-after-reload.png", fullPage: true });
console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors, null, 2));
await browser.close();
