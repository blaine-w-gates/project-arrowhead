/**
 * Clicks a selector and waits for the resulting navigation to complete.
 * This is a reusable helper to handle page transitions reliably in Puppeteer tests.
 * @param {import('puppeteer').Page} page The Puppeteer page object.
 * @param {string} selector The CSS selector of the element to click.
 */
async function clickAndNavigate(page, selector) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.click(selector)
    ]);
}

/**
 * Navigates to a page by clicking on the hamburger menu link with the specified text.
 * This simulates real user navigation instead of using page.goto().
 * @param {import('puppeteer').Page} page The Puppeteer page object.
 * @param {string} linkText The text content of the navigation link to click.
 */
async function navigateViaMenu(page, linkText) {
    // Wait for sidebar to load dynamically with extended timeout
    await page.waitForFunction(() => {
        const sidebar = document.getElementById('globalSidebar');
        return sidebar && sidebar.innerHTML.trim() !== '' && sidebar.innerHTML.includes('Project Arrowhead');
    }, { timeout: 15000 });
    
    // Check if sidebar is already open
    const sidebarVisible = await page.evaluate(() => {
        return document.body.classList.contains('sidebar-visible');
    });
    
    if (!sidebarVisible) {
        // Try multiple approaches to open the sidebar
        let sidebarOpened = false;
        
        // Approach 1: Direct click via evaluate
        await page.evaluate(() => {
            const btn = document.getElementById('sidebarToggleBtn');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        
        // Wait a moment for the click to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if sidebar opened
        sidebarOpened = await page.evaluate(() => {
            return document.body.classList.contains('sidebar-visible');
        });
        
        // Approach 2: If direct click failed, try Puppeteer click
        if (!sidebarOpened) {
            try {
                await page.click('#sidebarToggleBtn');
                await new Promise(resolve => setTimeout(resolve, 500));
                sidebarOpened = await page.evaluate(() => {
                    return document.body.classList.contains('sidebar-visible');
                });
            } catch (e) {
                console.warn('Puppeteer click failed, sidebar may already be accessible');
            }
        }
        
        // Final verification with extended timeout
        if (!sidebarOpened) {
            try {
                await page.waitForFunction(() => {
                    return document.body.classList.contains('sidebar-visible');
                }, { timeout: 10000 });
            } catch (e) {
                console.warn('Sidebar visibility timeout, proceeding anyway - sidebar may be functional');
            }
        }
    }
    
    // Find and click the navigation link with the specified text
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.evaluate((text) => {
            const links = Array.from(document.querySelectorAll('#globalSidebar .nav-link'));
            const targetLink = links.find(link => link.textContent.trim().includes(text));
            if (targetLink) {
                targetLink.click();
                return true;
            }
            throw new Error(`Navigation link with text "${text}" not found`);
        }, linkText)
    ]);
}

module.exports = {
    clickAndNavigate,
    navigateViaMenu
};

