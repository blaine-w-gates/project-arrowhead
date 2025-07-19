/**
 * Streamlined Add Task Unified Test Suite
 * Final version with robust localStorage handling and simplified interactions
 */

const puppeteer = require('puppeteer');

describe('Add Task Unified Functionality - Final Test', () => {
    let browser;
    let page;
    const baseUrl = 'http://127.0.0.1:8080';
    
    jest.setTimeout(20000); // 20 seconds - reasonable timeout

    // Test pages - one from each module
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
        await page.setCacheEnabled(false);
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    // Helper function to wait for page load
    async function waitForPageLoad() {
        await page.waitForSelector('body', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    describe('Architectural Symmetry Tests', () => {
        test.each(testPages)('Add Task component exists and is properly structured on $module $step', async ({ module, step, url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await waitForPageLoad();

            // Verify component structure
            const addTaskSection = await page.$('#addTaskSection');
            const taskContentInput = await page.$('#taskContentInput');
            const taskPersonInput = await page.$('#taskPersonInput');
            const addTaskButton = await page.$('button[onclick="createTaskFromCurrentStep()"]');

            expect(addTaskSection).toBeTruthy();
            expect(taskContentInput).toBeTruthy();
            expect(taskPersonInput).toBeTruthy();
            expect(addTaskButton).toBeTruthy();
        });

        test.each(testPages)('Add Task form has correct contextual placeholder on $module $step', async ({ module, step, url, contextKeyword }) => {
            await page.goto(`${baseUrl}/${url}`);
            await waitForPageLoad();

            const placeholder = await page.$eval('#taskContentInput', el => el.placeholder);
            expect(placeholder.toLowerCase()).toContain(contextKeyword);
        });

        test.each(testPages)('Assigned To field defaults to blank (Task U.5 verification) on $module $step', async ({ module, step, url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await waitForPageLoad();

            const assignedToValue = await page.$eval('#taskPersonInput', el => el.value);
            expect(assignedToValue).toBe('');
        });
    });

    describe('UX Symmetry Tests', () => {
        test.each(testPages)('Add Task functionality works correctly on $module $step', async ({ module, step, url }) => {
            await page.goto(`${baseUrl}/${url}`);
            await waitForPageLoad();

            const testTaskDescription = `Test task from ${module} ${step}`;
            const testAssignedTo = 'Test User';

            // Clear localStorage to start fresh
            await page.evaluate(() => {
                localStorage.removeItem('objectiveBuilderSession');
            });

            // Fill form
            await page.type('#taskContentInput', testTaskDescription);
            await page.type('#taskPersonInput', testAssignedTo);

            // Create task using direct function call to avoid navigation issues
            const taskCreated = await page.evaluate((taskContent, taskPerson) => {
                try {
                    // Set form values
                    document.getElementById('taskContentInput').value = taskContent;
                    document.getElementById('taskPersonInput').value = taskPerson;
                    
                    // Call the function directly
                    const result = window.createTaskFromCurrentStep();
                    
                    // Return both the result and the current localStorage state
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    return {
                        success: result,
                        sessionData: sessionData,
                        taskList: sessionData.taskList || []
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        sessionData: {},
                        taskList: []
                    };
                }
            }, testTaskDescription, testAssignedTo);

            // Verify task creation was successful
            expect(taskCreated.success).toBe(true);
            expect(taskCreated.taskList).toBeDefined();
            expect(Array.isArray(taskCreated.taskList)).toBe(true);
            expect(taskCreated.taskList.length).toBeGreaterThan(0);

            // Find our test task
            const testTask = taskCreated.taskList.find(task => 
                task.content === testTaskDescription && task.assignedTo === testAssignedTo
            );
            
            expect(testTask).toBeDefined();
            expect(testTask.module).toBe(module);
            expect(testTask.step).toBe(step);

            // Verify form was cleared
            const formValues = await page.evaluate(() => ({
                taskContent: document.getElementById('taskContentInput').value,
                taskPerson: document.getElementById('taskPersonInput').value
            }));
            
            expect(formValues.taskContent).toBe('');
            expect(formValues.taskPerson).toBe('');
        });

        test('Task creation validation works consistently', async () => {
            const testPage = testPages[0];
            await page.goto(`${baseUrl}/${testPage.url}`);
            await waitForPageLoad();

            // Clear form and try to create empty task
            await page.evaluate(() => {
                document.getElementById('taskContentInput').value = '';
                document.getElementById('taskPersonInput').value = '';
            });

            // Try to create task without description
            const validationResult = await page.evaluate(() => {
                try {
                    return window.createTaskFromCurrentStep();
                } catch (error) {
                    return false;
                }
            });

            // Should return false due to validation
            expect(validationResult).toBe(false);
        });
    });

    describe('Data Persistence Tests', () => {
        test('Tasks persist across navigation between journey pages', async () => {
            const firstPage = testPages[0];
            const secondPage = testPages[1];
            
            const testTaskDescription = 'Persistence test task';
            const testAssignedTo = 'Persistence User';

            // Create task on first page
            await page.goto(`${baseUrl}/${firstPage.url}`);
            await waitForPageLoad();

            await page.evaluate(() => {
                localStorage.removeItem('objectiveBuilderSession');
            });

            const firstTaskResult = await page.evaluate((taskContent, taskPerson) => {
                document.getElementById('taskContentInput').value = taskContent;
                document.getElementById('taskPersonInput').value = taskPerson;
                const result = window.createTaskFromCurrentStep();
                const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                return {
                    success: result,
                    taskCount: sessionData.taskList ? sessionData.taskList.length : 0
                };
            }, testTaskDescription, testAssignedTo);

            expect(firstTaskResult.success).toBe(true);
            expect(firstTaskResult.taskCount).toBe(1);

            // Navigate to second page and create another task
            await page.goto(`${baseUrl}/${secondPage.url}`);
            await waitForPageLoad();

            const secondTaskDescription = 'Second page task';
            
            const secondTaskResult = await page.evaluate((taskContent) => {
                document.getElementById('taskContentInput').value = taskContent;
                document.getElementById('taskPersonInput').value = '';
                const result = window.createTaskFromCurrentStep();
                const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                return {
                    success: result,
                    taskCount: sessionData.taskList ? sessionData.taskList.length : 0,
                    taskList: sessionData.taskList || []
                };
            }, secondTaskDescription);

            expect(secondTaskResult.success).toBe(true);
            expect(secondTaskResult.taskCount).toBe(2);

            // Verify both tasks exist
            const firstTask = secondTaskResult.taskList.find(task => task.content === testTaskDescription);
            const secondTask = secondTaskResult.taskList.find(task => task.content === secondTaskDescription);
            
            expect(firstTask).toBeDefined();
            expect(secondTask).toBeDefined();
        });
    });

    describe('Context-Aware Behavior Tests', () => {
        test('Add Task component correctly detects page context', async () => {
            for (const testPage of testPages) {
                await page.goto(`${baseUrl}/${testPage.url}`);
                await waitForPageLoad();

                const testTaskDescription = `Context test for ${testPage.module}`;
                
                const contextResult = await page.evaluate((taskContent, expectedModule, expectedStep) => {
                    document.getElementById('taskContentInput').value = taskContent;
                    document.getElementById('taskPersonInput').value = '';
                    
                    const result = window.createTaskFromCurrentStep();
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    
                    if (sessionData.taskList && sessionData.taskList.length > 0) {
                        const task = sessionData.taskList.find(t => t.content === taskContent);
                        return {
                            success: result,
                            task: task,
                            moduleMatch: task ? task.module === expectedModule : false,
                            stepMatch: task ? task.step === expectedStep : false
                        };
                    }
                    
                    return { success: false, task: null, moduleMatch: false, stepMatch: false };
                }, testTaskDescription, testPage.module, testPage.step);

                expect(contextResult.success).toBe(true);
                expect(contextResult.task).toBeDefined();
                expect(contextResult.moduleMatch).toBe(true);
                expect(contextResult.stepMatch).toBe(true);
            }
        });
    });
});
