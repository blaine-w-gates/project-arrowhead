const puppeteer = require('puppeteer');

/**
 * FAILING PARITY TEST SUITE: Task List Page
 * 
 * This test suite codifies the core user stories from the approved Component Specification
 * and is EXPECTED TO FAIL against the current React implementation. These tests define
 * the remediation goals for achieving 100% parity with the original JavaScript Task List.
 * 
 * SPECIFICATION SOURCE: Digital Twin audit of TaskListPage.html/TaskListPage.js
 * 
 * Core User Stories:
 * 1. Empty state display when no tasks exist
 * 2. Add new task functionality with modal form
 * 3. Delete task functionality with confirmation
 */

describe('Task List Page Parity', () => {
    let browser;
    let page;
    const serverUrl = 'http://localhost:5173'; // React dev server port

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            timeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging for debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        // Navigate to Task List page before each test
        await page.goto(`${serverUrl}/tasks`, { 
            waitUntil: 'networkidle0',
            timeout: 10000 
        });
        
        // Wait for React to fully render
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should display an empty state message when no tasks exist', async () => {
        console.log('🧪 Testing empty state display...');
        
        // Look for the task table body
        const taskTableBody = await page.$('#taskList');
        expect(taskTableBody).not.toBeNull();
        
        // Check for empty state message in table cell
        // Original specification: '<tr><td colspan="5" class="text-center">No tasks yet. Add one to get started!</td></tr>'
        const emptyStateCell = await page.evaluate(() => {
            const taskList = document.getElementById('taskList');
            if (!taskList) return null;
            
            const cells = taskList.querySelectorAll('td');
            for (let cell of cells) {
                const text = cell.textContent.trim();
                if (text.includes('No tasks yet') || text.includes('Add one to get started')) {
                    return {
                        text: text,
                        colspan: cell.getAttribute('colspan'),
                        className: cell.className
                    };
                }
            }
            return null;
        });
        
        expect(emptyStateCell).not.toBeNull();
        expect(emptyStateCell.text).toContain('No tasks yet');
        expect(emptyStateCell.colspan).toBe('5'); // Should span all 5 columns
        expect(emptyStateCell.className).toContain('text-center');
        
        console.log('✅ Empty state message verified');
    });

    test('should add a new task to the table', async () => {
        console.log('🧪 Testing add task functionality...');
        
        // Step 1: Find and click the Add Task button
        const addTaskButton = await page.$('#addTaskButton');
        expect(addTaskButton).not.toBeNull();
        
        await page.click('#addTaskButton');
        
        // Step 2: Wait for modal to appear
        await page.waitForSelector('#addTaskModal', { visible: true, timeout: 5000 });
        
        // Step 3: Fill out the modal form
        const testTaskDescription = 'Test task from parity test';
        const testTaskPerson = 'Test Person';
        
        await page.type('#newTaskDescription', testTaskDescription);
        await page.type('#newTaskPerson', testTaskPerson);
        
        // Step 4: Submit the form
        await page.click('#saveChangesButton');
        
        // Step 5: Wait for modal to close and task to appear
        await page.waitForSelector('#addTaskModal', { hidden: true, timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 6: Verify the new task appears in the table
        const newTaskRow = await page.evaluate((description, person) => {
            const taskList = document.getElementById('taskList');
            if (!taskList) return null;
            
            const rows = taskList.querySelectorAll('tr');
            for (let row of rows) {
                const taskCell = row.querySelector('.task-description');
                const personCell = row.querySelector('.task-person');
                
                if (taskCell && personCell && 
                    taskCell.textContent.trim() === description &&
                    personCell.textContent.trim() === person) {
                    return {
                        task: taskCell.textContent.trim(),
                        person: personCell.textContent.trim(),
                        hasStatusBadge: !!row.querySelector('.task-status'),
                        hasActionButtons: row.querySelectorAll('button').length >= 2
                    };
                }
            }
            return null;
        }, testTaskDescription, testTaskPerson);
        
        expect(newTaskRow).not.toBeNull();
        expect(newTaskRow.task).toBe(testTaskDescription);
        expect(newTaskRow.person).toBe(testTaskPerson);
        expect(newTaskRow.hasStatusBadge).toBe(true);
        expect(newTaskRow.hasActionButtons).toBe(true);
        
        console.log('✅ Add task functionality verified');
    });

    test('should delete a task when the delete button is clicked', async () => {
        console.log('🧪 Testing delete task functionality...');
        
        // Step 1: First add a task to delete (reuse add task logic)
        await page.click('#addTaskButton');
        await page.waitForSelector('#addTaskModal', { visible: true });
        
        const testTaskDescription = 'Task to be deleted';
        await page.type('#newTaskDescription', testTaskDescription);
        await page.click('#saveChangesButton');
        await page.waitForSelector('#addTaskModal', { hidden: true });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Find the delete button for our test task
        const deleteButtonExists = await page.evaluate((description) => {
            const taskList = document.getElementById('taskList');
            if (!taskList) return false;
            
            const rows = taskList.querySelectorAll('tr');
            for (let row of rows) {
                const taskCell = row.querySelector('.task-description');
                if (taskCell && taskCell.textContent.trim() === description) {
                    const deleteButton = row.querySelector('button[onclick*="confirmDelete"]');
                    return !!deleteButton;
                }
            }
            return false;
        }, testTaskDescription);
        
        expect(deleteButtonExists).toBe(true);
        
        // Step 3: Click the delete button
        await page.evaluate((description) => {
            const taskList = document.getElementById('taskList');
            const rows = taskList.querySelectorAll('tr');
            for (let row of rows) {
                const taskCell = row.querySelector('.task-description');
                if (taskCell && taskCell.textContent.trim() === description) {
                    const deleteButton = row.querySelector('button[onclick*="confirmDelete"]');
                    if (deleteButton) {
                        deleteButton.click();
                        break;
                    }
                }
            }
        }, testTaskDescription);
        
        // Step 4: Handle confirmation modal (if it appears)
        try {
            await page.waitForSelector('#deleteModal', { visible: true, timeout: 2000 });
            await page.click('#confirmDeleteButton');
            await page.waitForSelector('#deleteModal', { hidden: true, timeout: 5000 });
        } catch (error) {
            // Modal might not appear, continue with verification
            console.log('Delete confirmation modal not found, continuing...');
        }
        
        // Step 5: Verify the task is removed from the table
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const taskStillExists = await page.evaluate((description) => {
            const taskList = document.getElementById('taskList');
            if (!taskList) return false;
            
            const rows = taskList.querySelectorAll('tr');
            for (let row of rows) {
                const taskCell = row.querySelector('.task-description');
                if (taskCell && taskCell.textContent.trim() === description) {
                    return true;
                }
            }
            return false;
        }, testTaskDescription);
        
        expect(taskStillExists).toBe(false);
        
        console.log('✅ Delete task functionality verified');
    });
});
