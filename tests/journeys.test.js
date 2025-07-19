const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { clickAndNavigate, navigateViaMenu } = require('./test-utils');


describe('User Journeys', () => {
    let browser;
    let page;
    const serverUrl = 'http://127.0.0.1:8080';
    const downloadsPath = path.resolve(__dirname, 'downloads');

    beforeAll(async () => {
        browser = await puppeteer.launch({ headless: true });

        // Ensure the downloads directory exists and is clean
        if (fs.existsSync(downloadsPath)) {
            fs.rmSync(downloadsPath, { recursive: true, force: true });
        }
        fs.mkdirSync(downloadsPath, { recursive: true });
    }, 30000);

    afterAll(async () => {
        await browser.close();
    }, 30000);

    beforeEach(async () => {
        page = await browser.newPage();
        // Clear local storage before each test
        await page.goto(serverUrl); // Initial page load - keep as goto
        await page.evaluate(() => localStorage.clear());
    }, 30000);

    afterEach(async () => {
        await page.close();
    }, 30000);

    it('should complete the Brainstorm Habit journey and create tasks explicitly', async () => {
        page.on('dialog', async dialog => {
            await dialog.dismiss();
        });

        const brainstormText = 'Test Brainstorm Task';
        const taskDescription = 'Implement brainstorming insights from step 5';

        try {
            // 1. Navigate to Brainstorm and complete journey
            await page.goto(`${serverUrl}/brainstorm_step1.html`);
            await page.waitForSelector('#brainstormStep1Input');
            await page.type('#brainstormStep1Input', brainstormText);
            
            for (let i = 2; i <= 5; i++) {
                await page.click('button[type="submit"]');
                await page.waitForSelector(`#brainstormStep${i}Input`);
                await page.type(`#brainstormStep${i}Input`, `${brainstormText} - Step ${i}`);
            }
            await page.click('button[type="submit"]');

            // 2. Verify redirect to Task List (no automatic tasks expected)
            await page.waitForSelector('#taskListContainer', { visible: true });
            
            // 3. Navigate back to Brainstorm step 5 to create task explicitly
            await navigateViaMenu(page, 'Step 5: Interfere');
            await page.waitForSelector('#taskContentInput', { visible: true });
            
            // 4. Use explicit task creation UI
            await page.type('#taskContentInput', taskDescription);
            await page.type('#taskPersonInput', 'Test User');
            await page.click('button[onclick="createTaskFromCurrentStep()"]');
            
            // 5. Navigate to Task List and verify explicit task creation
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('#taskListContainer', { visible: true });
            await page.waitForSelector('#taskList');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const taskExists = await page.evaluate((description) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent);
                return taskTexts.some(taskText => taskText.includes(description));
            }, taskDescription);
            
            expect(taskExists).toBe(true);

            // 6. Test export functionality
            await navigateViaMenu(page, 'Step 5: Interfere');
            await page.waitForSelector('button[onclick="copyBrainstormResults()"]', { visible: true });
            await page.waitForSelector('button[onclick="downloadBrainstormResults()"]', { visible: true });
            
            const exportButtonsWork = await page.evaluate(() => {
                try {
                    const copyBtn = document.querySelector('button[onclick="copyBrainstormResults()"]');
                    const downloadBtn = document.querySelector('button[onclick="downloadBrainstormResults()"]');
                    return copyBtn && downloadBtn && 
                           typeof window.copyBrainstormResults === 'function' && 
                           typeof window.downloadBrainstormResults === 'function';
                } catch (error) {
                    console.error('Export button test failed:', error);
                    return false;
                }
            });
            
            expect(exportButtonsWork).toBe(true);

        } catch (error) {
            console.error('--- DIAGNOSTIC FAILURE CAPTURE (Mixed Path Journey) ---');
            await page.screenshot({ path: 'tests/debug_FAIL_mixed_path_screenshot.png', fullPage: true });
            const html = await page.content();
            console.error(`HTML at time of failure:\n${html}`);
            throw error;
        }
        // 1. Define test data
        const step1Text = 'Test data for step 1: Imitate/Trends';
        const step2Text = 'Test data for step 2: Combine';
        const step3Text = 'Test data for step 3: Magnify';
        const step4Text = 'Test data for step 4: Modify';
        const step5Text = 'Test data for step 5: Eliminate';

        try {
            // 2. Navigate and fill out the Brainstorm form
            await page.goto(`${serverUrl}/brainstorm_step1.html`);
            await page.waitForSelector('#brainstormStep1Input', { visible: true });
            await page.type('#brainstormStep1Input', step1Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#brainstormStep2Input', { visible: true });
            await page.type('#brainstormStep2Input', step2Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#brainstormStep3Input', { visible: true });
            await page.type('#brainstormStep3Input', step3Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#brainstormStep4Input', { visible: true });
            await page.type('#brainstormStep4Input', step4Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#brainstormStep5Input', { visible: true });
            await page.type('#brainstormStep5Input', step5Text);

            // 3. Submit the final form to complete the journey and trigger redirect
            await page.click('button[type="submit"]');
            await page.waitForSelector('#taskListContainer', { visible: true }); // Wait for redirect

            // 4. Navigate back to Brainstorm step 5 to test export functionality
            await navigateViaMenu(page, 'Step 5: Interfere');
            await page.waitForSelector('button[onclick="copyBrainstormResults()"]', { visible: true });
            await page.waitForSelector('button[onclick="downloadBrainstormResults()"]', { visible: true });
            
            // 7. Test export buttons are clickable (basic functionality test)
            const exportButtonsWork = await page.evaluate(() => {
                try {
                    // Test that the functions exist and don't throw errors
                    const copyBtn = document.querySelector('button[onclick="copyBrainstormResults()"]');
                    const downloadBtn = document.querySelector('button[onclick="downloadBrainstormResults()"]');
                    return copyBtn && downloadBtn && 
                           typeof window.copyBrainstormResults === 'function' && 
                           typeof window.downloadBrainstormResults === 'function';
                } catch (error) {
                    console.error('Export button test failed:', error);
                    return false;
                }
            });
            
            expect(exportButtonsWork).toBe(true);

        } catch (error) {
            console.error('--- DIAGNOSTIC FAILURE CAPTURE (Brainstorm Journey) ---');
            await page.screenshot({ path: 'tests/debug_FAIL_brainstorm_screenshot.png', fullPage: true });
            const html = await page.content();
            console.error(`HTML at time of failure:\n${html}`);
            throw error;
        }
    }, 90000); // 90s timeout for the full journey

    it('should complete the Choose Your Top Priorities journey and create tasks explicitly', async () => {
        page.on('dialog', async dialog => {
            await dialog.dismiss();
        });
        
        const step1Text = 'Choose test data step 1: Criteria';
        const step2Text = 'Choose test data step 2: Options';
        const step3Text = 'Choose test data step 3: Decide';
        const step4Text = 'Choose test data step 4: Who';
        const step5Text = 'Choose test data step 5: When';
        const taskDescription = 'Execute chosen decision from step 5';

        try {
            // 1. Navigate and fill out the Choose form
            await navigateViaMenu(page, 'Step 1: Scenarios');
            await page.waitForSelector('#chooseStep1Input', { visible: true });
            await page.type('#chooseStep1Input', step1Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#chooseStep2Input', { visible: true });
            await page.type('#chooseStep2Input', step2Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#chooseStep3Input', { visible: true });
            await page.type('#chooseStep3Input', step3Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#chooseStep4Input', { visible: true });
            await page.type('#chooseStep4Input', step4Text);
            await page.click('button[type="submit"]');
            await page.waitForSelector('#chooseStep5Input', { visible: true });
            await page.type('#chooseStep5Input', step5Text);

            // 2. Submit the final form to complete the journey
            await page.click('button[type="submit"]');
            await page.waitForSelector('#taskListContainer', { visible: true });

            // 3. Navigate back to Choose step 5 to create task explicitly
            await navigateViaMenu(page, 'Step 5: Support Decision');
            await page.waitForSelector('#taskContentInput', { visible: true });
            
            // 4. Use explicit task creation UI
            await page.type('#taskContentInput', taskDescription);
            await page.type('#taskPersonInput', 'Test User');
            await page.click('button[onclick="createTaskFromCurrentStep()"]');
            
            // 5. Navigate to Task List and verify explicit task creation
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('#taskListContainer', { visible: true });
            await page.waitForSelector('#taskList');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const taskExists = await page.evaluate((description) => {
                const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent.trim());
                return taskTexts.some(taskText => taskText.includes(description));
            }, taskDescription);
            
            expect(taskExists).toBe(true);
            
            // 5. Navigate back to Choose step 5 to test export functionality
            await navigateViaMenu(page, 'Step 5: Support Decision');
            await page.waitForSelector('button[onclick="copyChooseResults()"]', { visible: true });
            await page.waitForSelector('button[onclick="downloadChooseResults()"]', { visible: true });
            
            // 6. Test export buttons are clickable (basic functionality test)
            const exportButtonsWork = await page.evaluate(() => {
                try {
                    const copyBtn = document.querySelector('button[onclick="copyChooseResults()"]');
                    const downloadBtn = document.querySelector('button[onclick="downloadChooseResults()"]');
                    return copyBtn && downloadBtn && 
                           typeof window.copyChooseResults === 'function' && 
                           typeof window.downloadChooseResults === 'function';
                } catch (error) {
                    console.error('Choose export button test failed:', error);
                    return false;
                }
            });
            
            expect(exportButtonsWork).toBe(true);
            
            // 7. Test Task List Full Project Export
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('button[onclick="downloadFullProject()"]', { visible: true });
            
            const fullProjectExportWorks = await page.evaluate(() => {
                try {
                    const fullProjectBtn = document.querySelector('button[onclick="downloadFullProject()"]');
                    return fullProjectBtn && typeof window.downloadFullProject === 'function';
                } catch (error) {
                    console.error('Full project export test failed:', error);
                    return false;
                }
            });
            
            expect(fullProjectExportWorks).toBe(true);

        } catch (error) {
            console.error('--- DIAGNOSTIC FAILURE CAPTURE (Choose Journey) ---');
            await page.screenshot({ path: 'tests/debug_FAIL_choose_screenshot.png', fullPage: true });
            const html = await page.content();
            console.error(`HTML at time of failure:\n${html}`);
            throw error;
        }
    }, 90000); // 90s timeout for the full journey

    it('should handle a mixed path journey with explicit task creation and maintain state', async () => {
        page.on('dialog', async dialog => {
            await dialog.dismiss();
        });
        
        const brainstormText = 'Mixed Path Brainstorm Task';
        const chooseText = 'Mixed Path Choose Task';
        const objectivesText = 'Mixed Path Objectives Task';
        const brainstormTaskDesc = 'Action item from brainstorming session';
        const chooseTaskDesc = 'Action item from decision making';

        try {
            // 1. Complete Objectives journey
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('a[href="objectives_step1.html"].btn.btn-success');
            await page.click('a[href="objectives_step1.html"].btn.btn-success');
            
            await page.waitForSelector('#objectivesStep1Input', { visible: true });
            await page.type('#objectivesStep1Input', objectivesText);
            
            await navigateViaMenu(page, 'Step 7: Cooperation');
            await page.waitForSelector('#objectivesStep7Input', { visible: true });
            await page.type('#objectivesStep7Input', 'Mixed path cooperation test');
            
            // 2. Test Objectives export functionality
            await page.waitForSelector('button[onclick="copyObjectivesResults()"]', { visible: true });
            await page.waitForSelector('button[onclick="downloadObjectivesResults()"]', { visible: true });
            
            const objectivesExportWorks = await page.evaluate(() => {
                try {
                    const copyBtn = document.querySelector('button[onclick="copyObjectivesResults()"]');
                    const downloadBtn = document.querySelector('button[onclick="downloadObjectivesResults()"]');
                    return copyBtn && downloadBtn && 
                           typeof window.copyObjectivesResults === 'function' && 
                           typeof window.downloadObjectivesResults === 'function';
                } catch (error) {
                    console.error('Objectives export test failed:', error);
                    return false;
                }
            });
            
            expect(objectivesExportWorks).toBe(true);
            
            // 3. Complete Brainstorm Journey
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('a[href="brainstorm_step1.html"].btn.btn-warning');
            await page.click('a[href="brainstorm_step1.html"].btn.btn-warning');

            await page.waitForSelector('#brainstormStep1Input');
            await page.type('#brainstormStep1Input', brainstormText);
            for (let i = 2; i <= 5; i++) {
                await page.click('button[type="submit"]');
                await page.waitForSelector(`#brainstormStep${i}Input`);
                await page.type(`#brainstormStep${i}Input`, `${brainstormText} - Step ${i}`);
            }
            await page.click('button[type="submit"]');

            // 4. Create explicit task from Brainstorm
            await navigateViaMenu(page, 'Step 5: Interfere');
            await page.waitForSelector('#taskContentInput', { visible: true });
            await page.type('#taskContentInput', brainstormTaskDesc);
            await page.click('button[onclick="createTaskFromCurrentStep()"]');

            // 5. Complete Choose Journey
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('a[href="choose_step1.html"].btn.btn-info');
            await page.click('a[href="choose_step1.html"].btn.btn-info');

            await page.waitForSelector('#chooseStep1Input');
            await page.type('#chooseStep1Input', chooseText);
            for (let i = 2; i <= 5; i++) {
                await page.click('button[type="submit"]');
                await page.waitForSelector(`#chooseStep${i}Input`);
                await page.type(`#chooseStep${i}Input`, `${chooseText} - Step ${i}`);
            }
            await page.click('button[type="submit"]');

            // 6. Create explicit task from Choose
            await navigateViaMenu(page, 'Step 5: Support Decision');
            await page.waitForSelector('#taskContentInput', { visible: true });
            await page.type('#taskContentInput', chooseTaskDesc);
            await page.click('button[onclick="createTaskFromCurrentStep()"]');

            // 7. Verify both explicit tasks exist in Task List
            await navigateViaMenu(page, 'Task List');
            await page.waitForSelector('#taskListContainer', { visible: true });
            await page.waitForSelector('#taskList');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const allTasksExist = await page.evaluate((bTaskDesc, cTaskDesc) => {
                try {
                    const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent.trim());
                    return taskTexts.some(text => text.includes(bTaskDesc)) && 
                           taskTexts.some(text => text.includes(cTaskDesc));
                } catch (error) {
                    return false;
                }
            }, brainstormTaskDesc, chooseTaskDesc);
            
            expect(allTasksExist).toBe(true);
            
        } catch (error) {
            console.error('--- DIAGNOSTIC FAILURE CAPTURE (Mixed Path Journey) ---');
            await page.screenshot({ path: 'tests/debug_FAIL_mixed_path_screenshot.png', fullPage: true });
            const html = await page.content();
            console.error(`HTML at time of failure:\n${html}`);
            throw error;
        }
    }, 90000);
});
