import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

await page.goto("http://localhost:5173/jobs/qpuj0NDThD", { waitUntil: "networkidle" });
await page.click('button:has-text("Criteria")');
await page.waitForSelector("text=Weighted criteria");

// Move the first slider (postgresql, weight 3) down to 1 via keyboard for a reliable discrete change.
const firstSlider = page.locator('input[type="range"]').first();
await firstSlider.focus();
await firstSlider.press("ArrowLeft");
await page.waitForTimeout(800);
await firstSlider.press("ArrowLeft");
await page.waitForTimeout(1500); // onKeyUp commit + refetch
await page.screenshot({ path: "shot-6-weight-changed.png", fullPage: true });

// Reload (tab selection is local state, not URL-based, so it resets to
// Candidates — re-select Criteria) and confirm the new weight persisted.
await page.reload({ waitUntil: "networkidle" });
await page.click('button:has-text("Criteria")');
await page.waitForSelector("text=Weighted criteria");
const firstRowWeightText = await page.locator("li:has-text('PostgreSQL')").first().innerText();
console.log("AFTER_RELOAD_ROW:", firstRowWeightText.replace(/\n/g, " | "));

// Go to Ranking — expect a stale banner now.
await page.click('button:has-text("Ranking")');
await page.waitForTimeout(1000);
await page.screenshot({ path: "shot-7-stale-banner.png", fullPage: true });

const rescoreButton = page.locator('button:has-text("Re-score all")');
const hasBanner = (await rescoreButton.count()) > 0;
console.log("STALE_BANNER_PRESENT:", hasBanner);

if (hasBanner) {
  await rescoreButton.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "shot-8-after-rescore.png", fullPage: true });
}

console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
await browser.close();
