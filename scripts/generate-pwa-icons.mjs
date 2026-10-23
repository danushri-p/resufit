// Renders the PWA install icons from public/logo.svg with Playwright's Chromium.
// Run with: node scripts/generate-pwa-icons.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const logo = await fs.readFile(path.join(root, "public/logo.svg"), "utf8");
const markOnly = logo
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace(/<rect[^>]*\/>/, "");

// Maskable icons are cropped to shapes like circles, so the mark sits inside the
// central safe zone (a circle with 40% of the icon size as radius) on a full-bleed tile.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#0B1020"/>
  <g transform="translate(60 60) scale(0.8) translate(-64 -57)">${markOnly}</g>
</svg>`;

const outputs = [
  { file: "icon-192.png", size: 192, svg: logo },
  { file: "icon-512.png", size: 512, svg: logo },
  { file: "maskable-512.png", size: 512, svg: maskable },
];

await fs.mkdir(path.join(root, "public/icons"), { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, svg } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${sized}</body></html>`,
    );
    await page.locator("svg").screenshot({
      path: path.join(root, "public/icons", file),
      omitBackground: true,
    });
    await page.close();
    console.log(`public/icons/${file}`);
  }
} finally {
  await browser.close();
}
