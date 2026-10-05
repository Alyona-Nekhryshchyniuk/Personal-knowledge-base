import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  // Get server logs before test
  console.log('[TEST] Checking server logs for WebSocket errors...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  let appWsError = null;
  let appWsConnected = false;
  
  page.on('websocket', ws => {
    if (ws.url().includes('/ws')) {
      console.log(`[WS] Connection to /ws initiated`);
      appWsConnected = true;
      
      ws.on('framesent', data => {
        console.log(`[WS] Sent:`, data.payload.substring(0, 100));
      });
      
      ws.on('framereceived', data => {
        console.log(`[WS] Received:`, data.payload.substring(0, 100));
      });

      ws.on('error', () => {
        console.log(`[WS] WebSocket error event`);
        appWsError = true;
      });

      ws.on('close', () => {
        console.log(`[WS] WebSocket closed`);
      });
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('WebSocket')) {
      console.log(`[PAGE] WebSocket error:`, msg.text());
      appWsError = msg.text();
    }
  });
  
  // Navigate
  await page.goto('http://localhost:3000/signin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Try to get session
  console.log('[TEST] Getting session info...');
  const sessionResponse = await page.request.get('http://localhost:3000/api/auth/session');
  const session = await sessionResponse.json();
  
  if (session && session.user && session.user.id) {
    console.log('[TEST] ✓ Session found, user:', session.user.email);
    console.log('[TEST] User ID:', session.user.id);
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    console.log('\n[TEST] WebSocket Status:');
    console.log('  - Connected:', appWsConnected);
    console.log('  - Error:', appWsError || 'None');
  } else {
    console.log('[TEST] ✗ No session found - need to login first');
    console.log('[TEST] Session data:', session);
  }
  
  // Take screenshot
  const screenshot = path.join(__dirname, 'ws-test-with-logs.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  
  await browser.close();
  console.log('\n[TEST] Screenshot:', screenshot);
})();
