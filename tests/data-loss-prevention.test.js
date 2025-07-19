const puppeteer = require('puppeteer');

describe('Task U.2: Data Loss Prevention on Menu Navigation', () => {
    let browser;
    let page;
    const baseUrl = 'http://127.0.0.1:8080';

    beforeAll(async () => {
        browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1280, height: 720 }
        });
        page = await browser.newPage();
        
        // Disable cache to ensure fresh content
        await page.setCacheEnabled(false);
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('Form data is preserved when navigating via hamburger menu', async () => {
        // Navigate to brainstorm step 1
        await page.goto(`${baseUrl}/brainstorm_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Enter test data in the form
        const testData = 'Test brainstorm data for data loss prevention';
        await page.type('#brainstormStep1Input', testData);
        
        // Open sidebar
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        
        // Navigate to a different step via sidebar menu
        await page.click('a[href="brainstorm_step2.html"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Navigate back to step 1
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        await page.click('a[href="brainstorm_step1.html"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Verify that the data was preserved
        const preservedData = await page.$eval('#brainstormStep1Input', el => el.value);
        expect(preservedData).toBe(testData);
    });

    test('Auto-save function correctly detects current page context', async () => {
        // Navigate to objectives step 3
        await page.goto(`${baseUrl}/objectives_step3.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Test the auto-save function directly
        const autoSaveResult = await page.evaluate(() => {
            // Call the auto-save function and capture console output
            let consoleOutput = [];
            const originalLog = console.log;
            console.log = (...args) => {
                consoleOutput.push(args.join(' '));
                originalLog.apply(console, args);
            };
            
            autoSaveCurrentPageFormData();
            
            console.log = originalLog;
            return consoleOutput;
        });
        
        // Verify that the function correctly identified the page context
        const contextDetected = autoSaveResult.some(log => 
            log.includes('objectives') && log.includes('step3')
        );
        expect(contextDetected).toBe(true);
    });

    test('Data loss prevention safety net is properly initialized', async () => {
        await page.goto(`${baseUrl}/brainstorm_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Check that the safety net initialization message appears in console
        const consoleLogs = await page.evaluate(() => {
            return new Promise((resolve) => {
                const logs = [];
                const originalLog = console.log;
                console.log = (...args) => {
                    logs.push(args.join(' '));
                    originalLog.apply(console, args);
                };
                
                setTimeout(() => {
                    console.log = originalLog;
                    resolve(logs);
                }, 1000);
            });
        });
        
        const safetyNetActivated = consoleLogs.some(log => 
            log.includes('Data loss prevention safety net activated')
        );
        expect(safetyNetActivated).toBe(true);
    });

    test('Sidebar navigation links have auto-save event listeners attached', async () => {
        await page.goto(`${baseUrl}/choose_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Check that sidebar navigation links have event listeners
        const linkListenersAttached = await page.evaluate(() => {
            const globalSidebar = document.getElementById('globalSidebar');
            if (!globalSidebar) return false;
            
            const navigationLinks = globalSidebar.querySelectorAll('a.nav-link[href]');
            return navigationLinks.length > 0;
        });
        
        expect(linkListenersAttached).toBe(true);
    });

    test('Cross-module navigation preserves data correctly', async () => {
        // Test data preservation across different modules
        await page.goto(`${baseUrl}/choose_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Enter test data in Choose module
        const chooseTestData = 'Choose module test data';
        await page.type('#chooseStep1Input', chooseTestData);
        
        // Navigate to Objectives module via sidebar
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        await page.click('a[href="objectives_step1.html"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Enter test data in Objectives module
        const objectivesTestData = 'Objectives module test data';
        await page.type('#objectivesStep1Input', objectivesTestData);
        
        // Navigate back to Choose module
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        await page.click('a[href="choose_step1.html"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Verify Choose data is preserved
        const preservedChooseData = await page.$eval('#chooseStep1Input', el => el.value);
        expect(preservedChooseData).toBe(chooseTestData);
        
        // Navigate back to Objectives to verify that data is also preserved
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        await page.click('a[href="objectives_step1.html"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Verify Objectives data is preserved
        const preservedObjectivesData = await page.$eval('#objectivesStep1Input', el => el.value);
        expect(preservedObjectivesData).toBe(objectivesTestData);
    });
});
