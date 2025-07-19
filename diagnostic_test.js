// Diagnostic test to isolate Brainstorm vs Choose data persistence issue
const puppeteer = require('puppeteer');

async function runDiagnostic() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const serverUrl = 'http://127.0.0.1:5000';
    
    console.log('=== DIAGNOSTIC: Testing Brainstorm Data Persistence ===');
    
    // 1. Navigate to Brainstorm step 5
    await page.goto(`${serverUrl}/brainstorm_step5.html`);
    await page.waitForSelector('#brainstormStep5Input', { visible: true });
    
    // 2. Fill in test data
    const testData = 'DIAGNOSTIC TEST DATA';
    await page.type('#brainstormStep5Input', testData);
    
    // 3. Submit form and capture localStorage before redirect
    await page.evaluate(() => {
        // Capture localStorage state before form submission
        const beforeSubmit = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
        console.log('BEFORE SUBMIT:', beforeSubmit);
        
        // Submit form manually to see what happens
        document.getElementById('brainstormStep5Form').dispatchEvent(new Event('submit'));
        
        // Capture localStorage state after form submission
        const afterSubmit = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
        console.log('AFTER SUBMIT:', afterSubmit);
        
        return { beforeSubmit, afterSubmit };
    });
    
    // 4. Wait for redirect and check final state
    await page.waitForSelector('#taskListContainer', { visible: true });
    
    const finalState = await page.evaluate(() => {
        const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
        return {
            taskListLength: sessionData.taskList ? sessionData.taskList.length : 0,
            taskListItems: sessionData.taskList || [],
            brainstormData: sessionData.brainstorm || {}
        };
    });
    
    console.log('FINAL STATE:', JSON.stringify(finalState, null, 2));
    
    await browser.close();
}

runDiagnostic().catch(console.error);
