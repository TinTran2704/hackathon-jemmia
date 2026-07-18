import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:5173/jobs/qpuj0NDThD", { waitUntil: "networkidle" });
await page.waitForSelector("text=Candidates");
const jobTitle = "qpuj0NDThD";

await page.waitForSelector("text=Candidates");
await page.screenshot({ path: "shot-2-detail-candidates.png", fullPage: true });

await page.click('button:has-text("Criteria")');
await page.waitForTimeout(1000);
await page.screenshot({ path: "shot-3-criteria.png", fullPage: true });

await page.click('button:has-text("Ranking")');
await page.waitForTimeout(1500);
await page.screenshot({ path: "shot-4-ranking.png", fullPage: true });

// Expand the first ranked card
const firstCard = page.locator(".rounded-lg.border.border-slate-200.bg-white.shadow-sm button").first();
if (await firstCard.count()) {
  await firstCard.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "shot-5-expanded.png", fullPage: true });
}

console.log("JOB_TITLE:", jobTitle);
console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors, null, 2));

await browser.close();
