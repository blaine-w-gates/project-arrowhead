/**
 * Simplified diagnostic test to identify root cause of Add Task test failures
 */

const puppeteer = require('puppeteer');

describe('Add Task Debug Test', () => {
    let browser;
    let page;
    const baseUrl = 'http://127.0.0.1:8080';
    
    jest.setTimeout(30000); // 30 seconds

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

    test('Basic Add Task component loading test', async () => {
        console.log('Starting basic Add Task component test...');
        
        // Navigate to a test page
        await page.goto(`${baseUrl}/brainstorm_step2.html`);
        console.log('Navigated to brainstorm_step2.html');
        
        // Wait for page to load
        await page.waitForSelector('body', { timeout: 10000 });
        console.log('Page body loaded');
        
        // Check if Add Task section exists
        const addTaskSection = await page.$('#addTaskSection');
        console.log('Add Task section exists:', !!addTaskSection);
        expect(addTaskSection).toBeTruthy();
        
        // Check if form elements exist
        const taskContentInput = await page.$('#taskContentInput');
        const taskPersonInput = await page.$('#taskPersonInput');
        const addTaskButton = await page.$('button[onclick="createTaskFromCurrentStep()"]');
        
        console.log('Task content input exists:', !!taskContentInput);
        console.log('Task person input exists:', !!taskPersonInput);
        console.log('Add task button exists:', !!addTaskButton);
        
        expect(taskContentInput).toBeTruthy();
        expect(taskPersonInput).toBeTruthy();
        expect(addTaskButton).toBeTruthy();
        
        console.log('Basic component test completed successfully');
    });

    test('Add Task function availability test', async () => {
        console.log('Starting Add Task function availability test...');
        
        await page.goto(`${baseUrl}/brainstorm_step2.html`);
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check if the createTaskFromCurrentStep function exists
        const functionExists = await page.evaluate(() => {
            return typeof window.createTaskFromCurrentStep === 'function';
        });
        
        console.log('createTaskFromCurrentStep function exists:', functionExists);
        expect(functionExists).toBe(true);
        
        // Check if initializeAddTaskComponent function exists
        const initFunctionExists = await page.evaluate(() => {
            return typeof window.initializeAddTaskComponent === 'function';
        });
        
        console.log('initializeAddTaskComponent function exists:', initFunctionExists);
        expect(initFunctionExists).toBe(true);
        
        console.log('Function availability test completed successfully');
    });

    test('Simple Add Task execution test', async () => {
        console.log('Starting simple Add Task execution test...');
        
        await page.goto(`${baseUrl}/brainstorm_step2.html`);
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fill form
        await page.type('#taskContentInput', 'Test task');
        await page.type('#taskPersonInput', 'Test user');
        
        console.log('Form filled successfully');
        
        // Capture console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });
        
        // Try to click the button
        console.log('Attempting to click Add Task button...');
        
        try {
            await page.click('button[onclick="createTaskFromCurrentStep()"]');
            console.log('Button clicked successfully');
            
            // Wait a bit for any processing
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('Console messages during execution:', consoleMessages);
            
            // Check localStorage
            const sessionData = await page.evaluate(() => {
                try {
                    const data = localStorage.getItem('objectiveBuilderSession');
                    console.log('Raw localStorage data:', data);
                    return data ? JSON.parse(data) : null;
                } catch (e) {
                    console.log('localStorage error:', e.message);
                    return null;
                }
            });
            
            console.log('Session data retrieved:', sessionData);
            
            if (sessionData && sessionData.taskList) {
                console.log('Task list found with', sessionData.taskList.length, 'tasks');
            } else {
                console.log('No task list found in session data');
            }
            
        } catch (error) {
            console.log('Error during button click:', error.message);
            throw error;
        }
        
        console.log('Simple execution test completed');
    });
});
