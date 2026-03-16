import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'gen-banner.html');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`);
await page.waitForLoadState('networkidle');

// Wait for font to load
await page.waitForTimeout(1000);

// Light banner
const light = await page.$('#light');
await light.screenshot({ path: join(__dirname, 'banner-light.png'), omitBackground: false });

// Dark banner
const dark = await page.$('#dark');
await dark.screenshot({ path: join(__dirname, 'banner-dark.png'), omitBackground: false });

await browser.close();
console.log('Done: banner-light.png, banner-dark.png');
