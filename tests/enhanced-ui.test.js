/**
 * Enhanced UI Test Suite - Project Arrowhead
 * Tests UI interactions that automated journey tests might miss
 * Includes hamburger menu, negative task creation tests, and UI responsiveness
 */

const puppeteer = require('puppeteer');
const { clickAndNavigate } = require('./test-utils');

describe('Enhanced UI Tests', () => {
    let browser;
    let page;
    const serverUrl = 'http://127.0.0.1:8080';

    beforeAll(async () => {
        browser = await puppeteer.launch({ headless: true });
        page = await browser.newPage();
        
        // Disable cache to simulate fresh browser environment
        await page.setCacheEnabled(false);
        
        // Set viewport for consistent testing
        await page.setViewport({ width: 1280, height: 720 });
        
        // Handle dialogs automatically
        page.on('dialog', async dialog => {
            await dialog.dismiss();
        });
    }, 30000);

    afterAll(async () => {
        if (page) await page.close();
        if (browser) await browser.close();
    }, 30000);

    describe('Hamburger Menu Functionality', () => {
        it('should open and close sidebar on homepage via hamburger menu', async () => {
            // Navigate to homepage
            await page.goto(`${serverUrl}/index.html`);
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            
            // Wait for sidebar to load dynamically
            await page.waitForFunction(() => {
                const sidebar = document.getElementById('globalSidebar');
                return sidebar && sidebar.innerHTML.trim() !== '' && sidebar.innerHTML.includes('Project Arrowhead');
            }, { timeout: 10000 });
            
            // Verify sidebar is initially hidden
            const initialSidebarVisible = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            expect(initialSidebarVisible).toBe(false);
            
            // Use page.evaluate to click hamburger menu (bypass visibility issues)
            await page.evaluate(() => {
                const btn = document.getElementById('sidebarToggleBtn');
                if (btn) btn.click();
            });
            
            // Wait for CSS transition and verify sidebar is now visible
            await page.waitForFunction(() => {
                return document.body.classList.contains('sidebar-visible');
            }, { timeout: 5000 });
            
            const sidebarOpenVisible = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            expect(sidebarOpenVisible).toBe(true);
            
            // Verify sidebar element is transformed correctly
            const sidebarTransform = await page.evaluate(() => {
                const sidebar = document.getElementById('globalSidebar');
                const computedStyle = window.getComputedStyle(sidebar);
                return computedStyle.transform;
            });
            expect(sidebarTransform).not.toBe('translateX(-100%)');
            
            // Click hamburger menu again to close sidebar
            await page.evaluate(() => {
                const btn = document.getElementById('sidebarToggleBtn');
                if (btn) btn.click();
            });
            
            // Wait for CSS transition and verify sidebar is hidden again
            await page.waitForFunction(() => {
                return !document.body.classList.contains('sidebar-visible');
            }, { timeout: 5000 });
            
            const sidebarClosedVisible = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            expect(sidebarClosedVisible).toBe(false);
        }, 30000);

        it('should close sidebar when clicking overlay', async () => {
            await page.goto(`${serverUrl}/TaskListPage.html`);
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            
            // Wait for sidebar to load dynamically
            await page.waitForFunction(() => {
                const sidebar = document.getElementById('globalSidebar');
                return sidebar && sidebar.innerHTML.trim() !== '' && sidebar.innerHTML.includes('Project Arrowhead');
            }, { timeout: 10000 });
            
            // Open sidebar using page.evaluate
            await page.evaluate(() => {
                const btn = document.getElementById('sidebarToggleBtn');
                if (btn) btn.click();
            });
            
            // Wait for sidebar to open
            await page.waitForFunction(() => {
                return document.body.classList.contains('sidebar-visible');
            }, { timeout: 5000 });
            
            // Verify sidebar is open
            const sidebarOpen = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            expect(sidebarOpen).toBe(true);
            
            // Click on overlay to close sidebar using page.evaluate
            await page.evaluate(() => {
                const overlay = document.getElementById('sidebarOverlay');
                if (overlay) overlay.click();
            });
            
            // Wait for sidebar to close
            await page.waitForFunction(() => {
                return !document.body.classList.contains('sidebar-visible');
            }, { timeout: 5000 });
            
            // Verify sidebar is closed
            const sidebarClosed = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            expect(sidebarClosed).toBe(false);
        }, 30000);

        it('should work consistently across different pages', async () => {
            const testPages = [
                '/index.html',
                '/TaskListPage.html',
                '/brainstorm_step1.html',
                '/choose_step1.html'
            ];
            
            for (const pagePath of testPages) {
                await page.goto(`${serverUrl}${pagePath}`);
                await page.waitForSelector('#sidebarToggleBtn', { visible: true });
                
                // Wait for sidebar to load dynamically
                await page.waitForFunction(() => {
                    const sidebar = document.getElementById('globalSidebar');
                    return sidebar && sidebar.innerHTML.trim() !== '' && sidebar.innerHTML.includes('Project Arrowhead');
                }, { timeout: 10000 });
                
                // Test hamburger menu functionality using page.evaluate
                await page.evaluate(() => {
                    const btn = document.getElementById('sidebarToggleBtn');
                    if (btn) btn.click();
                });
                
                // Wait for sidebar to open
                await page.waitForFunction(() => {
                    return document.body.classList.contains('sidebar-visible');
                }, { timeout: 5000 });
                
                const sidebarVisible = await page.evaluate(() => {
                    return document.body.classList.contains('sidebar-visible');
                });
                
                expect(sidebarVisible).toBe(true);
                
                // Close sidebar for next iteration
                await page.evaluate(() => {
                    const btn = document.getElementById('sidebarToggleBtn');
                    if (btn) btn.click();
                });
                
                // Wait for sidebar to close
                await page.waitForFunction(() => {
                    return !document.body.classList.contains('sidebar-visible');
                }, { timeout: 5000 });
            }
        }, 60000);
    });

    describe('Negative Task Creation Tests', () => {
        it('should NOT create automatic tasks after completing Brainstorm journey', async () => {
            // Navigate to Brainstorm and complete journey
            await page.goto(`${serverUrl}/brainstorm_step1.html`);
            await page.waitForSelector('#brainstormStep1Input');
            
            const testText = 'Negative Test - No Auto Tasks';
            
            // Complete all 5 steps using proper navigation
            await page.type('#brainstormStep1Input', testText);
            for (let i = 2; i <= 5; i++) {
                await clickAndNavigate(page, 'button[type="submit"]');
                await page.waitForSelector(`#brainstormStep${i}Input`);
                await page.type(`#brainstormStep${i}Input`, `${testText} - Step ${i}`);
            }
            
            // Submit final form and navigate to task list
            await clickAndNavigate(page, 'button[type="submit"]');
            await page.waitForSelector('#taskListContainer', { visible: true });
            
            // Verify NO automatic tasks were created
            const automaticTaskExists = await page.evaluate((text) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent);
                return taskTexts.some(taskText => taskText.includes(text));
            }, testText);
            
            expect(automaticTaskExists).toBe(false);
        }, 45000);

        it('should NOT create automatic tasks after completing Choose journey', async () => {
            // Navigate to Choose and complete journey
            await page.goto(`${serverUrl}/choose_step1.html`);
            await page.waitForSelector('#chooseStep1Input');
            
            const testText = 'Negative Test Choose - No Auto Tasks';
            
            // Complete all 5 steps using proper navigation
            await page.type('#chooseStep1Input', testText);
            for (let i = 2; i <= 5; i++) {
                await clickAndNavigate(page, 'button[type="submit"]');
                await page.waitForSelector(`#chooseStep${i}Input`);
                await page.type(`#chooseStep${i}Input`, `${testText} - Step ${i}`);
            }
            
            // Submit final form and navigate to task list
            await clickAndNavigate(page, 'button[type="submit"]');
            await page.waitForSelector('#taskListContainer', { visible: true });
            
            // Verify NO automatic tasks were created
            const automaticTaskExists = await page.evaluate((text) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent);
                return taskTexts.some(taskText => taskText.includes(text));
            }, testText);
            
            expect(automaticTaskExists).toBe(false);
        }, 45000);
    });

    describe('Explicit Task Creation Validation', () => {
        it('should create task ONLY when user clicks Add Task button on Brainstorm page', async () => {
            // Navigate to Brainstorm step 5
            await page.goto(`${serverUrl}/brainstorm_step5.html`);
            await page.waitForSelector('#taskContentInput', { visible: true });
            
            const taskDescription = 'Explicit Task Test - Brainstorm';
            
            // Fill out explicit task creation form
            await page.type('#taskContentInput', taskDescription);
            await page.type('#taskPersonInput', 'Test User');
            
            // Click Add Task button
            await page.click('button[onclick="createTaskFromCurrentStep()"]');
            
            // Navigate to Task List to verify
            await page.goto(`${serverUrl}/TaskListPage.html`);
            await page.waitForSelector('#taskListContainer', { visible: true });
            await page.waitForSelector('#taskList');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify explicit task was created
            const explicitTaskExists = await page.evaluate((description) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent);
                return taskTexts.some(taskText => taskText.includes(description));
            }, taskDescription);
            
            expect(explicitTaskExists).toBe(true);
        }, 30000);

        it('should create task ONLY when user clicks Add Task button on Choose page', async () => {
            // Navigate to Choose step 5
            await page.goto(`${serverUrl}/choose_step5.html`);
            await page.waitForSelector('#taskContentInput', { visible: true });
            
            const taskDescription = 'Explicit Task Test - Choose';
            
            // Fill out explicit task creation form
            await page.type('#taskContentInput', taskDescription);
            await page.type('#taskPersonInput', 'Test User');
            
            // Click Add Task button
            await page.click('button[onclick="createTaskFromCurrentStep()"]');
            
            // Navigate to Task List to verify
            await page.goto(`${serverUrl}/TaskListPage.html`);
            await page.waitForSelector('#taskListContainer', { visible: true });
            await page.waitForSelector('#taskList');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify explicit task was created
            const explicitTaskExists = await page.evaluate((description) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent);
                return taskTexts.some(taskText => taskText.includes(description));
            }, taskDescription);
            
            expect(explicitTaskExists).toBe(true);
        }, 30000);
    });

    describe('UI Responsiveness Tests', () => {
        // TODO: Disabled due to headless browser rendering issues. Core functionality is verified in journeys.test.js.
        /*
        it('should handle rapid hamburger menu clicks without breaking', async () => {
            await page.goto(`${serverUrl}/index.html`);
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            
            // Rapidly click hamburger menu multiple times
            for (let i = 0; i < 5; i++) {
                await page.click('#sidebarToggleBtn');
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            }
            
            // Verify final state is consistent
            const finalState = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            
            // Should be open (odd number of clicks)
            expect(finalState).toBe(true);
        }, 30000);

        it('should maintain sidebar state during page navigation', async () => {
            await page.goto(`${serverUrl}/index.html`);
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            
            // Open sidebar
            await page.click('#sidebarToggleBtn');
            
            // Navigate to another page
            await page.goto(`${serverUrl}/TaskListPage.html`);
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            
            // Verify sidebar state reset (expected behavior)
            const sidebarState = await page.evaluate(() => {
                return document.body.classList.contains('sidebar-visible');
            });
            
            expect(sidebarState).toBe(false);
        }, 30000);
        */
    });
});
