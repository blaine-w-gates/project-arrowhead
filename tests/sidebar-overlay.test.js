const puppeteer = require('puppeteer');

describe('Task U.1: Sidebar Overlay Functionality', () => {
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

    const journeyStepPages = [
        'brainstorm_step1.html',
        'brainstorm_step2.html',
        'brainstorm_step3.html',
        'brainstorm_step4.html',
        'brainstorm_step5.html',
        'choose_step1.html',
        'choose_step2.html',
        'choose_step3.html',
        'choose_step4.html',
        'choose_step5.html',
        'objectives_step1.html',
        'objectives_step2.html',
        'objectives_step3.html',
        'objectives_step4.html',
        'objectives_step5.html',
        'objectives_step6.html',
        'objectives_step7.html'
    ];

    test('Sidebar overlay element exists on all 17 journey step pages', async () => {
        for (const pageName of journeyStepPages) {
            console.log(`Testing sidebar overlay on ${pageName}...`);
            
            await page.goto(`${baseUrl}/${pageName}`, { waitUntil: 'networkidle0' });
            
            // Wait for loading screen to disappear
            await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
            
            // Check that sidebar overlay element exists
            const sidebarOverlay = await page.$('#sidebarOverlay');
            expect(sidebarOverlay).toBeTruthy();
            
            // Verify overlay has correct CSS properties
            const overlayStyles = await page.evaluate(() => {
                const overlay = document.getElementById('sidebarOverlay');
                const computedStyles = window.getComputedStyle(overlay);
                return {
                    position: computedStyles.position,
                    zIndex: computedStyles.zIndex,
                    opacity: computedStyles.opacity,
                    visibility: computedStyles.visibility
                };
            });
            
            expect(overlayStyles.position).toBe('fixed');
            expect(overlayStyles.zIndex).toBe('1030');
            expect(overlayStyles.opacity).toBe('0'); // Hidden by default
            expect(overlayStyles.visibility).toBe('hidden'); // Hidden by default
        }
    });

    test('Sidebar toggle functionality works with overlay', async () => {
        // Test on brainstorm_step1.html as representative page
        await page.goto(`${baseUrl}/brainstorm_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Click hamburger menu to open sidebar
        await page.click('#sidebarToggleBtn');
        
        // Wait for sidebar animation
        await page.waitForTimeout(500);
        
        // Check that body has sidebar-visible class
        const bodyHasSidebarVisible = await page.evaluate(() => {
            return document.body.classList.contains('sidebar-visible');
        });
        expect(bodyHasSidebarVisible).toBe(true);
        
        // Check that overlay is now visible
        const overlayVisible = await page.evaluate(() => {
            const overlay = document.getElementById('sidebarOverlay');
            const computedStyles = window.getComputedStyle(overlay);
            return {
                opacity: computedStyles.opacity,
                visibility: computedStyles.visibility
            };
        });
        
        expect(overlayVisible.opacity).toBe('1');
        expect(overlayVisible.visibility).toBe('visible');
        
        // Check that sidebar is transformed to visible position
        const sidebarTransform = await page.evaluate(() => {
            const sidebar = document.getElementById('globalSidebar');
            const computedStyles = window.getComputedStyle(sidebar);
            return computedStyles.transform;
        });
        
        expect(sidebarTransform).toBe('matrix(1, 0, 0, 1, 0, 0)'); // translateX(0)
    });

    test('Click-off-to-close functionality works', async () => {
        // Test on brainstorm_step1.html as representative page
        await page.goto(`${baseUrl}/brainstorm_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Open sidebar first
        await page.click('#sidebarToggleBtn');
        await page.waitForTimeout(500);
        
        // Verify sidebar is open
        let bodyHasSidebarVisible = await page.evaluate(() => {
            return document.body.classList.contains('sidebar-visible');
        });
        expect(bodyHasSidebarVisible).toBe(true);
        
        // Click on the overlay to close sidebar
        await page.click('#sidebarOverlay');
        await page.waitForTimeout(500);
        
        // Verify sidebar is closed
        bodyHasSidebarVisible = await page.evaluate(() => {
            return document.body.classList.contains('sidebar-visible');
        });
        expect(bodyHasSidebarVisible).toBe(false);
        
        // Verify overlay is hidden again
        const overlayHidden = await page.evaluate(() => {
            const overlay = document.getElementById('sidebarOverlay');
            const computedStyles = window.getComputedStyle(overlay);
            return {
                opacity: computedStyles.opacity,
                visibility: computedStyles.visibility
            };
        });
        
        expect(overlayHidden.opacity).toBe('0');
        expect(overlayHidden.visibility).toBe('hidden');
    });

    test('Sidebar has correct z-index hierarchy', async () => {
        // Test on brainstorm_step1.html as representative page
        await page.goto(`${baseUrl}/brainstorm_step1.html`, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#loadingScreen', { hidden: true, timeout: 10000 });
        
        // Check z-index values
        const zIndexValues = await page.evaluate(() => {
            const sidebar = document.getElementById('globalSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const sidebarStyles = window.getComputedStyle(sidebar);
            const overlayStyles = window.getComputedStyle(overlay);
            
            return {
                sidebar: sidebarStyles.zIndex,
                overlay: overlayStyles.zIndex
            };
        });
        
        expect(zIndexValues.sidebar).toBe('1040'); // Sidebar should be above overlay
        expect(zIndexValues.overlay).toBe('1030'); // Overlay should be below sidebar
        expect(parseInt(zIndexValues.sidebar)).toBeGreaterThan(parseInt(zIndexValues.overlay));
    });
});
