import { chromium } from '@playwright/test';

async function testArchiveFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🚀 Opening app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✓ App loaded');

    // Check if already logged in
    const loginButton = await page.$('[data-testid="signin-button"]');
    if (loginButton) {
      console.log('⚠ Not logged in, need to authenticate manually');
      console.log('Press Enter after logging in manually...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s for manual login
    } else {
      console.log('✓ Already logged in');
    }

    // Go to dashboard
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Wait for notes to load
    await page.waitForTimeout(2000);
    console.log('✓ Dashboard loaded');

    // Get all note items
    let noteItems = await page.$$('[data-testid^="note-item-"]');
    console.log(`\n📝 Found ${noteItems.length} notes`);

    if (noteItems.length === 0) {
      console.log('⚠ No notes found, creating one for testing...');

      // Click create note button
      const createBtn = await page.$('[data-testid="create-note-btn"]');
      if (!createBtn) {
        // Try finding by text
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text?.includes('New Note') || text?.includes('Create')) {
            await btn.click();
            break;
          }
        }
      } else {
        await createBtn.click();
      }

      await page.waitForTimeout(1000);

      // Fill in note form
      const titleInput = await page.$('input[placeholder*="Title"], input[placeholder*="title"]');
      const contentInput = await page.$('textarea[placeholder*="Content"], textarea[placeholder*="content"]');

      if (titleInput) await titleInput.fill('Test Note for Archive');
      if (contentInput) await contentInput.fill('This is a test note to verify archive functionality');

      // Submit form
      const submitBtn = await page.$('button:has-text("Save"), button:has-text("Create")');
      if (submitBtn) await submitBtn.click();

      await page.waitForTimeout(2000);

      // Reload to see the new note
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      noteItems = await page.$$('[data-testid^="note-item-"]');
      console.log(`✓ Now found ${noteItems.length} notes`);

      if (noteItems.length === 0) {
        console.log('❌ Still no notes found, cannot test archive flow');
        return;
      }
    }

    // Test first note
    const firstNote = noteItems[0];
    const noteContent = await firstNote.textContent();
    console.log(`\nTesting with note: ${noteContent.substring(0, 50)}...`);

    // Take screenshot before archiving
    console.log('\n📸 Taking screenshot before archiving...');
    await page.screenshot({ path: 'before-archive.png' });

    // Find archive button in the first note
    const archiveButton = await firstNote.$('[data-testid="archive-btn"]');
    if (!archiveButton) {
      console.log('❌ Archive button not found');
      return;
    }

    console.log('📌 Found archive button');

    // Check icon color before archiving
    const archiveIconBefore = await archiveButton.evaluate(btn => {
      const icon = btn.querySelector('[class*="icon"]');
      return window.getComputedStyle(icon || btn).color;
    });
    console.log(`Icon color before: ${archiveIconBefore}`);

    // Click archive
    console.log('⏳ Clicking archive...');
    await archiveButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot after archiving
    console.log('📸 Taking screenshot after archiving...');
    await page.screenshot({ path: 'after-archive.png' });

    // Check if note has archived class/style
    const noteAfterArchive = await firstNote.evaluate(note => ({
      className: note.className,
      archivedClass: note.classList.contains('archived') || note.classList.contains('opacity-50'),
      textContent: note.textContent.substring(0, 50)
    }));
    console.log(`✓ Note classes after archive: ${noteAfterArchive.className}`);
    console.log(`  Has archived styling: ${noteAfterArchive.archivedClass}`);

    // Check if icon color changed
    const archiveIconAfter = await archiveButton.evaluate(btn => {
      const icon = btn.querySelector('[class*="icon"]');
      return window.getComputedStyle(icon || btn).color;
    });
    console.log(`Icon color after: ${archiveIconAfter}`);
    console.log(`Color changed: ${archiveIconBefore !== archiveIconAfter}`);

    // Test filter by archive status
    console.log('\n🔍 Testing filters...');
    const filterButton = await page.$('[data-testid="filter-menu"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(500);

      const activeFilter = await page.$('[data-testid="filter-active"]');
      const archivedFilter = await page.$('[data-testid="filter-archived"]');

      if (activeFilter) {
        console.log('✓ "Active" filter option found');
        await activeFilter.click();
        await page.waitForTimeout(1000);
        const visibleNotes = await page.$$('[data-testid^="note-item-"]');
        console.log(`  Notes shown when filtering by "Active": ${visibleNotes.length}`);
      }

      if (filterButton && archivedFilter) {
        await filterButton.click();
        await page.waitForTimeout(500);
        await archivedFilter.click();
        await page.waitForTimeout(1000);
        const visibleNotes = await page.$$('[data-testid^="note-item-"]');
        console.log(`  Notes shown when filtering by "Archived": ${visibleNotes.length}`);
      }
    } else {
      console.log('⚠ Filter menu not found');
    }

    // Test unarchive
    console.log('\n↩️  Testing unarchive...');

    // Go back to show archived notes
    const filterMenu = await page.$('[data-testid="filter-menu"]');
    if (filterMenu) {
      await filterMenu.click();
      await page.waitForTimeout(500);
      const allFilter = await page.$('[data-testid="filter-all"]');
      if (allFilter) {
        await allFilter.click();
        await page.waitForTimeout(1000);
      }
    }

    // Find the archived note and unarchive
    const notesAfter = await page.$$('[data-testid^="note-item-"]');
    const unarchiveButton = await notesAfter[0]?.$('[data-testid="restore-btn"]');

    if (unarchiveButton) {
      console.log('✓ Found restore/unarchive button');
      const restoreText = await unarchiveButton.textContent();
      console.log(`  Button text: ${restoreText}`);

      await unarchiveButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked restore button');

      // Take screenshot after unarchiving
      await page.screenshot({ path: 'after-restore.png' });

      // Check if note is restored
      const restoredNote = await notesAfter[0].evaluate(note => ({
        className: note.className,
        archivedClass: note.classList.contains('archived'),
        textContent: note.textContent.substring(0, 50)
      }));
      console.log(`✓ Note classes after restore: ${restoredNote.className}`);
      console.log(`  Still has archived styling: ${restoredNote.archivedClass}`);
    } else {
      console.log('⚠ Restore button not found');
    }

    console.log('\n✅ Archive flow test completed!');
    console.log('📸 Screenshots saved:');
    console.log('  - before-archive.png');
    console.log('  - after-archive.png');
    console.log('  - after-restore.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testArchiveFlow();
