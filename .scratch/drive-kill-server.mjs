import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:5173/jobs/qpuj0NDThD", { waitUntil: "networkidle" });
await page.click('button:has-text("Ranking")');
await page.waitForTimeout(1000);

console.log("KILL_SERVER_NOW");
// give the outer script time to kill the server process, then reload
await page.waitForTimeout(15000);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

const bodyText = await page.locator("body").innerText();
console.log("BODY_LENGTH:", bodyText.length);
console.log("BODY_SNIPPET:", bodyText.slice(0, 300));

await page.screenshot({ path: "shot-9-server-down.png", fullPage: true });
await browser.close();
