import { chromium } from "playwright-core";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("console", (msg) => console.log("CONSOLE:", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
page.on("requestfailed", (req) => console.log("REQUESTFAILED:", req.url(), req.failure()?.errorText));
page.on("response", (res) => console.log("RESPONSE:", res.status(), res.url()));

// Server is already confirmed down at this point.
await page.goto("http://localhost:5173/jobs/qpuj0NDThD", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);

const bodyText = await page.locator("body").innerText();
console.log("BODY_AFTER_8s:", JSON.stringify(bodyText));

await page.screenshot({ path: "shot-diag-server-down.png", fullPage: true });
await browser.close();
