const puppeteer = require('puppeteer');

// Sentry Protocol Test: Operation Restore Parity
// These tests MUST FAIL to prove all the navigation bugs exist
// Bug: Multiple entry points are broken and don't route to the correct application

describe('Sentry Protocol: Operation Restore Parity', () => {
    jest.setTimeout(60000);
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        page.setDefaultTimeout(30000);
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('Task RP.1: Navigation Entry Point Failures', () => {
        test('SENTRY: Header "Use Free Tool" button should route to /journey but currently routes to broken /free-tool', async () => {
            console.log('🚨 SENTRY TEST: Proving header navigation failure...');
            
            const reactUrl = 'http://localhost:5000';
            await page.goto(reactUrl, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded homepage');
            
            // Find and click the header "Use Free Tool" button
            const headerCtaSelector = 'nav a[href="/free-tool"]';
            await page.waitForSelector(headerCtaSelector, { visible: true });
            console.log('✅ Found header "Use Free Tool" button with href="/free-tool"');
            
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click(headerCtaSelector)
            ]);
            
            const currentUrl = page.url();
            console.log(`Current URL after clicking header CTA: ${currentUrl}`);
            
            // ASSERT THAT WE ARE AT THE CORRECT JOURNEY ROUTE
            const expectedJourneyUrl = `${reactUrl}/free-tool`;
            const isAtCorrectRoute = currentUrl === expectedJourneyUrl;
            
            console.log(`Expected URL: ${expectedJourneyUrl}`);
            console.log(`Actual URL: ${currentUrl}`);
            console.log(`Is at correct route: ${isAtCorrectRoute}`);
            
            // THIS ASSERTION SHOULD FAIL - proving the navigation bug
            expect(isAtCorrectRoute).toBe(true);
            
            console.log('❌ SENTRY TEST FAILED AS EXPECTED: Header button routes to wrong page');
        }, 60000);
    });

    describe('Task RP.2: Journey Dashboard UX Failures', () => {
        test('SENTRY: Journey Dashboard should look like old index.html but currently shows broken invented UX', async () => {
            console.log('🚨 SENTRY TEST: Proving Journey Dashboard UX failure...');
            
            const reactUrl = 'http://localhost:5000';
            await page.goto(`${reactUrl}/journey`, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded journey dashboard');
            
            // Check if the page shows the WRONG invented UX elements
            const hasInventedModuleStates = await page.evaluate(() => {
                const pageText = document.body.textContent || '';
                return pageText.includes('Module Started') || 
                       pageText.includes('In Progress') || 
                       pageText.includes('Completed');
            });
            
            console.log(`Has invented module states (should be false): ${hasInventedModuleStates}`);
            
            // Check if the page is missing the CORRECT simple UX
            const hasCorrectSimpleUX = await page.evaluate(() => {
                const pageText = document.body.textContent || '';
                // Should have simple "Start Brainstorming" and "Start Objectives" buttons like old index.html
                return pageText.includes('Start Brainstorming') && 
                       pageText.includes('Start Objectives') &&
                       !pageText.includes('Module Started'); // Should NOT have invented states
            });
            
            console.log(`Has correct simple UX (should be true): ${hasCorrectSimpleUX}`);
            
            // ASSERT THAT WE HAVE THE CORRECT SIMPLE UX (not the invented complex one)
            expect(hasCorrectSimpleUX).toBe(true);
            expect(hasInventedModuleStates).toBe(false);
            
            console.log('❌ SENTRY TEST FAILED AS EXPECTED: Journey Dashboard shows wrong UX');
        }, 60000);
    });

    describe('Task RP.3: Module Entry API Failures', () => {
        test('SENTRY: Brainstorm module start should work but currently shows "Error loading journey"', async () => {
            console.log('🚨 SENTRY TEST: Proving Brainstorm module entry failure...');
            
            const reactUrl = 'http://localhost:5000';
            await page.goto(`${reactUrl}/journey`, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded journey dashboard');
            
            // Try to find and click the Brainstorm start button
            try {
                const brainstormStartSelector = 'button:has-text("Start Module"), [data-testid="brainstorm-start"], .brainstorm button';
                await page.waitForSelector(brainstormStartSelector, { visible: true, timeout: 10000 });
                await page.click(brainstormStartSelector);
                
                // Wait for navigation to brainstorm step 1
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
                
                // Check if we get the error message
                const hasErrorMessage = await page.evaluate(() => {
                    const pageText = document.body.textContent || '';
                    return pageText.includes('Error loading journey') || 
                           pageText.includes('failed to create journey session') ||
                           pageText.includes('bad request');
                });
                
                console.log(`Has error message (should be false): ${hasErrorMessage}`);
                
                // ASSERT THAT WE DO NOT HAVE ERROR MESSAGES
                expect(hasErrorMessage).toBe(false);
                
                console.log('❌ SENTRY TEST FAILED AS EXPECTED: Brainstorm module shows errors');
                
            } catch (error) {
                console.log('❌ SENTRY TEST FAILED AS EXPECTED: Could not even find Brainstorm start button');
                throw error;
            }
        }, 60000);
    });

    describe('Task RP.4: Task List Page Missing', () => {
        test('SENTRY: "View All Tasks" should work but currently shows 404 page not found', async () => {
            console.log('🚨 SENTRY TEST: Proving Task List page missing...');
            
            const reactUrl = 'http://localhost:5000';
            await page.goto(`${reactUrl}/journey`, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded journey dashboard');
            
            // Try to find and click "View All Tasks" link
            try {
                const viewTasksSelector = 'a[href="/tasks"]';
                await page.waitForSelector(viewTasksSelector, { visible: true, timeout: 10000 });
                
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    page.evaluate((sel) => document.querySelector(sel).click(), viewTasksSelector)
                ]);
                
                // Check if we get 404 error
                const has404Error = await page.evaluate(() => {
                    const pageText = document.body.textContent || '';
                    return pageText.includes('404') || 
                           pageText.includes('Page not found') ||
                           pageText.includes('Not Found');
                });
                
                console.log(`Has 404 error (should be false): ${has404Error}`);
                
                // ASSERT THAT WE DO NOT HAVE 404 ERRORS
                expect(has404Error).toBe(false);
                
                console.log('❌ SENTRY TEST FAILED AS EXPECTED: Task List shows 404 error');
                
            } catch (error) {
                console.log('❌ SENTRY TEST FAILED AS EXPECTED: Could not find View All Tasks link');
                throw error;
            }
        }, 60000);
    });
});
