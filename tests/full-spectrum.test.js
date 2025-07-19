const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { clickAndNavigate, navigateViaMenu } = require('./test-utils');

describe('Full-Spectrum Application Test', () => {
    let browser;
    let page;
    const serverUrl = 'http://127.0.0.1:8080';
    const downloadsPath = path.resolve(__dirname, 'downloads');

    // Extended timeout for complex tests
    jest.setTimeout(300000); // 5 minutes

    beforeAll(async () => {
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Ensure the downloads directory exists and is clean
        if (fs.existsSync(downloadsPath)) {
            fs.rmSync(downloadsPath, { recursive: true, force: true });
        }
        fs.mkdirSync(downloadsPath, { recursive: true });
    }, 30000);

    afterAll(async () => {
        if (browser) await browser.close();
    }, 30000);

    beforeEach(async () => {
        page = await browser.newPage();
        // Disable cache to ensure fresh content
        await page.setCacheEnabled(false);
        // Clear local storage before each test
        await page.goto(serverUrl); // Initial page load - keep as goto
        await page.evaluate(() => localStorage.clear());
    }, 30000);

    afterEach(async () => {
        if (page) await page.close();
    }, 30000);

    // Utility function for robust sidebar navigation
    async function openSidebarAndNavigate(targetHref) {
        try {
            // Wait for page to be fully loaded
            await page.waitForSelector('#sidebarToggleBtn', { visible: true, timeout: 10000 });
            
            // Open sidebar using direct DOM manipulation (headless-safe)
            await page.evaluate(() => {
                const toggleBtn = document.querySelector('#sidebarToggleBtn');
                if (toggleBtn) {
                    toggleBtn.click();
                } else {
                    throw new Error('Sidebar toggle button not found');
                }
            });

            // Wait for sidebar to be visible
            await page.waitForFunction(() => {
                return document.body.classList.contains('sidebar-visible');
            }, { timeout: 5000 });

            // Click the target navigation link using direct DOM manipulation
            const navigationSuccess = await page.evaluate((href) => {
                const navLink = document.querySelector(`a.nav-link[href="${href}"]`);
                if (navLink) {
                    navLink.click();
                    return true;
                }
                return false;
            }, targetHref);

            if (!navigationSuccess) {
                throw new Error(`Navigation link not found: ${targetHref}`);
            }

            // Wait for navigation to complete
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
            
            return true;
        } catch (error) {
            // Capture screenshot on navigation failure
            const timestamp = Date.now();
            await page.screenshot({ 
                path: `${downloadsPath}/nav-error-${timestamp}.png`,
                fullPage: true 
            });
            throw new Error(`Navigation failed for ${targetHref}: ${error.message}`);
        }
    }

    // Utility function to verify page loaded correctly
    async function verifyPageLoaded(expectedUrl) {
        const currentUrl = page.url();
        const urlMatches = currentUrl.includes(expectedUrl);
        
        // Verify page has basic structure
        const hasBasicStructure = await page.evaluate(() => {
            return document.querySelector('body') && 
                   document.querySelector('#sidebarToggleBtn') &&
                   document.title.length > 0;
        });

        if (!urlMatches) {
            throw new Error(`URL mismatch. Expected: ${expectedUrl}, Actual: ${currentUrl}`);
        }
        
        if (!hasBasicStructure) {
            throw new Error(`Page structure incomplete for: ${expectedUrl}`);
        }

        return true;
    }

    describe('FV.1: Navigation Integrity Test', () => {
        it('should navigate through all pages using hamburger menu without errors', async () => {
            // Define complete navigation sequence
            const navigationSequence = [
                // Start at Home
                { name: 'Home', href: 'index.html' },
                
                // Brainstorm Module (5 steps)
                { name: 'Brainstorm Step 1', href: 'brainstorm_step1.html' },
                { name: 'Brainstorm Step 2', href: 'brainstorm_step2.html' },
                { name: 'Brainstorm Step 3', href: 'brainstorm_step3.html' },
                { name: 'Brainstorm Step 4', href: 'brainstorm_step4.html' },
                { name: 'Brainstorm Step 5', href: 'brainstorm_step5.html' },
                
                // Choose Module (5 steps)
                { name: 'Choose Step 1', href: 'choose_step1.html' },
                { name: 'Choose Step 2', href: 'choose_step2.html' },
                { name: 'Choose Step 3', href: 'choose_step3.html' },
                { name: 'Choose Step 4', href: 'choose_step4.html' },
                { name: 'Choose Step 5', href: 'choose_step5.html' },
                
                // Objectives Module (7 steps)
                { name: 'Objectives Step 1', href: 'objectives_step1.html' },
                { name: 'Objectives Step 2', href: 'objectives_step2.html' },
                { name: 'Objectives Step 3', href: 'objectives_step3.html' },
                { name: 'Objectives Step 4', href: 'objectives_step4.html' },
                { name: 'Objectives Step 5', href: 'objectives_step5.html' },
                { name: 'Objectives Step 6', href: 'objectives_step6.html' },
                { name: 'Objectives Step 7', href: 'objectives_step7.html' },
                
                // Task Management
                { name: 'Task List', href: 'TaskListPage.html' },
                
                // Return to Home
                { name: 'Home (Return)', href: 'index.html' }
            ];

            console.log(`Starting navigation test through ${navigationSequence.length} pages...`);

            // Navigate to starting page
            // Start from home page (already loaded in beforeEach)
            await page.waitForSelector('#sidebarToggleBtn', { visible: true });
            await verifyPageLoaded('index.html');
            
            let successCount = 0;
            
            // Navigate through each page in sequence
            for (let i = 0; i < navigationSequence.length; i++) {
                const step = navigationSequence[i];
                
                try {
                    console.log(`[${i + 1}/${navigationSequence.length}] Navigating to: ${step.name}`);
                    
                    // Skip first step since we're already on index.html
                    if (i > 0) {
                        await openSidebarAndNavigate(step.href);
                    }
                    
                    // Verify successful navigation
                    await verifyPageLoaded(step.href);
                    
                    // Verify hamburger menu is present and functional on this page
                    const hamburgerExists = await page.$('#sidebarToggleBtn');
                    expect(hamburgerExists).toBeTruthy();
                    
                    successCount++;
                    console.log(`✓ Successfully navigated to: ${step.name}`);
                    
                } catch (error) {
                    console.error(`✗ Navigation failed for ${step.name}: ${error.message}`);
                    throw error;
                }
            }

            // Final verification
            expect(successCount).toBe(navigationSequence.length);
            console.log(`🎯 Navigation Integrity Test PASSED: ${successCount}/${navigationSequence.length} pages successfully navigated`);
            
        }, 180000); // 3 minutes timeout for this comprehensive test
    });

    // Utility function for completing a module journey with data input
    async function completeModuleJourney(moduleName, steps, baseText) {
        const results = [];
        
        for (let i = 1; i <= steps; i++) {
            const stepText = `${baseText} - Step ${i} Data`;
            const inputSelector = `#${moduleName}Step${i}Input`;
            
            console.log(`  Filling ${moduleName} Step ${i} with: "${stepText}"`);
            
            // Wait for input field and fill it
            await page.waitForSelector(inputSelector, { visible: true, timeout: 10000 });
            
            // Clear existing content and type new text
            await page.evaluate((selector) => {
                const input = document.querySelector(selector);
                if (input) {
                    input.value = '';
                    input.focus();
                }
            }, inputSelector);
            await page.type(inputSelector, stepText);
            
            // Store what we entered for verification
            results.push({ step: i, text: stepText });
            
            // Submit form to proceed to next step (except on last step)
            if (i < steps) {
                // Use Promise.all to handle client-side redirects
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
                    page.click('button[type="submit"]')
                ]);
            }
        }
        
        // Submit final step (handles alert and redirect to TaskListPage)
        const dialogHandler = async (dialog) => {
            console.log(`  Alert received: ${dialog.message()}`);
            await dialog.accept();
            page.off('dialog', dialogHandler); // Remove handler after use
        };
        
        page.on('dialog', dialogHandler);
        
        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
                page.click('button[type="submit"]')
            ]);
        } catch (error) {
            // Some modules might not redirect, just save data
            console.log(`  No navigation detected for final step, continuing...`);
            await page.click('button[type="submit"]');
            // Wait a moment for any processing
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Clean up dialog handler
        page.off('dialog', dialogHandler);
        
        return results;
    }

    // Utility function to verify localStorage data
    async function verifySessionData(expectedData) {
        const sessionData = await page.evaluate(() => {
            const data = localStorage.getItem('objectiveBuilderSession');
            return data ? JSON.parse(data) : null;
        });
        
        if (!sessionData) {
            throw new Error('No session data found in localStorage');
        }
        
        // Verify each module's data
        for (const [moduleName, moduleData] of Object.entries(expectedData)) {
            if (!sessionData[moduleName]) {
                throw new Error(`Module '${moduleName}' not found in session data`);
            }
            
            for (const [stepKey, expectedText] of Object.entries(moduleData)) {
                const actualText = sessionData[moduleName][stepKey];
                if (actualText !== expectedText) {
                    throw new Error(`Data mismatch in ${moduleName}.${stepKey}. Expected: "${expectedText}", Actual: "${actualText}"`);
                }
            }
        }
        
        return sessionData;
    }

    describe('FV.2: Data Persistence & Module Flow Test', () => {
        it('should complete all three modules and persist data correctly in localStorage', async () => {
            console.log('🚀 Starting comprehensive data persistence test...');
            
            // Clear session to start fresh
            await page.evaluate(() => {
                localStorage.removeItem('objectiveBuilderSession');
            });
            
            const testData = {
                brainstorm: 'FV2-Brainstorm-Data',
                choose: 'FV2-Choose-Data', 
                objectives: 'FV2-Objectives-Data'
            };
            
            let expectedSessionData = {};
            
            // PHASE 1: Complete Brainstorm Journey (5 steps)
            console.log('📝 Phase 1: Completing Brainstorm Module (5 steps)...');
            await navigateViaMenu(page, 'Step 1: Imitate');
            
            const brainstormResults = await completeModuleJourney('brainstorm', 5, testData.brainstorm);
            
            // Build expected data structure for Brainstorm
            expectedSessionData.brainstorm = {};
            brainstormResults.forEach(result => {
                expectedSessionData.brainstorm[`step${result.step}`] = result.text;
            });
            
            // Verify Brainstorm data persistence
            console.log('✓ Verifying Brainstorm data persistence...');
            await verifySessionData({ brainstorm: expectedSessionData.brainstorm });
            console.log('✅ Brainstorm module data verified in localStorage');
            
            // PHASE 2: Complete Choose Journey (5 steps)
            console.log('📝 Phase 2: Completing Choose Module (5 steps)...');
            await navigateViaMenu(page, 'Step 1: Scenarios');
            
            const chooseResults = await completeModuleJourney('choose', 5, testData.choose);
            
            // Build expected data structure for Choose
            expectedSessionData.choose = {};
            chooseResults.forEach(result => {
                expectedSessionData.choose[`step${result.step}`] = result.text;
            });
            
            // Verify Choose data persistence (should include both Brainstorm and Choose)
            console.log('✓ Verifying Choose data persistence...');
            await verifySessionData({
                brainstorm: expectedSessionData.brainstorm,
                choose: expectedSessionData.choose
            });
            console.log('✅ Choose module data verified in localStorage');
            
            // PHASE 3: Complete Objectives Journey (7 steps)
            console.log('📝 Phase 3: Completing Objectives Module (7 steps)...');
            await navigateViaMenu(page, 'Step 1: Objective');
            
            const objectivesResults = await completeModuleJourney('objectives', 7, testData.objectives);
            
            // Build expected data structure for Objectives
            expectedSessionData.objectives = {};
            objectivesResults.forEach(result => {
                expectedSessionData.objectives[`step${result.step}`] = result.text;
            });
            
            // FINAL VERIFICATION: All three modules should be persisted
            console.log('✓ Verifying complete session data persistence...');
            const finalSessionData = await verifySessionData(expectedSessionData);
            console.log('✅ All module data verified in localStorage');
            
            // VERIFICATION SUMMARY
            const totalSteps = brainstormResults.length + chooseResults.length + objectivesResults.length;
            console.log(`🎯 Data Persistence Test PASSED:`);
            console.log(`   • Brainstorm: ${brainstormResults.length} steps completed and persisted`);
            console.log(`   • Choose: ${chooseResults.length} steps completed and persisted`);
            console.log(`   • Objectives: ${objectivesResults.length} steps completed and persisted`);
            console.log(`   • Total: ${totalSteps} steps with data successfully persisted`);
            
            // Verify session structure integrity
            expect(finalSessionData.brainstorm).toBeDefined();
            expect(finalSessionData.choose).toBeDefined();
            expect(finalSessionData.objectives).toBeDefined();
            expect(finalSessionData.taskList).toBeDefined();
            
            // Verify all expected data is present
            expect(Object.keys(finalSessionData.brainstorm)).toHaveLength(5);
            expect(Object.keys(finalSessionData.choose)).toHaveLength(5);
            expect(Object.keys(finalSessionData.objectives)).toHaveLength(7);
            
            console.log('🏆 Data Persistence & Module Flow Test COMPLETED SUCCESSFULLY');
            
        }, 240000); // 4 minutes timeout for comprehensive test
    });

    // Utility function to verify export functionality on a page
    async function verifyExportFunctionality(pageName, exportFunctions) {
        const results = [];
        
        for (const exportFunc of exportFunctions) {
            console.log(`  Testing ${exportFunc.name} on ${pageName}...`);
            
            // Check if export button exists
            const buttonExists = await page.$(exportFunc.buttonSelector);
            if (!buttonExists) {
                throw new Error(`Export button not found: ${exportFunc.buttonSelector} on ${pageName}`);
            }
            
            // Verify export function exists in window scope
            const functionExists = await page.evaluate((funcName) => {
                return typeof window[funcName] === 'function';
            }, exportFunc.functionName);
            
            if (!functionExists) {
                throw new Error(`Export function not found: ${exportFunc.functionName} on ${pageName}`);
            }
            
            // Test the export functionality
            if (exportFunc.type === 'download') {
                // For download functions, verify they create proper data URIs
                const downloadTest = await page.evaluate((funcName) => {
                    try {
                        // Mock the link creation to capture the data
                        const originalCreateElement = document.createElement;
                        const originalAlert = window.alert;
                        let capturedData = null;
                        
                        // Mock alert to prevent popup
                        window.alert = function() { /* silent */ };
                        
                        document.createElement = function(tagName) {
                            const element = originalCreateElement.call(document, tagName);
                            if (tagName === 'a') {
                                const originalSetAttribute = element.setAttribute;
                                element.setAttribute = function(name, value) {
                                    if (name === 'href' && value.startsWith('data:')) {
                                        capturedData = value;
                                    }
                                    return originalSetAttribute.call(this, name, value);
                                };
                                element.click = function() {
                                    // Prevent actual download in test
                                    return true;
                                };
                            }
                            return element;
                        };
                        
                        // Call the export function
                        window[funcName]();
                        
                        // Restore original functions
                        document.createElement = originalCreateElement;
                        window.alert = originalAlert;
                        
                        return {
                            success: capturedData !== null,
                            dataUri: capturedData,
                            hasValidJson: capturedData && capturedData.includes('data:application/json')
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }, exportFunc.functionName);
                
                if (!downloadTest.success) {
                    throw new Error(`Download test failed for ${exportFunc.functionName}: ${downloadTest.error || 'Unknown error'}`);
                }
                
                results.push({
                    name: exportFunc.name,
                    type: 'download',
                    success: true,
                    hasValidData: downloadTest.hasValidJson
                });
                
            } else if (exportFunc.type === 'copy') {
                // For copy functions, verify they work with clipboard API
                const copyTest = await page.evaluate(async (funcName) => {
                    try {
                        // Mock clipboard API
                        let clipboardContent = null;
                        const originalWriteText = navigator.clipboard.writeText;
                        navigator.clipboard.writeText = function(text) {
                            clipboardContent = text;
                            return Promise.resolve();
                        };
                        
                        // Mock alert to prevent popup
                        const originalAlert = window.alert;
                        window.alert = function() { /* silent */ };
                        
                        // Call the export function
                        await window[funcName]();
                        
                        // Restore original functions
                        navigator.clipboard.writeText = originalWriteText;
                        window.alert = originalAlert;
                        
                        return {
                            success: clipboardContent !== null,
                            contentLength: clipboardContent ? clipboardContent.length : 0,
                            hasMarkdown: clipboardContent && clipboardContent.includes('#')
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }, exportFunc.functionName);
                
                if (!copyTest.success) {
                    throw new Error(`Copy test failed for ${exportFunc.functionName}: ${copyTest.error || 'Unknown error'}`);
                }
                
                results.push({
                    name: exportFunc.name,
                    type: 'copy',
                    success: true,
                    contentLength: copyTest.contentLength,
                    hasMarkdown: copyTest.hasMarkdown
                });
            }
            
            console.log(`    ✓ ${exportFunc.name} verified successfully`);
        }
        
        return results;
    }

    describe('FV.3: Export Functionality Verification', () => {
        it('should verify all export functionality across all modules and pages', async () => {
            console.log('📁 Starting comprehensive export functionality verification...');
            
            // First, populate the session with test data (reuse from FV.2 test data)
            await page.evaluate(() => {
                const testSessionData = {
                    brainstorm: {
                        step1: "FV3-Brainstorm-Step1-Data",
                        step2: "FV3-Brainstorm-Step2-Data",
                        step3: "FV3-Brainstorm-Step3-Data",
                        step4: "FV3-Brainstorm-Step4-Data",
                        step5: "FV3-Brainstorm-Step5-Data"
                    },
                    choose: {
                        step1: "FV3-Choose-Step1-Data",
                        step2: "FV3-Choose-Step2-Data",
                        step3: "FV3-Choose-Step3-Data",
                        step4: "FV3-Choose-Step4-Data",
                        step5: "FV3-Choose-Step5-Data"
                    },
                    objectives: {
                        step1: "FV3-Objectives-Step1-Data",
                        step2: "FV3-Objectives-Step2-Data",
                        step3: "FV3-Objectives-Step3-Data",
                        step4: "FV3-Objectives-Step4-Data",
                        step5: "FV3-Objectives-Step5-Data",
                        step6: "FV3-Objectives-Step6-Data",
                        step7: "FV3-Objectives-Step7-Data"
                    },
                    taskList: [],
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('objectiveBuilderSession', JSON.stringify(testSessionData));
            });
            
            let allExportResults = [];
            
            // PHASE 1: Test Brainstorm Module Exports (brainstorm_step5.html)
            console.log('📝 Phase 1: Testing Brainstorm Module Exports...');
            await navigateViaMenu(page, 'Step 5: Interfere');
            
            const brainstormExports = [
                {
                    name: 'Brainstorm Copy Markdown',
                    buttonSelector: 'button[onclick="copyBrainstormResults()"]',
                    functionName: 'copyBrainstormResults',
                    type: 'copy'
                },
                {
                    name: 'Brainstorm Download JSON',
                    buttonSelector: 'button[onclick="downloadBrainstormResults()"]',
                    functionName: 'downloadBrainstormResults',
                    type: 'download'
                }
            ];
            
            const brainstormResults = await verifyExportFunctionality('brainstorm_step5.html', brainstormExports);
            allExportResults.push(...brainstormResults);
            console.log('✅ Brainstorm module exports verified');
            
            // PHASE 2: Test Choose Module Exports (choose_step5.html)
            console.log('📝 Phase 2: Testing Choose Module Exports...');
            await navigateViaMenu(page, 'Step 5: Support Decision');
            
            const chooseExports = [
                {
                    name: 'Choose Copy Markdown',
                    buttonSelector: 'button[onclick="copyChooseResults()"]',
                    functionName: 'copyChooseResults',
                    type: 'copy'
                },
                {
                    name: 'Choose Download JSON',
                    buttonSelector: 'button[onclick="downloadChooseResults()"]',
                    functionName: 'downloadChooseResults',
                    type: 'download'
                }
            ];
            
            const chooseResults = await verifyExportFunctionality('choose_step5.html', chooseExports);
            allExportResults.push(...chooseResults);
            console.log('✅ Choose module exports verified');
            
            // PHASE 3: Test Objectives Module Exports (objectives_step7.html)
            console.log('📝 Phase 3: Testing Objectives Module Exports...');
            await navigateViaMenu(page, 'Step 7: Cooperation');
            
            const objectivesExports = [
                {
                    name: 'Objectives Copy Markdown',
                    buttonSelector: 'button[onclick="copyObjectivesResults()"]',
                    functionName: 'copyObjectivesResults',
                    type: 'copy'
                },
                {
                    name: 'Objectives Download JSON',
                    buttonSelector: 'button[onclick="downloadObjectivesResults()"]',
                    functionName: 'downloadObjectivesResults',
                    type: 'download'
                }
            ];
            
            const objectivesResults = await verifyExportFunctionality('objectives_step7.html', objectivesExports);
            allExportResults.push(...objectivesResults);
            console.log('✅ Objectives module exports verified');
            
            // PHASE 4: Test Full Project Export (TaskListPage.html)
            console.log('📝 Phase 4: Testing Full Project Export...');
            await navigateViaMenu(page, 'Task List');
            
            // Set up dialog handler for full project export alert
            const fullProjectDialogHandler = async (dialog) => {
                console.log(`  Full Project Alert: ${dialog.message()}`);
                await dialog.accept();
                page.off('dialog', fullProjectDialogHandler);
            };
            page.on('dialog', fullProjectDialogHandler);
            
            const fullProjectExports = [
                {
                    name: 'Full Project Download JSON',
                    buttonSelector: 'button[onclick="downloadFullProject()"]',
                    functionName: 'downloadFullProject',
                    type: 'download'
                }
            ];
            
            const fullProjectResults = await verifyExportFunctionality('TaskListPage.html', fullProjectExports);
            allExportResults.push(...fullProjectResults);
            
            // Clean up dialog handler
            page.off('dialog', fullProjectDialogHandler);
            console.log('✅ Full project export verified');
            
            // FINAL VERIFICATION SUMMARY
            const totalExports = allExportResults.length;
            const successfulExports = allExportResults.filter(r => r.success).length;
            const downloadExports = allExportResults.filter(r => r.type === 'download').length;
            const copyExports = allExportResults.filter(r => r.type === 'copy').length;
            
            console.log(`🎯 Export Functionality Test PASSED:`);
            console.log(`   • Total exports tested: ${totalExports}`);
            console.log(`   • Successful exports: ${successfulExports}`);
            console.log(`   • Download functions: ${downloadExports}`);
            console.log(`   • Copy functions: ${copyExports}`);
            console.log(`   • Module-specific exports: ${totalExports - 1}`);
            console.log(`   • Full project export: 1`);
            
            // Verify all exports succeeded
            expect(successfulExports).toBe(totalExports);
            expect(totalExports).toBe(7); // 2 per module (3 modules) + 1 full project
            
            // Verify we have the right mix of export types
            expect(downloadExports).toBe(4); // 1 per module + 1 full project
            expect(copyExports).toBe(3); // 1 per module
            
            console.log('🏆 Export Functionality Verification COMPLETED SUCCESSFULLY');
        }, 180000); // 3 minutes timeout for comprehensive export testing
    });

    describe('FV.4: Task U.2 Data Loss Prevention Test', () => {
        it('should preserve form data when navigating away and back via hamburger menu', async () => {
            console.log('🛡️ Testing Task U.2: Data Loss Prevention on Menu Navigation...');
            
            // Step 1: Navigate to brainstorm_step1.html
            console.log('Step 1: Navigating to brainstorm_step1.html');
            await page.goto(`${serverUrl}/brainstorm_step1.html`);
            await verifyPageLoaded('/brainstorm_step1.html');
            
            // Step 2: Type unique text into the input field
            const uniqueTestData = `Task U.2 Test Data - ${Date.now()}`;
            console.log(`Step 2: Entering unique test data: "${uniqueTestData}"`);
            
            await page.waitForSelector('#brainstormStep1Input', { visible: true, timeout: 10000 });
            await page.focus('#brainstormStep1Input');
            await page.type('#brainstormStep1Input', uniqueTestData);
            
            // Verify data was entered
            const enteredData = await page.$eval('#brainstormStep1Input', el => el.value);
            expect(enteredData).toBe(uniqueTestData);
            console.log('✅ Data successfully entered into form field');
            
            // Step 3: Navigate to a different page using hamburger menu
            console.log('Step 3: Navigating to brainstorm_step2.html via hamburger menu');
            await openSidebarAndNavigate('brainstorm_step2.html');
            await verifyPageLoaded('/brainstorm_step2.html');
            console.log('✅ Successfully navigated to step 2 via hamburger menu');
            
            // Step 4: Navigate back to the original page via hamburger menu
            console.log('Step 4: Navigating back to brainstorm_step1.html via hamburger menu');
            await openSidebarAndNavigate('brainstorm_step1.html');
            await verifyPageLoaded('/brainstorm_step1.html');
            console.log('✅ Successfully navigated back to step 1 via hamburger menu');
            
            // Step 5: Verify that the unique text is still present
            console.log('Step 5: Verifying data preservation...');
            await page.waitForSelector('#brainstormStep1Input', { visible: true, timeout: 10000 });
            
            const preservedData = await page.$eval('#brainstormStep1Input', el => el.value);
            
            console.log(`Expected data: "${uniqueTestData}"`);
            console.log(`Preserved data: "${preservedData}"`);
            
            expect(preservedData).toBe(uniqueTestData);
            console.log('🎉 SUCCESS: Task U.2 Data Loss Prevention is working correctly!');
            console.log('✅ Form data was preserved during hamburger menu navigation');
        });
    });

    describe('FV.5: Task U.3 Module Completion Flow Test', () => {
        it('should save data without redirect when completing Brainstorm and Choose modules', async () => {
            console.log('🔄 Testing Task U.3: Module Completion Flow Correction...');
            
            // Test Brainstorm Module Completion
            console.log('Step 1: Testing Brainstorm module completion flow');
            await page.goto(`${serverUrl}/brainstorm_step5.html`);
            await verifyPageLoaded('/brainstorm_step5.html');
            
            // Enter test data
            const brainstormTestData = `Brainstorm completion test - ${Date.now()}`;
            await page.waitForSelector('#brainstormStep5Input', { visible: true, timeout: 10000 });
            await page.focus('#brainstormStep5Input');
            await page.type('#brainstormStep5Input', brainstormTestData);
            
            // Set up alert handler to catch completion alert
            let alertReceived = false;
            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                alertReceived = true;
                await dialog.accept();
            });
            
            // Submit form (Complete button)
            await page.click('button[type="submit"]');
            
            // Wait for alert and verify no redirect occurred
            await new Promise(resolve => setTimeout(resolve, 2000));
            expect(alertReceived).toBe(true);
            expect(alertMessage).toContain('Brainstorm module completed');
            
            // Verify we stayed on the same page (no redirect)
            const currentUrl = page.url();
            expect(currentUrl).toContain('/brainstorm_step5.html');
            console.log('✅ Brainstorm module: No redirect after completion');
            
            // Verify data was saved
            const savedData = await page.$eval('#brainstormStep5Input', el => el.value);
            expect(savedData).toBe(brainstormTestData);
            console.log('✅ Brainstorm module: Data preserved after completion');
            
            // Test Choose Module Completion
            console.log('Step 2: Testing Choose module completion flow');
            await page.goto(`${serverUrl}/choose_step5.html`);
            await verifyPageLoaded('/choose_step5.html');
            
            // Enter test data
            const chooseTestData = `Choose completion test - ${Date.now()}`;
            await page.waitForSelector('#chooseStep5Input', { visible: true, timeout: 10000 });
            await page.focus('#chooseStep5Input');
            await page.type('#chooseStep5Input', chooseTestData);
            
            // Reset alert handler
            alertReceived = false;
            alertMessage = '';
            
            // Submit form (Complete button)
            await page.click('button[type="submit"]');
            
            // Wait for alert and verify no redirect occurred
            await new Promise(resolve => setTimeout(resolve, 2000));
            expect(alertReceived).toBe(true);
            expect(alertMessage).toContain('Priorities saved');
            
            // Verify we stayed on the same page (no redirect)
            const currentUrlChoose = page.url();
            expect(currentUrlChoose).toContain('/choose_step5.html');
            console.log('✅ Choose module: No redirect after completion');
            
            // Verify data was saved
            const savedChooseData = await page.$eval('#chooseStep5Input', el => el.value);
            expect(savedChooseData).toBe(chooseTestData);
            console.log('✅ Choose module: Data preserved after completion');
            
            console.log('🎉 SUCCESS: Task U.3 Module Completion Flow is working correctly!');
            console.log('✅ Both Brainstorm and Choose modules now match Objectives behavior');
        });
    });

    describe('FV.6: Explicit Task Creation Test', () => {
        it('should verify explicit task creation functionality across all journey pages', async () => {
            console.log('🎯 Starting comprehensive explicit task creation verification...');
            
            // Test data for task creation
            const testTaskData = {
                content: 'Test task from automated verification',
                person: 'Test User'
            };
            
            // Pages with explicit task creation functionality
            const taskCreationPages = [
                {
                    name: 'Brainstorm Step 5',
                    menuText: 'Step 5: Interfere',
                    taskContentSelector: '#taskContentInput',
                    taskPersonSelector: '#taskPersonInput',
                    addTaskButtonSelector: 'button[onclick="createTaskFromCurrentStep()"]'
                },
                {
                    name: 'Choose Step 5', 
                    menuText: 'Step 5: Support Decision',
                    taskContentSelector: '#taskContentInput',
                    taskPersonSelector: '#taskPersonInput', 
                    addTaskButtonSelector: 'button[onclick="createTaskFromCurrentStep()"]'
                }
            ];
            
            let totalTasksCreated = 0;
            const taskCreationResults = [];
            
            // Clear any existing tasks to start fresh
            await page.evaluate(() => {
                const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                sessionData.taskList = [];
                localStorage.setItem('objectiveBuilderSession', JSON.stringify(sessionData));
            });
            
            
            // Test each page with task creation functionality
            for (const pageConfig of taskCreationPages) {
                console.log(`  Testing ${pageConfig.name}...`);
                
                // Navigate to the page
                await page.goto(pageConfig.url);
                await page.waitForSelector('body', { timeout: 10000 });
                
                // Wait for any loading to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Verify task creation elements exist
                const taskContentInput = await page.$(pageConfig.taskContentSelector);
                const taskPersonInput = await page.$(pageConfig.taskPersonSelector);
                const addTaskButton = await page.$(pageConfig.addTaskButtonSelector);
                
                if (!taskContentInput || !taskPersonInput || !addTaskButton) {
                    throw new Error(`Missing task creation elements on ${pageConfig.name}`);
                }
                
                // Get initial task count
                const initialTaskCount = await page.evaluate(() => {
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    return (sessionData.taskList || []).length;
                });
                
                // Fill in task data
                await page.click(pageConfig.taskContentSelector);
                await page.type(pageConfig.taskContentSelector, testTaskData.content);
                
                await page.click(pageConfig.taskPersonSelector);
                await page.evaluate((selector) => {
                    document.querySelector(selector).value = '';
                }, pageConfig.taskPersonSelector);
                await page.type(pageConfig.taskPersonSelector, testTaskData.person);
                
                // Set up alert handler for task creation confirmation
                const alertHandler = async (dialog) => {
                    console.log(`    Task Creation Alert: ${dialog.message()}`);
                    await dialog.accept();
                };
                page.on('dialog', alertHandler);
                
                // Click Add Task button
                await page.click(pageConfig.addTaskButtonSelector);
                
                // Wait for task creation to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Clean up alert handler
                page.off('dialog', alertHandler);
                
                // Verify task was created
                const finalTaskCount = await page.evaluate(() => {
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    return (sessionData.taskList || []).length;
                });
                
                const tasksCreated = finalTaskCount - initialTaskCount;
                if (tasksCreated !== 1) {
                    throw new Error(`Expected 1 task to be created on ${pageConfig.name}, but ${tasksCreated} were created`);
                }
                
                // Verify task content
                const createdTask = await page.evaluate(() => {
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    const taskList = sessionData.taskList || [];
                    return taskList[taskList.length - 1]; // Get the last task
                });
                
                if (!createdTask.task.includes(testTaskData.content)) {
                    throw new Error(`Task content mismatch on ${pageConfig.name}`);
                }
                
                if (createdTask.person !== testTaskData.person) {
                    throw new Error(`Task person mismatch on ${pageConfig.name}`);
                }
                
                totalTasksCreated++;
                taskCreationResults.push({
                    page: pageConfig.name,
                    success: true,
                    taskId: createdTask.id,
                    taskContent: createdTask.task
                });
                
                console.log(`    ✓ ${pageConfig.name} task creation verified`);
            }
            
            console.log('📝 Testing negative case: No automatic task creation from form submissions...');
            
            // Test that regular form submissions do NOT create tasks automatically
            const formSubmissionPages = [
                {
                    name: 'Brainstorm Step 1',
                    url: `${serverUrl}/brainstorm_step1.html`,
                    formSelector: 'form',
                    inputSelector: '#brainstormStep1Input'
                },
                {
                    name: 'Choose Step 1', 
                    url: `${serverUrl}/choose_step1.html`,
                    formSelector: 'form',
                    inputSelector: '#chooseStep1Input'
                }
            ];
            
            for (const pageConfig of formSubmissionPages) {
                console.log(`  Testing no auto-task creation on ${pageConfig.name}...`);
                
                // Navigate to the page
                await page.goto(pageConfig.url);
                await page.waitForSelector('body', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Get initial task count
                const initialTaskCount = await page.evaluate(() => {
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    return (sessionData.taskList || []).length;
                });
                
                // Fill and submit form
                await page.click(pageConfig.inputSelector);
                await page.type(pageConfig.inputSelector, 'This should NOT create a task automatically');
                
                // Set up alert handler for form submission (if any)
                const alertHandler = async (dialog) => {
                    console.log(`    Form Submission Alert: ${dialog.message()}`);
                    await dialog.accept();
                };
                page.on('dialog', alertHandler);
                
                // Submit form and wait for redirect (simplified approach)
                await page.click('button[type="submit"]');
                
                // Wait for navigation to complete
                await page.waitForSelector('body', { timeout: 10000 });
                
                // Clean up alert handler
                page.off('dialog', alertHandler);
                
                // Verify NO tasks were created
                const finalTaskCount = await page.evaluate(() => {
                    const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                    return (sessionData.taskList || []).length;
                });
                
                if (finalTaskCount !== initialTaskCount) {
                    throw new Error(`Unexpected automatic task creation on ${pageConfig.name}: ${finalTaskCount - initialTaskCount} tasks created`);
                }
                
                console.log(`    ✓ ${pageConfig.name} confirmed no automatic task creation`);
            }
            
            // FINAL VERIFICATION SUMMARY
            console.log('🎯 Explicit Task Creation Test PASSED:');
            console.log(`   • Total explicit tasks created: ${totalTasksCreated}`);
            console.log(`   • Pages with task creation tested: ${taskCreationPages.length}`);
            console.log(`   • Pages with no auto-creation verified: ${formSubmissionPages.length}`);
            console.log(`   • All task creation controls working correctly`);
            
            // Verify final state
            const finalTaskList = await page.evaluate(() => {
                const sessionData = JSON.parse(localStorage.getItem('objectiveBuilderSession') || '{}');
                return sessionData.taskList || [];
            });
            
            expect(finalTaskList.length).toBe(totalTasksCreated);
            expect(taskCreationResults.length).toBe(taskCreationPages.length);
            
            console.log('🏆 Explicit Task Creation Test COMPLETED SUCCESSFULLY');
        }, 300000); // 5 minute timeout for comprehensive test
    });
});
