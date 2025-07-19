/**
 * SENTRY PROTOCOL: Task S.2 - Update Task Functionality Bug
 * 
 * This test replicates the "Update Task" button bug by:
 * 1. Creating a task
 * 2. Attempting to edit the task via the Edit button
 * 3. Modifying task details in the edit modal
 * 4. Clicking "Update Task" button
 * 5. Verifying the task was updated with new details
 * 
 * Expected Failure: The updateTask() function does not exist, so clicking
 * "Update Task" should fail to update the task with new information.
 */

const puppeteer = require('puppeteer');
const { navigateViaMenu } = require('./test-utils');

describe('Sentry Protocol Tests', () => {
    let browser;
    let page;
    const testServerUrl = 'http://127.0.0.1:8080';
    const sessionStorageKey = 'objectiveBuilderSession';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-cache', '--disable-cache']
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setCacheEnabled(false);
        
        // Dialog handler for alerts
        page.on('dialog', async dialog => {
            console.log(`Dialog detected: ${dialog.type()} - ${dialog.message()}`);
            await dialog.accept();
        });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    describe('Task S.2: Update Task Functionality Bug', () => {
        it('should successfully update a task when Update Task button is clicked', async () => {
            console.log('🔍 SENTRY PROTOCOL: Replicating Update Task Bug...');
            
            // Navigate to home page first
            await page.goto(`${testServerUrl}/index.html`, { waitUntil: 'networkidle0' });
            
            // Navigate to Task List page via hamburger menu
            await navigateViaMenu(page, 'Task List');
            
            // Wait for page to load
            await page.waitForSelector('#taskList', { timeout: 10000 });
            
            // Create a test task first
            const originalTaskContent = "Original task for update test - Sentry Protocol";
            const updatedTaskContent = "UPDATED task content - Sentry Protocol";
            const originalPerson = "Original Person";
            const updatedPerson = "Updated Person";
            const originalDate = "2025-01-01";
            const updatedDate = "2025-12-31";
            
            // Click Add Task button using page.evaluate for reliability
            await page.evaluate(() => {
                const addButton = document.querySelector('button[onclick="showAddTaskModal()"]');
                if (addButton) {
                    addButton.click();
                } else {
                    // Fallback: call function directly
                    if (typeof window.showAddTaskModal === 'function') {
                        window.showAddTaskModal();
                    }
                }
            });
            await page.waitForSelector('#addTaskModal', { visible: true });
            
            // Fill in task details
            await page.type('#taskDescription', originalTaskContent);
            await page.type('#taskPerson', originalPerson);
            await page.type('#taskDate', originalDate);
            
            // Submit the task
            await page.click('#addTaskModal button[onclick="addTask()"]');
            
            // Wait for task to be added and modal to close
            await page.waitForFunction(() => {
                const modal = document.getElementById('addTaskModal');
                return !modal.classList.contains('show');
            }, { timeout: 5000 });
            
            // Verify task was created
            const taskExistsBeforeUpdate = await page.evaluate((content) => {
                const taskElements = Array.from(document.querySelectorAll('#taskList tr'));
                return taskElements.some(element => 
                    element.textContent.includes(content)
                );
            }, originalTaskContent);
            
            console.log('Task exists before update:', taskExistsBeforeUpdate);
            expect(taskExistsBeforeUpdate).toBe(true);
            
            // Find and click the Edit button for our task
            const editResult = await page.evaluate((content) => {
                const taskRows = Array.from(document.querySelectorAll('#taskList tr'));
                const targetRow = taskRows.find(row => 
                    row.textContent.includes(content)
                );
                
                if (targetRow) {
                    const editButton = targetRow.querySelector('button[onclick*="editTask"]');
                    if (editButton) {
                        console.log('Edit button found, clicking...');
                        editButton.click();
                        return { clicked: true, editButtonExists: true };
                    }
                }
                return { clicked: false, editButtonExists: false };
            }, originalTaskContent);
            
            console.log('Edit button click result:', editResult);
            expect(editResult.editButtonExists).toBe(true);
            expect(editResult.clicked).toBe(true);
            
            // Wait for edit modal to appear
            await page.waitForSelector('#editTaskModal', { visible: true });
            
            // Clear and update task details in the edit modal
            await page.evaluate(() => {
                document.getElementById('editTaskDescription').value = '';
                document.getElementById('editTaskPerson').value = '';
                document.getElementById('editTaskDate').value = '';
            });
            
            await page.type('#editTaskDescription', updatedTaskContent);
            await page.type('#editTaskPerson', updatedPerson);
            await page.type('#editTaskDate', updatedDate);
            
            // Check if updateTask function exists before clicking
            const updateTaskExists = await page.evaluate(() => {
                return typeof window.updateTask === 'function';
            });
            
            console.log('updateTask function exists:', updateTaskExists);
            
            // Click the "Update Task" button
            const updateResult = await page.evaluate(() => {
                const updateButton = document.querySelector('#editTaskModal button[onclick="updateTask()"]');
                if (updateButton) {
                    console.log('Update Task button found, clicking...');
                    updateButton.click();
                    return { clicked: true, buttonExists: true };
                }
                return { clicked: false, buttonExists: false };
            });
            
            console.log('Update Task button click result:', updateResult);
            expect(updateResult.buttonExists).toBe(true);
            expect(updateResult.clicked).toBe(true);
            
            // Wait a moment for the update to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if task was updated with new content
            const taskUpdatedSuccessfully = await page.evaluate((originalContent, updatedContent, updatedPerson) => {
                const taskElements = Array.from(document.querySelectorAll('#taskList tr'));
                
                // Check if original content is gone
                const originalExists = taskElements.some(element => 
                    element.textContent.includes(originalContent)
                );
                
                // Check if updated content exists
                const updatedExists = taskElements.some(element => 
                    element.textContent.includes(updatedContent) && 
                    element.textContent.includes(updatedPerson)
                );
                
                return { originalExists, updatedExists };
            }, originalTaskContent, updatedTaskContent, updatedPerson);
            
            console.log('Task update verification:', taskUpdatedSuccessfully);
            
            // THE CRITICAL ASSERTION: Task should be updated with new content
            // If this fails, it proves the update functionality is broken
            expect(taskUpdatedSuccessfully.originalExists).toBe(false); // Original should be gone
            expect(taskUpdatedSuccessfully.updatedExists).toBe(true);   // Updated should exist
            
            console.log('🎯 SENTRY PROTOCOL: Update Task functionality verified as working');
        }, 60000);
    });

    describe('Task S.3: Clear Session Functionality Bug', () => {
        it('should successfully clear all session data when Clear Session button is clicked', async () => {
            console.log('🔍 SENTRY PROTOCOL: Replicating Clear Session Bug...');
            
            // Navigate to home page where Clear Session button is located
            await page.goto(`${testServerUrl}/index.html`, { waitUntil: 'networkidle0' });
            
            // First, create some session data to test clearing
            const testSessionData = {
                objectives: {
                    step1: { answer: 'Test objective data' },
                    step2: { answer: 'More test data' }
                },
                brainstorm: {
                    step1: { answer: 'Test brainstorm data' }
                },
                choose: {
                    step1: { answer: 'Test choose data' }
                },
                taskList: [
                    {
                        id: 'test-task-1',
                        task: 'Test task for clear session',
                        person: 'Test Person',
                        date: '2025-01-01',
                        status: 'To Do'
                    }
                ],
                timestamp: new Date().toISOString()
            };
            
            // Set test session data in localStorage
            await page.evaluate((key, data) => {
                localStorage.setItem(key, JSON.stringify(data));
            }, sessionStorageKey, testSessionData);
            
            // Verify session data exists before clearing
            const sessionDataBeforeClear = await page.evaluate((key) => {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            }, sessionStorageKey);
            
            console.log('Session data exists before clear:', !!sessionDataBeforeClear);
            console.log('Session data keys before clear:', sessionDataBeforeClear ? Object.keys(sessionDataBeforeClear) : []);
            expect(sessionDataBeforeClear).not.toBeNull();
            expect(sessionDataBeforeClear.objectives).toBeDefined();
            expect(sessionDataBeforeClear.taskList).toBeDefined();
            
            // Check if clearSessionData function exists
            const clearSessionDataExists = await page.evaluate(() => {
                return typeof window.clearSessionData === 'function';
            });
            
            console.log('clearSessionData function exists:', clearSessionDataExists);
            
            // Find and click the Clear Session button
            const clearResult = await page.evaluate(() => {
                const clearButton = document.querySelector('button[onclick="clearSessionData()"]');
                if (clearButton) {
                    console.log('Clear Session button found, clicking...');
                    clearButton.click();
                    return { clicked: true, buttonExists: true };
                }
                return { clicked: false, buttonExists: false };
            });
            
            console.log('Clear Session button click result:', clearResult);
            expect(clearResult.buttonExists).toBe(true);
            expect(clearResult.clicked).toBe(true);
            
            // Wait a moment for the clear operation to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if session data was cleared
            const sessionDataAfterClear = await page.evaluate((key) => {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            }, sessionStorageKey);
            
            console.log('Session data after clear:', sessionDataAfterClear);
            console.log('Session data cleared successfully:', sessionDataAfterClear === null);
            
            // THE CRITICAL ASSERTION: Session data should be cleared (should be null)
            // If this fails, it proves the clear session functionality is broken
            expect(sessionDataAfterClear).toBeNull();
            
            console.log('🎯 SENTRY PROTOCOL: Clear Session functionality verified as working');
        }, 60000);
    });
});
