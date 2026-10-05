import { chromium } from '@playwright/test';

async function testArchiveFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    console.log('🚀 Opening app...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check current page content
    const content = await page.content();
    console.log('📄 Page loaded');
    console.log(`Page URL: ${page.url()}`);

    // Find all note containers - try different selectors
    console.log('\n🔍 Looking for notes on the page...');

    const noteContainers = await page.$$('[class*="note"], [data-testid*="note"]');
    console.log(`  Found ${noteContainers.length} potential note elements`);

    // Get page structure
    const mainContent = await page.$('main');
    if (mainContent) {
      const mainText = await mainContent.textContent();
      console.log(`Main content preview: ${mainText?.substring(0, 100)}...`);
    }

    // Look for any list items
    const listItems = await page.$$('li, [role="listitem"], article');
    console.log(`  Found ${listItems.length} list/article items`);

    // Look for buttons that might archive/restore
    const allButtons = await page.$$('button');
    console.log(`\n🔘 Found ${allButtons.length} buttons on page`);

    const buttonLabels = [];
    for (const btn of allButtons.slice(0, 20)) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const testId = await btn.getAttribute('data-testid');
      if (text || ariaLabel || title || testId) {
        buttonLabels.push({ text: text?.trim(), ariaLabel, title, testId });
      }
    }
    console.log('Button labels:', JSON.stringify(buttonLabels, null, 2));

    // Take a screenshot to see the UI
    console.log('\n📸 Taking screenshot of current page state...');
    await page.screenshot({ path: 'app-state.png', fullPage: true });
    console.log('Screenshot saved: app-state.png');

    // Look for input fields to create a note
    console.log('\n✍️ Looking for note creation form...');
    const inputs = await page.$$('input, textarea');
    console.log(`  Found ${inputs.length} input fields`);

    // Try to find and click a "new note" or "create" button
    for (const btn of allButtons) {
      const text = await btn.textContent();
      if (text && (text.includes('New') || text.includes('Create') || text.includes('Add'))) {
        console.log(`  Found button: "${text}"`);
        await btn.click();
        await page.waitForTimeout(1500);
        console.log('  Clicked create button');
        break;
      }
    }

    // Take another screenshot
    await page.screenshot({ path: 'app-after-click.png', fullPage: true });
    console.log('Screenshot saved: app-after-click.png');

    // Now try to find form fields and fill them
    const titleInput = await page.$('input[type="text"]');
    const contentInput = await page.$('textarea');

    if (titleInput) {
      console.log('\n✍️ Found title input, filling with test data...');
      await titleInput.fill('Test Archive Note');
      await page.waitForTimeout(300);
    }

    if (contentInput) {
      console.log('Found content textarea, filling with test data...');
      await contentInput.fill('This is a test note to check archive functionality');
      await page.waitForTimeout(300);
    }

    // Find and click save button
    for (const btn of allButtons) {
      const text = await btn.textContent();
      if (text && (text.includes('Save') || text.includes('Create'))) {
        console.log(`Found save button: "${text}", clicking...`);
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    await page.screenshot({ path: 'app-after-save.png', fullPage: true });
    console.log('Screenshot saved: app-after-save.png');

    // Now look for notes and archive button
    console.log('\n🔍 Looking for notes to archive...');
    const noteItems = await page.$$('[class*="note-item"], [class*="note-card"], article, [role="listitem"]');
    console.log(`  Found ${noteItems.length} note-like items`);

    if (noteItems.length > 0) {
      const firstNote = noteItems[0];
      const noteText = await firstNote.textContent();
      console.log(`  First note text: ${noteText?.substring(0, 50)}...`);

      // Look for archive button in the note
      const archiveBtn = await firstNote.$('button[aria-label*="archive"], button[title*="archive"], button[class*="archive"]');
      if (archiveBtn) {
        console.log('  ✓ Found archive button');
        const btnText = await archiveBtn.textContent();
        console.log(`    Button text: "${btnText}"`);

        // Take screenshot before
        await page.screenshot({ path: 'before-archive.png', fullPage: true });

        // Click archive
        console.log('  Clicking archive...');
        await archiveBtn.click();
        await page.waitForTimeout(1500);

        // Take screenshot after
        await page.screenshot({ path: 'after-archive.png', fullPage: true });
        console.log('  ✓ Archive clicked and screenshot taken');
      } else {
        console.log('  ❌ Archive button not found');
        // Log all buttons in the note
        const noteBtns = await firstNote.$$('button');
        console.log(`    Found ${noteBtns.length} buttons in note`);
        for (const nb of noteBtns) {
          const nbText = await nb.textContent();
          const nbLabel = await nb.getAttribute('aria-label');
          console.log(`      Button: "${nbText}" | aria-label: "${nbLabel}"`);
        }
      }
    }

    console.log('\n✅ Test complete!');
    console.log('Screenshots saved:');
    console.log('  - app-state.png (initial page)');
    console.log('  - app-after-click.png (after clicking create)');
    console.log('  - app-after-save.png (after saving note)');
    console.log('  - before-archive.png (before archiving)');
    console.log('  - after-archive.png (after archiving)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    console.log('Error screenshot saved: error-state.png');
  } finally {
    await browser.close();
  }
}

testArchiveFlow();
