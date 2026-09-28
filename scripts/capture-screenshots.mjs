import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const productionUrl = process.argv[2] ?? "https://world-currency-flow-map.vercel.app";
const outputDirectory = path.resolve("docs/screenshots");
const issues = [];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });

function watchPage(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`${label} console: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`${label} pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    issues.push(`${label} requestfailed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
  });
}

async function openApp(context, label) {
  const page = await context.newPage();
  watchPage(page, label);
  const response = await page.goto(productionUrl, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${label}: production returned HTTP ${response?.status()}`);
  await page.getByRole("heading", { name: "世界地図で、通貨の強弱を読む。" }).waitFor();
  return page;
}

const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  colorScheme: "dark",
  deviceScaleFactor: 1,
});
const desktop = await openApp(desktopContext, "desktop");

await desktop.screenshot({ path: path.join(outputDirectory, "01-world-flow.png") });

await desktop
  .getByRole("button", { name: /^USD\/JPY \+1\.2%、JPYからUSD/ })
  .press("Enter");
await desktop.getByRole("heading", { name: "USD/JPY" }).waitFor();
await desktop.screenshot({ path: path.join(outputDirectory, "02-usdjpy.png") });

await desktop.getByRole("button", { name: "詳細を閉じる" }).click();
await desktop.getByRole("button", { name: "¥ 円を見る" }).click();
await desktop.getByRole("heading", { name: /JPYを見る/ }).waitFor();
await desktop.screenshot({ path: path.join(outputDirectory, "03-jpy-focus.png") });

await desktop.getByRole("button", { name: "通貨ランキング", exact: true }).click();
await desktop.getByRole("heading", { name: "通貨強弱ランキング" }).first().waitFor();
await desktop.screenshot({ path: path.join(outputDirectory, "04-strength-ranking.png") });

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const mobile = await openApp(mobileContext, "mobile");
await mobile.getByRole("heading", { name: "世界通貨フロー" }).scrollIntoViewIfNeeded();
await mobile.screenshot({ path: path.join(outputDirectory, "05-mobile.png") });
await mobile.getByRole("button", { name: "地図を操作" }).click();

const tabletContext = await browser.newContext({
  viewport: { width: 820, height: 1100 },
  colorScheme: "dark",
  deviceScaleFactor: 1,
  hasTouch: true,
});
const tablet = await openApp(tabletContext, "tablet");

const qa = {
  desktop: await desktop.evaluate(() => ({
    width: innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  })),
  mobile: {
    ...(await mobile.evaluate(() => ({
      width: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))),
    mapTouchAction: await mobile
      .getByRole("button", { name: "スクロールに戻る" })
      .evaluate((element) => getComputedStyle(element.parentElement).touchAction),
  },
  tablet: await tablet.evaluate(() => ({
    width: innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  })),
};

await desktopContext.close();
await mobileContext.close();
await tabletContext.close();
await browser.close();

console.log(JSON.stringify({ productionUrl, outputDirectory, qa, issues }, null, 2));
if (
  qa.desktop.scrollWidth > qa.desktop.clientWidth ||
  qa.mobile.scrollWidth > qa.mobile.clientWidth ||
  qa.tablet.scrollWidth > qa.tablet.clientWidth
) {
  throw new Error("Horizontal overflow detected.");
}
if (qa.mobile.mapTouchAction !== "none") throw new Error("Mobile map gesture lock did not activate.");
if (issues.length > 0) throw new Error("Production browser issues detected.");
