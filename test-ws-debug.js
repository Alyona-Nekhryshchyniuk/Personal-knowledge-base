const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('[DEBUG] Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Log all console messages from the page
  page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err}`));
  
  // Intercept network requests to check WebSocket
  await page.route('**/*', route => route.continue());
  
  console.log('[DEBUG] Navigating to app...');
  try {
    const response = await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`[DEBUG] Response status: ${response.status()}`);
  } catch (e) {
    console.log(`[DEBUG] Navigation error: ${e.message}`);
  }
  
  // Wait a bit and take screenshot
  await page.waitForTimeout(2000);
  
  // Check the page content
  const title = await page.title();
  console.log(`[DEBUG] Page title: ${title}`);
  
  const html = await page.content();
  console.log(`[DEBUG] Page has content: ${html.length} bytes`);
  
  // Look for NotificationProvider or WebSocket code
  const hasNotifProvider = html.includes('NotificationProvider');
  console.log(`[DEBUG] Has NotificationProvider: ${hasNotifProvider}`);
  
  // Check for errors in console
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Take screenshot
  const screenshotPath = path.join(process.cwd(), 'ws-test-screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`[DEBUG] Screenshot saved to ${screenshotPath}`);
  
  await browser.close();
  console.log('[DEBUG] Browser closed');
})();
