import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('[TEST] Starting complete WebSocket test...');
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track WebSocket connections
  let appWsConnected = false;
  const wsConnections = [];
  
  page.on('websocket', ws => {
    const url = ws.url();
    console.log(`[WS] WebSocket created: ${url}`);
    
    if (url.includes('/ws')) {
      appWsConnected = true;
      console.log('[WS] *** NOTIFICATION WEBSOCKET DETECTED ***');
    }
    
    wsConnections.push({ url, connected: true });
    
    ws.on('framereceived', data => {
      if (url.includes('/ws')) {
        console.log(`[WS-APP] Message received:`, data.payload);
      }
    });
  });
  
  // Log page errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR] ${msg.text()}`);
    }
  });
  
  console.log('[TEST] Step 1: Navigate to home');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  console.log('[TEST] Step 2: Navigate to signin page');
  await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle' });
  
  // Check if there's a test account or dev login option
  const hasTestLogin = await page.locator('text=/test|dev|demo/i').isVisible().catch(() => false);
  console.log('[TEST] Has test login option:', hasTestLogin);
  
  // Look for OAuth buttons or links
  const buttons = await page.locator('button').allTextContents();
  console.log('[TEST] Available buttons:', buttons);
  
  const links = await page.locator('a').allTextContents();
  console.log('[TEST] Available links:', links);
  
  // Try to find sign in with Google or GitHub
  const googleBtn = page.locator('text=/Google|google/i').first();
  const githubBtn = page.locator('text=/GitHub|github/i').first();
  
  console.log('[TEST] Google button visible:', await googleBtn.isVisible().catch(() => false));
  console.log('[TEST] GitHub button visible:', await githubBtn.isVisible().catch(() => false));
  
  // Take screenshot of signin page
  const signinScreenshot = path.join(__dirname, 'ws-test-signin.png');
  await page.screenshot({ path: signinScreenshot, fullPage: true });
  console.log(`[TEST] Signin page screenshot: ${signinScreenshot}`);
  
  console.log('[TEST] Checking for session...');
  // Try to get session info
  try {
    const response = await page.request.get('http://localhost:3000/api/auth/session');
    const session = await response.json();
    console.log('[TEST] Current session:', session);
  } catch (e) {
    console.log('[TEST] No session found (expected)');
  }
  
  console.log('[TEST] Summary:');
  console.log(`  - App WebSocket connected: ${appWsConnected}`);
  console.log(`  - Total WS connections: ${wsConnections.length}`);
  console.log(`  - HMR connections: ${wsConnections.filter(w => !w.url.includes('/ws')).length}`);
  console.log(`  - App connections: ${wsConnections.filter(w => w.url.includes('/ws')).length}`);
  
  console.log('\n[TEST] To test notifications:');
  console.log('1. Login with OAuth (Google or GitHub)');
  console.log('2. Create a note with review interval = "Daily" and next review date = "Today"');
  console.log('3. Check browser DevTools → Network → WS for ws://localhost:3000/ws connection');
  console.log('4. You should see a toast notification');
  
  await browser.close();
  console.log('[TEST] Done');
})();
