import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('[DEBUG] Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  
  // Log network activity
  page.on('request', req => {
    if (req.url().includes('ws')) {
      console.log(`[NETWORK] Request to ${req.url()}`);
    }
  });
  
  console.log('[DEBUG] Navigating to app...');
  try {
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`[DEBUG] Response status: ${response.status()}`);
  } catch (e) {
    console.log(`[DEBUG] Navigation error: ${e.message}`);
  }
  
  // Wait and check
  await page.waitForTimeout(3000);
  
  const title = await page.title();
  console.log(`[DEBUG] Page title: ${title}`);
  
  // Check if NotificationProvider is in page
  const bodyHTML = await page.innerHTML('body');
  const hasNotif = bodyHTML.includes('NotificationProvider') || bodyHTML.includes('useWebSocket');
  console.log(`[DEBUG] Page contains notification code: ${hasNotif}`);
  
  // Eval to check WebSocket hook
  try {
    const wsStatus = await page.evaluate(() => {
      return {
        online: navigator.onLine,
        protocol: window.location.protocol,
        host: window.location.host
      };
    });
    console.log(`[DEBUG] Page state:`, wsStatus);
  } catch (e) {
    console.log(`[DEBUG] Eval error: ${e.message}`);
  }
  
  // Take screenshot
  const screenshotPath = path.join(__dirname, 'ws-test-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[DEBUG] Screenshot saved to ${screenshotPath}`);
  
  await browser.close();
  console.log('[DEBUG] Done');
})();
