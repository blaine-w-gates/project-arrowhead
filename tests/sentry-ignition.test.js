const puppeteer = require('puppeteer');

// Sentry Protocol Test: Operation Ignition
// This test MUST FAIL to prove the integration bug exists
// Bug: Marketing homepage CTA buttons do not correctly route to React application

describe('Sentry Protocol: Operation Ignition', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
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

    describe('Homepage CTA Integration Bug', () => {
        test('VERIFICATION: Main "Use the Free Tool Now" button should now route to /journey correctly', async () => {
            console.log('✅ VERIFICATION TEST: Confirming homepage CTA integration fix...');
            
            // Step 1: Navigate to homepage
            const reactUrl = 'http://localhost:5000';
            await page.goto(reactUrl, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded homepage');
            
            // Step 2: Find and click the main "Use the Free Tool Now" button
            const mainCtaSelector = 'a[href="/journey"]'; // Now should be correct href
            await page.waitForSelector(mainCtaSelector, { visible: true });
            console.log('✅ Found main CTA button with href="/journey"');
            
            // Step 3: Click the button and wait for navigation
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click(mainCtaSelector)
            ]);
            
            // Step 4: Get current URL after click
            const currentUrl = page.url();
            console.log(`Current URL after clicking CTA: ${currentUrl}`);
            
            // Step 5: ASSERT THAT WE ARE NOW AT THE CORRECT JOURNEY ROUTE
            const expectedJourneyUrl = `${reactUrl}/journey`;
            const isAtCorrectRoute = currentUrl === expectedJourneyUrl;
            
            console.log(`Expected URL: ${expectedJourneyUrl}`);
            console.log(`Actual URL: ${currentUrl}`);
            console.log(`Is at correct route: ${isAtCorrectRoute}`);
            
            // THIS ASSERTION SHOULD NOW PASS - proving the fix works
            expect(isAtCorrectRoute).toBe(true);
            
            console.log('✅ VERIFICATION TEST PASSED: CTA button now correctly routes to /journey');
        }, 60000);

        test('VERIFICATION: Secondary "Get Started for Free" button should now route to /journey correctly', async () => {
            console.log('✅ VERIFICATION TEST: Confirming secondary CTA integration fix...');
            
            // Step 1: Navigate to homepage
            const reactUrl = 'http://localhost:5000';
            await page.goto(reactUrl, { waitUntil: 'networkidle0' });
            console.log('✅ Successfully loaded homepage');
            
            // Step 2: Scroll to final CTA section
            await page.evaluate(() => {
                const finalCta = document.querySelector('section:last-of-type');
                if (finalCta) finalCta.scrollIntoView();
            });
            
            // Step 3: Find and click the secondary "Get Started for Free" button
            const secondaryCtaSelector = 'section:last-of-type a[href="/journey"]';
            await page.waitForSelector(secondaryCtaSelector, { visible: true });
            console.log('✅ Found secondary CTA button with href="/journey"');
            
            // Step 4: Click the button and wait for navigation
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click(secondaryCtaSelector)
            ]);
            
            // Step 5: Get current URL after click
            const currentUrl = page.url();
            console.log(`Current URL after clicking secondary CTA: ${currentUrl}`);
            
            // Step 6: ASSERT THAT WE ARE NOW AT THE CORRECT JOURNEY ROUTE
            const expectedJourneyUrl = `${reactUrl}/journey`;
            const isAtCorrectRoute = currentUrl === expectedJourneyUrl;
            
            console.log(`Expected URL: ${expectedJourneyUrl}`);
            console.log(`Actual URL: ${currentUrl}`);
            console.log(`Is at correct route: ${isAtCorrectRoute}`);
            
            // THIS ASSERTION SHOULD NOW PASS - proving the fix works
            expect(isAtCorrectRoute).toBe(true);
            
            console.log('✅ VERIFICATION TEST PASSED: Secondary CTA button now correctly routes to /journey');
        }, 60000);
    });
});
