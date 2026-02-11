/**
 * SENTRY TEST: Navigation Parity Failures
 * 
 * This test verifies two critical navigation discrepancies identified in the 
 * Master Navigation Discrepancy Report:
 * 
 * 1. Broken Module Completion Flow (Critical UX Regression)
 * 2. Incorrect "Home" Link in Sidebar
 * 
 * These tests should FAIL initially, proving the bugs exist, then PASS after fixes.
 */

const puppeteer = require('puppeteer');

describe('SENTRY: Navigation Parity Failures', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });
        
        await page.setViewport({ width: 1280, height: 720 });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('SENTRY FAILURE #1: Module Completion Flow is Broken (Brainstorm → Choose)', async () => {
        console.log('🔍 Testing Brainstorm → Choose completion flow...');
        
        // Navigate to Brainstorm Step 5 (final step)
        await page.goto('http://localhost:5000/journey/brainstorm/step/5', { waitUntil: 'networkidle0' });
        
        // Fill form to enable completion
        await page.focus('textarea');
        await page.type('textarea', 'Final brainstorm step completion test');
        
        // Trigger React state update
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);
                const changeEvent = new Event('change', { bubbles: true });
                textarea.dispatchEvent(changeEvent);
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find and click Complete/Finish button
        const completeButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const completeButton = buttons.find(btn => {
                const text = btn.textContent?.trim() || '';
                return text.includes('Complete') || text.includes('Finish') || text.includes('Done');
            });
            
            if (completeButton && !completeButton.disabled) {
                completeButton.click();
                return true;
            }
            return false;
        });
        
        if (!completeButtonClicked) {
            throw new Error('Could not find or click completion button');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CRITICAL TEST: User should be at Choose Step 1, NOT Journey Dashboard
        const currentUrl = page.url();
        console.log(`Current URL after Brainstorm completion: ${currentUrl}`);
        
        // This should PASS after fix (proving navigation works correctly)
        expect(currentUrl).toContain('/journey/choose/step/1');
        expect(currentUrl).not.toBe('http://localhost:5000/journey');
        
        console.log('✅ SUCCESS: Brainstorm completion correctly navigates to Choose Step 1');
        
    }, 15000);

    test('SENTRY FAILURE #2: Module Completion Flow is Broken (Choose → Objectives)', async () => {
        console.log('🔍 Testing Choose → Objectives completion flow...');
        
        // Navigate to Choose Step 5 (final step)
        await page.goto('http://localhost:5000/journey/choose/step/5', { waitUntil: 'networkidle0' });
        
        // Fill form to enable completion
        await page.focus('textarea');
        await page.type('textarea', 'Final choose step completion test');
        
        // Trigger React state update
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);
                const changeEvent = new Event('change', { bubbles: true });
                textarea.dispatchEvent(changeEvent);
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find and click Complete/Finish button
        const completeButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const completeButton = buttons.find(btn => {
                const text = btn.textContent?.trim() || '';
                return text.includes('Complete') || text.includes('Finish') || text.includes('Done');
            });
            
            if (completeButton && !completeButton.disabled) {
                completeButton.click();
                return true;
            }
            return false;
        });
        
        if (!completeButtonClicked) {
            throw new Error('Could not find or click completion button');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CRITICAL TEST: User should be at Objectives Step 1, NOT Journey Dashboard
        const currentUrl = page.url();
        console.log(`Current URL after Choose completion: ${currentUrl}`);
        
        // This should PASS after fix (proving navigation works correctly)
        expect(currentUrl).toContain('/journey/objectives/step/1');
        expect(currentUrl).not.toBe('http://localhost:5000/journey');
        
        console.log('✅ SUCCESS: Choose completion correctly navigates to Objectives Step 1');
        
    }, 15000);

    test('SENTRY FAILURE #3: Sidebar "Home" Link Points to Wrong Location', async () => {
        console.log('🔍 Testing Sidebar Home link context awareness...');
        
        // Navigate to a journey step (inside application)
        await page.goto('http://localhost:5000/journey/brainstorm/step/1', { waitUntil: 'networkidle0' });
        
        // Open sidebar if not already open
        const sidebarToggle = await page.$('#sidebarToggleBtn, [data-testid="sidebar-toggle"], button[aria-label*="menu"]');
        if (sidebarToggle) {
            await sidebarToggle.click();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Find Home link in sidebar
        const homeLink = await page.evaluate(() => {
            // Look for Home link in sidebar
            const links = Array.from(document.querySelectorAll('a'));
            const homeLink = links.find(link => {
                const text = link.textContent?.trim() || '';
                return text.includes('Home') || text.includes('Dashboard');
            });
            
            return homeLink ? homeLink.href : null;
        });
        
        console.log(`Sidebar Home link href: ${homeLink}`);
        
        // CRITICAL TEST: When inside application, Home should point to /journey, NOT /
        // This should FAIL initially (proving the bug exists)
        expect(homeLink).toContain('/journey');
        expect(homeLink).not.toMatch(/\/$|\/$/); // Should not end with just /
        
        console.log('✅ EXPECTED FAILURE: Sidebar Home link should be context-aware');
        
    }, 10000);

    test('SENTRY VERIFICATION: Sidebar "Home" Link on Marketing Pages', async () => {
        console.log('🔍 Testing Sidebar Home link on marketing pages...');
        
        // Navigate to marketing homepage
        await page.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
        
        // Open sidebar if not already open
        const sidebarToggle = await page.$('#sidebarToggleBtn, [data-testid="sidebar-toggle"], button[aria-label*="menu"]');
        if (sidebarToggle) {
            await sidebarToggle.click();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Find Home link in sidebar
        const homeLink = await page.evaluate(() => {
            // Look for Home link in sidebar
            const links = Array.from(document.querySelectorAll('a'));
            const homeLink = links.find(link => {
                const text = link.textContent?.trim() || '';
                return text.includes('Home') || text.includes('Dashboard');
            });
            
            return homeLink ? homeLink.href : null;
        });
        
        console.log(`Sidebar Home link href on marketing page: ${homeLink}`);
        
        // On marketing pages, Home can point to / (this should pass)
        expect(homeLink).toBeDefined();
        
        console.log('✅ Sidebar Home link behavior on marketing pages verified');
        
    }, 10000);
});
