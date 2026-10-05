import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('[TEST] Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture WebSocket connections
  let wsConnected = false;
  let wsMessages = [];
  
  page.on('websocket', ws => {
    console.log(`[WS] WebSocket created: ${ws.url}`);
    wsConnected = true;
    
    ws.on('framesent', data => {
      console.log(`[WS] Message sent:`, data.payload);
      wsMessages.push({ direction: 'sent', data: data.payload });
    });
    
    ws.on('framereceived', data => {
      console.log(`[WS] Message received:`, data.payload);
      wsMessages.push({ direction: 'received', data: data.payload });
    });
  });
  
  // Log page errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  
  console.log('[TEST] Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  console.log('[TEST] Waiting for page to fully load...');
  await page.waitForTimeout(2000);
  
  // Check if NotificationProvider is loaded
  const hasNotifProvider = await page.evaluate(() => {
    return document.documentElement.innerHTML.includes('NotificationProvider');
  });
  console.log(`[TEST] NotificationProvider in HTML: ${hasNotifProvider}`);
  
  // Check if useWebSocket hook is running
  const wsHookStatus = await page.evaluate(() => {
    // Check for WebSocket in any global scope or window
    return {
      hasWebSocket: typeof WebSocket !== 'undefined',
      hasNavigator: typeof navigator !== 'undefined',
      onLine: navigator?.onLine
    };
  });
  console.log(`[TEST] WebSocket API available:`, wsHookStatus);
  
  // Wait more for WebSocket to connect
  console.log('[TEST] Waiting for WebSocket connection...');
  await page.waitForTimeout(3000);
  
  console.log(`[TEST] WebSocket connected: ${wsConnected}`);
  console.log(`[TEST] WebSocket messages: ${wsMessages.length}`);
  
  if (wsMessages.length > 0) {
    console.log('[TEST] First message:', wsMessages[0]);
  }
  
  // Take screenshot
  const screenshotPath = path.join(__dirname, 'ws-test-final.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[TEST] Screenshot saved to ${screenshotPath}`);
  
  await browser.close();
  console.log('[TEST] Done - WebSocket status:', wsConnected ? 'CONNECTED' : 'NOT CONNECTED');
})();
