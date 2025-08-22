/**
 * Sentry Test: Global Navigation Sidebar
 * 
 * This test verifies that the Global Navigation Sidebar functionality
 * matches the original JavaScript application specification.
 * 
 * Expected to FAIL until the React implementation includes:
 * - Hamburger menu toggle button (#sidebarToggleBtn)
 * - Sidebar visibility toggle via 'sidebar-visible' class on body
 * - Navigation links including "Home" link
 */

const puppeteer = require('puppeteer');

describe('Global Navigation Sidebar', () => {
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

    beforeEach(async () => {
        // Navigate to the main journey page of the React application
        await page.goto('http://localhost:5173/journey', { 
            waitUntil: 'networkidle0',
            timeout: 10000 
        });
        
        // Wait for React to fully render
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should open the sidebar when the toggle button is clicked', async () => {
        // Step 1: Assert that the hamburger menu toggle button exists
        const toggleButton = await page.$('#sidebarToggleBtn');
        expect(toggleButton).not.toBeNull();
        expect(toggleButton).toBeDefined();
        
        // Step 2: Verify initial state - sidebar should not be visible
        const initialBodyClass = await page.evaluate(() => document.body.className);
        expect(initialBodyClass).not.toContain('sidebar-visible');
        
        // Step 3: Visual debugging before clicking the button
        console.log('🔍 DEBUG: Taking screenshot before button click...');
        await page.screenshot({ path: 'debug_sidebar_click.png', fullPage: true });
        
        // Get button element and its bounding box
        const buttonElement = await page.$('#sidebarToggleBtn');
        if (buttonElement) {
            const boundingBox = await buttonElement.boundingBox();
            console.log('🔍 DEBUG: Button bounding box:', boundingBox);
            
            if (boundingBox) {
                console.log(`🔍 DEBUG: Button position - x: ${boundingBox.x}, y: ${boundingBox.y}`);
                console.log(`🔍 DEBUG: Button size - width: ${boundingBox.width}, height: ${boundingBox.height}`);
                
                // Check if button is within viewport
                const viewport = page.viewport();
                console.log(`🔍 DEBUG: Viewport size - width: ${viewport.width}, height: ${viewport.height}`);
                
                const isInViewport = boundingBox.x >= 0 && boundingBox.y >= 0 && 
                                   boundingBox.x < viewport.width && boundingBox.y < viewport.height;
                console.log(`🔍 DEBUG: Button is in viewport: ${isInViewport}`);
            } else {
                console.log('🔍 DEBUG: Button bounding box is null - element may not be visible!');
            }
        } else {
            console.log('🔍 DEBUG: Button element not found!');
        }
        
        // Step 4: Click the hamburger menu toggle button
        console.log('🔍 DEBUG: Attempting to click button...');
        await page.click('#sidebarToggleBtn');
        
        // Wait for animation/state change
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 4: Assert that the body element now has the 'sidebar-visible' class
        const bodyClassAfterClick = await page.evaluate(() => document.body.className);
        expect(bodyClassAfterClick).toContain('sidebar-visible');
        
        // Step 5: Assert that the visible sidebar panel contains a "Home" link
        // Wait for sidebar to be visible and content to load
        await page.waitForSelector('#globalSidebar', { visible: true, timeout: 5000 });
        
        // Check for Home link within the sidebar
        const homeLink = await page.$('#globalSidebar a[href*="index"], #globalSidebar a:contains("Home")');
        expect(homeLink).not.toBeNull();
        
        // Verify the Home link text content
        const homeLinkText = await page.evaluate(() => {
            const sidebar = document.getElementById('globalSidebar');
            if (!sidebar) return null;
            
            const links = sidebar.querySelectorAll('a');
            for (let link of links) {
                if (link.textContent.trim().includes('Home')) {
                    return link.textContent.trim();
                }
            }
            return null;
        });
        
        expect(homeLinkText).toContain('Home');
    });
});
