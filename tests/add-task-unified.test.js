/**
 * OPERATION: UNIFICATION - Task U.4 Automated Test
 * 
 * This test verifies the unified Add Task functionality across all journey step pages.
 * It tests both architectural symmetry (consistent implementation) and UX symmetry (predictable behavior).
 * 
 * Test Strategy: Representative sampling across all three modules (Brainstorm, Choose, Objectives)
 * to verify symmetrical behavior without testing all 17 pages (which would be redundant).
 */

const puppeteer = require('puppeteer');
const { clickAndNavigate, navigateViaMenu } = require('./test-utils');

/**
 * Simple page verification function for this test
 */
async function verifyPageLoaded(page) {
    // Wait for the page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for main content to be present
    await page.waitForSelector('body', { timeout: 10000 });
}

/**
 * Navigate via sidebar menu to a specific page
 */
async function openSidebarAndNavigate(page, targetUrl) {
    // Extract the page name from URL for navigation
    const pageName = targetUrl.replace('.html', '').replace(/_/g, ' ');
    
    // Use the navigateViaMenu function from test-utils
    await navigateViaMenu(page, pageName);
}

describe('Add Task Unified Functionality', () => {
    let browser;
    let page;
    const baseUrl = 'http://127.0.0.1:8080';
    
    // Set reasonable timeout for test suite
    jest.setTimeout(30000); // 30 seconds
    
    // Representative sample: one page from each module + different step numbers
    const testPages = [
        { module: 'brainstorm', step: 'step2', url: 'brainstorm_step2.html', contextKeyword: 'brainstorming' },
        { module: 'choose', step: 'step3', url: 'choose_step3.html', contextKeyword: 'decision' },
        { module: 'objectives', step: 'step4', url: 'objectives_step4.html', contextKeyword: 'objectives' }
    ];

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Disable cache to ensure fresh content
        await page.setCacheEnabled(false);
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        // Navigate to a page first to establish context for localStorage
        await page.goto(`${baseUrl}/index.html`);
        await page.evaluate(() => {
            try {
                localStorage.clear();
            } catch (e) {
                // Ignore localStorage errors in test environment
                console.log('localStorage clear failed:', e.message);
            }
        });
    });

    describe('Architectural Symmetry Tests', () => {
        test.each(testPages)('Add Task component exists and is properly structured on $module $step', async ({ url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await verifyPageLoaded(page);

            // Verify Add Task section exists
            const addTaskSection = await page.$('#addTaskSection');
            expect(addTaskSection).toBeTruthy();

            // Verify component structure (architectural symmetry)
            const header = await page.$('#addTaskSection .card-header');
            expect(header).toBeTruthy();
            
            const headerText = await page.$eval('#addTaskSection .card-header h5', el => el.textContent.trim());
            expect(headerText).toBe('Create Task from This Step');

            // Verify form elements exist
            const taskContentInput = await page.$('#taskContentInput');
            expect(taskContentInput).toBeTruthy();
            
            const taskPersonInput = await page.$('#taskPersonInput');
            expect(taskPersonInput).toBeTruthy();
            
            const addTaskButton = await page.$('button[onclick="createTaskFromCurrentStep()"]');
            expect(addTaskButton).toBeTruthy();

            // Verify button text (architectural symmetry)
            const buttonText = await page.$eval('button[onclick="createTaskFromCurrentStep()"]', el => el.textContent.trim());
            expect(buttonText).toBe('Add Task');
        });

        test.each(testPages)('Add Task form has correct contextual placeholder on $module $step', async ({ url, contextKeyword }) => {
            await page.goto(`${baseUrl}/${url}`);
            await verifyPageLoaded(page);

            // Wait for component initialization
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify contextual placeholder text
            const placeholder = await page.$eval('#taskContentInput', el => el.placeholder);
            expect(placeholder.toLowerCase()).toContain(contextKeyword);
        });

        test.each(testPages)('Assigned To field defaults to blank (Task U.5 verification) on $module $step', async ({ url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await verifyPageLoaded(page);

            // Verify Assigned To field is blank by default
            const assignedToValue = await page.$eval('#taskPersonInput', el => el.value);
            expect(assignedToValue).toBe('');
        });
    });

    describe('UX Symmetry Tests', () => {
        test.each(testPages)('Add Task functionality works correctly on $module $step', async ({ module, step, url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await verifyPageLoaded(page);

            // Wait for component initialization
            await new Promise(resolve => setTimeout(resolve, 1000));

            const testTaskDescription = `Test task from ${module} ${step}`;
            const testAssignedTo = 'Test User';

            // Check if Add Task button exists
            const addTaskButton = await page.$('button[onclick="createTaskFromCurrentStep()"]');
            expect(addTaskButton).toBeTruthy();

            // Fill out Add Task form
            await page.type('#taskContentInput', testTaskDescription);
            await page.type('#taskPersonInput', testAssignedTo);

            // Listen for console errors
            const consoleMessages = [];
            page.on('console', msg => {
                consoleMessages.push(msg.text());
            });

            // Click Add Task button and wait for any alerts
            await page.evaluate(() => {
                window.alertMessages = [];
                const originalAlert = window.alert;
                window.alert = function(message) {
                    window.alertMessages.push(message);
                    return originalAlert.call(this, message);
                };
            });

            // Use page.evaluate to call the function directly to avoid navigation issues
            await page.evaluate(() => {
                window.createTaskFromCurrentStep();
            });

            // Wait for task creation and verify immediately
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify task was saved to localStorage immediately after creation
            const sessionData = await page.evaluate(() => {
                try {
                    const data = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    console.log('Immediate session data check:', data);
                    return data;
                } catch (e) {
                    console.log('localStorage access failed:', e.message);
                    return {};
                }
            });

            console.log('Retrieved session data:', sessionData);

            // Check for any alerts or console errors
            const alertMessages = await page.evaluate(() => window.alertMessages || []);
            if (alertMessages.length > 0) {
                console.log('Alert messages:', alertMessages);
            }
            if (consoleMessages.length > 0) {
                console.log('Console messages:', consoleMessages);
            }

            // Verify form was cleared (UX symmetry)
            const taskContentValue = await page.$eval('#taskContentInput', el => el.value);
            const taskPersonValue = await page.$eval('#taskPersonInput', el => el.value);
            
            expect(taskContentValue).toBe('');
            expect(taskPersonValue).toBe('');
            
            expect(sessionData.taskList).toBeDefined();
            expect(Array.isArray(sessionData.taskList)).toBe(true);
            expect(sessionData.taskList.length).toBeGreaterThan(0);
            
            // Find our test task
            const testTask = sessionData.taskList.find(task => 
                task.content === testTaskDescription && task.assignedTo === testAssignedTo
            );
            
            expect(testTask).toBeDefined();
            expect(testTask.module).toBe(module);
            expect(testTask.step).toBe(step);
        });

        test('Task creation validation works consistently', async () => {
            // Test on one representative page
            const testPage = testPages[0];
            await page.goto(`${baseUrl}/${testPage.url}`);
            await verifyPageLoaded(page);

            // Wait for component initialization
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try to create task without description (should show validation)
            // Use page.evaluate to call the function directly to avoid navigation issues
            await page.evaluate(() => {
                window.createTaskFromCurrentStep();
            });

            // Wait for alert and handle it
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify validation message appears (this tests the alert)
            // Note: In headless mode, we can't easily test alert dialogs, 
            // but we can verify the function doesn't proceed without content
            const sessionData = await page.evaluate(() => {
                try {
                    return JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                } catch (e) {
                    console.log('localStorage access failed:', e.message);
                    return {};
                }
            });

            // Should not have created any tasks
            expect(sessionData.taskList || []).toHaveLength(0);
        });
    });

    describe('Data Persistence Tests', () => {
        test('Tasks persist across navigation between journey pages', async () => {
            // Start on first test page
            const firstPage = testPages[0];
            const secondPage = testPages[1];
            
            await page.goto(`${baseUrl}/${firstPage.url}`);
            await verifyPageLoaded(page);

            // Wait for component initialization
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create a task on first page
            const testTaskDescription = 'Persistence test task';
            const testAssignedTo = 'Persistence User';

            await page.type('#taskContentInput', testTaskDescription);
            await page.type('#taskPersonInput', testAssignedTo);
            // Use page.evaluate to call the function directly to avoid navigation issues
            await page.evaluate(() => {
                window.createTaskFromCurrentStep();
            });

            // Wait for task creation
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Navigate to second page via sidebar
            await openSidebarAndNavigate(page, secondPage.url);
            await verifyPageLoaded(page);

            // Verify task persists in localStorage
            const sessionData = await page.evaluate(() => {
                try {
                    return JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                } catch (e) {
                    console.log('localStorage access failed:', e.message);
                    return {};
                }
            });

            expect(sessionData.taskList).toBeDefined();
            expect(Array.isArray(sessionData.taskList)).toBe(true);
            expect(sessionData.taskList.length).toBeGreaterThan(0);
            
            const persistedTask = sessionData.taskList.find(task => 
                task.content === testTaskDescription && task.assignedTo === testAssignedTo
            );
            
            expect(persistedTask).toBeDefined();
            expect(persistedTask.module).toBe(firstPage.module);
            expect(persistedTask.step).toBe(firstPage.step);

            // Create another task on second page
            await new Promise(resolve => setTimeout(resolve, 500));
            const secondTaskDescription = 'Second page task';
            
            await page.type('#taskContentInput', secondTaskDescription);
            // Use page.evaluate to call the function directly to avoid navigation issues
            await page.evaluate(() => {
                window.createTaskFromCurrentStep();
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify both tasks exist
            const finalSessionData = await page.evaluate(() => {
                try {
                    return JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                } catch (e) {
                    console.log('localStorage access failed:', e.message);
                    return {};
                }
            });

            expect(finalSessionData.taskList).toBeDefined();
            expect(Array.isArray(finalSessionData.taskList)).toBe(true);
            expect(finalSessionData.taskList).toHaveLength(2);
            
            const firstTask = finalSessionData.taskList.find(task => task.content === testTaskDescription);
            const secondTask = finalSessionData.taskList.find(task => task.content === secondTaskDescription);
            
            expect(firstTask).toBeDefined();
            expect(secondTask).toBeDefined();
            expect(firstTask.module).toBe(firstPage.module);
            expect(secondTask.module).toBe(secondPage.module);
        });
    });

    describe('Context-Aware Behavior Tests', () => {
        test('Add Task component correctly detects page context', async () => {
            for (const testPage of testPages) {
                await page.goto(`${baseUrl}/${testPage.url}`);
                await verifyPageLoaded(page);

                // Wait for component initialization
                await new Promise(resolve => setTimeout(resolve, 500));

                // Create a task to verify context detection
                const testTaskDescription = `Context test for ${testPage.module}`;
                
                await page.type('#taskContentInput', testTaskDescription);
                // Use page.evaluate to call the function directly to avoid navigation issues
            await page.evaluate(() => {
                window.createTaskFromCurrentStep();
            });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verify task has correct module and step context
                const sessionData = await page.evaluate(() => {
                    try {
                        return JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    } catch (e) {
                        console.log('localStorage access failed:', e.message);
                        return {};
                    }
                });

                // Ensure taskList exists before searching
                expect(sessionData.taskList).toBeDefined();
                expect(Array.isArray(sessionData.taskList)).toBe(true);
                expect(sessionData.taskList.length).toBeGreaterThan(0);
                
                const contextTask = sessionData.taskList.find(task => 
                    task.content === testTaskDescription
                );
                
                expect(contextTask).toBeDefined();
                expect(contextTask.module).toBe(testPage.module);
                expect(contextTask.step).toBe(testPage.step);

                // Clear for next iteration
                await page.evaluate(() => {
                    try {
                        localStorage.clear();
                    } catch (e) {
                        console.log('localStorage clear failed:', e.message);
                    }
                });
            }
        });
    });
});
