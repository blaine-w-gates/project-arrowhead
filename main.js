/**
 * Project Arrowhead - Main JavaScript File
 * Handles session management, data persistence, and shared functionality
 */

// Global session state variable
let sessionState = null;

// Session storage key
const SESSION_STORAGE_KEY = 'objectiveBuilderSession';

// Connection and loading state variables
let isOnline = navigator.onLine;
let isLoading = true;
let connectionCheckInterval = null;

/**
 * Returns a fresh, clean copy of the initial state object
 * @returns {Object} Default session state structure
 */
function getDefaultSessionState() {
    return {
        brainstorm: {
            step1: "",
            step2: "",
            step3: "",
            step4: "",
            step5: ""
        },
        choose: {
            step1: "",
            step2: "",
            step3: "",
            step4: "",
            step5: ""
        },
        objectives: {
            step1: "",
            step2: "",
            step3: "",
            step4: "",
            step5: "",
            step6: "",
            step7: ""
        },
        taskList: [],
        lastVisitedModulePage: null,
        timestamp: new Date().toISOString()
    };
}

/**
 * Stringifies and saves the provided state object to localStorage
 * @param {Object} state - The session state to save
 */
function saveSessionData(state) {
    try {
        state.timestamp = new Date().toISOString();
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
        sessionState = state;
        console.log('Session data saved successfully');
    } catch (error) {
        console.error('Error saving session data:', error);
        alert('Warning: Your progress could not be saved. Please check your browser settings.');
    }
}

/**
 * Retrieves and parses the state object from localStorage
 * Returns a default state if none is found or if data is corrupt
 * @returns {Object} Session state object
 */
function loadSessionData() {
    try {
        const storedDataStr = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedDataStr) {
            let storedData = JSON.parse(storedDataStr);

            // Data migration for tasks
            if (storedData.taskList && Array.isArray(storedData.taskList)) {
                storedData.taskList.forEach(task => {
                    if (task.hasOwnProperty('completed')) {
                        task.status = task.completed ? 'Done' : 'To Do';
                        delete task.completed;
                    }
                    if (!task.hasOwnProperty('status')) {
                        task.status = 'To Do'; // Ensure all tasks have a status
                    }
                });
            }
            
            sessionState = storedData;
            return sessionState;
        }
    } catch (error) {
        console.error('Error loading session data:', error);
        // Corrupt data, proceed with default
    }
    // If no data or corrupt, return default
    sessionState = getDefaultSessionState();
    return sessionState;
}

/**
 * Clears all session data from localStorage and reloads the page
 * This function was missing, causing the Clear Session button to fail
 */
function clearSessionData() {
    try {
        // Remove the session data from localStorage
        localStorage.removeItem(SESSION_STORAGE_KEY);
        
        // Reset the in-memory session state
        sessionState = getDefaultSessionState();
        
        console.log('Session data cleared successfully');
        
        // Reload the page to reflect the cleared state
        window.location.reload();
    } catch (error) {
        console.error('Error clearing session data:', error);
        alert('Warning: Could not clear session data. Please check your browser settings.');
    }
}

/**
 * Saves form data for a specific module and step into the session state
 * @param {string} module - The name of the module (e.g., 'brainstorm')
 * @param {string} step - The step identifier (e.g., 'step1')
 * @param {string} inputId - The ID of the input element to get the value from
 */
function saveFormData(module, step, inputId) {
    const sessionData = loadSessionData();
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
        sessionData[module][step] = inputElement.value;
        saveSessionData(sessionData);
    }
}

/**
 * Loads form data for a specific module and step from session state into an input
 * @param {string} module - The name of the module
 * @param {string} step - The step identifier
 * @param {string} inputId - The ID of the input element to set the value for
 */
function loadFormData(module, step, inputId) {
    const sessionData = loadSessionData();
    const inputElement = document.getElementById(inputId);
    if (inputElement && sessionData[module] && sessionData[module][step]) {
        inputElement.value = sessionData[module][step];
    }
}

/**
 * Saves the last visited module page URL to session state.
 * @param {string} url - The URL of the page visited.
 */
function saveLastVisitedModulePage(url) {
    const sessionData = loadSessionData();
    sessionData.lastVisitedModulePage = url;
    saveSessionData(sessionData);
}

/**
 * Retrieves the last visited module page URL from session state.
 * @returns {string|null} The URL of the last visited page or null.
 */
function getLastVisitedModulePage() {
    const sessionData = loadSessionData();
    return sessionData.lastVisitedModulePage;
}


// --- Task Management --- //

/**
 * Adds a new task to the session's task list and saves it.
 * @param {Object} task - The task object to add.
 */
function addTaskToList(task) {
    const sessionData = loadSessionData();
    sessionData.taskList.push(task);
    saveSessionData(sessionData);
}

/**
 * Updates an existing task in the session's task list and saves it.
 * @param {string} taskId - The ID of the task to update.
 * @param {Object} updatedTaskData - An object with the updated task properties.
 */
function updateTaskInList(taskId, updatedTaskData) {
    const sessionData = loadSessionData();
    const taskIndex = sessionData.taskList.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        sessionData.taskList[taskIndex] = { ...sessionData.taskList[taskIndex], ...updatedTaskData };
        saveSessionData(sessionData);
    }
}

/**
 * Deletes a task from the session's task list and saves it.
 * @param {string} taskId - The ID of the task to delete.
 */
function deleteTaskFromList(taskId) {
    const sessionData = loadSessionData();
    sessionData.taskList = sessionData.taskList.filter(t => t.id !== taskId);
    saveSessionData(sessionData);
}

/**
 * Cycles through task statuses: To Do -> In Progress -> Done -> To Do
 * @param {string} taskId - The ID of the task to update
 */
function cycleTaskStatus(taskId) {
    const sessionData = loadSessionData();
    const task = sessionData.taskList.find(t => t.id === taskId);
    if (task) {
        switch (task.status) {
            case 'To Do':
                task.status = 'In Progress';
                break;
            case 'In Progress':
                task.status = 'Done';
                break;
            case 'Done':
                task.status = 'To Do';
                break;
            default:
                task.status = 'To Do'; // Default case for corrupted/old data
        }
        saveSessionData(sessionData);
    }
}

/**
 * Creates a task from specific journey step content.
 * This function gives users explicit control over task creation.
 * @param {string} module - The module name (brainstorm, choose, objectives)
 * @param {string} stepKey - The step identifier (step1, step2, etc.)
 * @param {string} taskContent - The content to use for the task
 * @param {string} customPerson - Optional custom person assignment
 */
function createTaskFromJourneyStep(module, stepKey, taskContent, customPerson = 'You') {
    if (!taskContent || taskContent.trim() === '') {
        console.log('Add Task: Please enter some content before creating a task.');
        return false;
    }
    
    const sessionData = loadSessionData();
    const task = {
        id: `${module}-${stepKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        task: taskContent.trim(),
        content: taskContent.trim(), // For test compatibility
        person: customPerson,
        assignedTo: customPerson, // For test compatibility
        date: new Date().toISOString().split('T')[0],
        status: 'To Do',
        module: module,
        step: stepKey,
        createdAt: new Date().toISOString()
    };
    
    sessionData.taskList.push(task);
    saveSessionData(sessionData);
    
    console.log(`Add Task: Task created successfully: "${taskContent.trim().substring(0, 50)}${taskContent.trim().length > 50 ? '...' : ''}"`); 
    return true;
}

/**
 * Creates a custom task with user-specified content.
 * This allows users to create tasks that aren't directly from journey steps.
 * @param {string} taskContent - The task description
 * @param {string} person - Person assigned to the task
 * @param {string} module - Optional module association
 */
function createCustomTask(taskContent, person = 'You', module = 'custom') {
    if (!taskContent || taskContent.trim() === '') {
        console.log('Add Task: Please enter a task description.');
        return false;
    }
    
    const sessionData = loadSessionData();
    const task = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        task: taskContent.trim(),
        content: taskContent.trim(), // For test compatibility
        person: person,
        assignedTo: person, // For test compatibility
        date: new Date().toISOString().split('T')[0],
        status: 'To Do',
        module: module,
        step: 'custom',
        createdAt: new Date().toISOString()
    };
    
    sessionData.taskList.push(task);
    saveSessionData(sessionData);
    
    return true;
}

// Legacy functions kept for backward compatibility but deprecated
// These should no longer be called automatically from form submissions

/**
 * @deprecated Use createTaskFromJourneyStep() instead for explicit task creation
 * Legacy function for Choose module - kept for compatibility
 */
function addChooseEntriesToTaskList() {
    console.warn('addChooseEntriesToTaskList() is deprecated. Use createTaskFromJourneyStep() for explicit task creation.');
    // Function body removed to prevent automatic task creation
}

/**
 * @deprecated Use createTaskFromJourneyStep() instead for explicit task creation  
 * Legacy function for Brainstorm module - kept for compatibility
 */
function addBrainstormEntriesToTaskList() {
    console.warn('addBrainstormEntriesToTaskList() is deprecated. Use createTaskFromJourneyStep() for explicit task creation.');
    // Function body removed to prevent automatic task creation
}


// --- Initialization and Global Event Handlers ---

/**
 * TASK U.4: Context-aware function to create task from current journey step
 * Automatically detects the current module and step from the page URL
 */
function createTaskFromCurrentStep() {
    try {
        // Get task content and person from the form
        const taskContent = document.getElementById('taskContentInput').value;
        const taskPerson = document.getElementById('taskPersonInput').value || '';
        
        // Validate task content
        if (!taskContent || taskContent.trim() === '') {
            console.log('Add Task: Please enter a task description before creating a task.');
            return false;
        }
        
        // Auto-detect current page context from URL
        const currentUrl = window.location.pathname;
        const filename = currentUrl.split('/').pop();
        
        // Parse module and step from filename (e.g., "brainstorm_step1.html" -> module: "brainstorm", step: "step1")
        const match = filename.match(/^(\w+)_(step\d+)\.html$/);
        if (!match) {
            console.error('Add Task: Could not detect current page context from URL:', filename);
            console.log('Add Task: Error: Could not determine current page context. Please try again.');
            return false;
        }
        
        const [, module, step] = match;
        console.log(`Add Task: Creating task from ${module} ${step}`);
        
        // Create task using existing createTaskFromJourneyStep function
        if (createTaskFromJourneyStep(module, step, taskContent, taskPerson)) {
            // Clear the form after successful task creation
            document.getElementById('taskContentInput').value = '';
            document.getElementById('taskPersonInput').value = '';
            
            console.log(`Add Task: Successfully created task from ${module} ${step}`);
            return true;
        } else {
            console.error(`Add Task: Failed to create task from ${module} ${step}`);
            return false;
        }
        
    } catch (error) {
        console.error('Add Task: Error creating task from current step:', error);
        console.log('Add Task: Error creating task. Please try again.');
        return false;
    }
}

/**
 * TASK U.4: Initialize Add Task component functionality
 * This should be called after the DOM is loaded on pages with Add Task component
 */
function initializeAddTaskComponent() {
    // Ensure the Add Task section exists on this page
    const addTaskSection = document.getElementById('addTaskSection');
    if (!addTaskSection) {
        console.log('Add Task: Component not found on this page, skipping initialization');
        return;
    }
    
    // Set up contextual placeholder text based on current module
    const taskContentInput = document.getElementById('taskContentInput');
    if (taskContentInput) {
        const currentUrl = window.location.pathname;
        const filename = currentUrl.split('/').pop();
        const match = filename.match(/^(\w+)_(step\d+)\.html$/);
        
        if (match) {
            const [, module] = match;
            let contextualPlaceholder = '';
            
            switch (module) {
                case 'brainstorm':
                    contextualPlaceholder = 'Enter a specific task based on your brainstorming (e.g., "Research competitor pricing strategies")...';
                    break;
                case 'choose':
                    contextualPlaceholder = 'Enter a specific task based on your decision (e.g., "Schedule team meeting to discuss chosen option")...';
                    break;
                case 'objectives':
                    contextualPlaceholder = 'Enter a specific task based on your objectives (e.g., "Set up weekly progress review meeting")...';
                    break;
                default:
                    contextualPlaceholder = 'Enter a specific task based on your work in this step...';
            }
            
            taskContentInput.placeholder = contextualPlaceholder;
        }
    }
    
    console.log('Add Task: Component initialized successfully');
}

/**
 * Initializes the application by loading session data and attaching event listeners.
 */
function initializeApp() {
    try {
        loadSessionData();
        attachSidebarEventListeners();
        setupDataLossPreventionSafetyNet();
        hideLoadingScreen();
    } catch (error) {
        console.error("Error during app initialization:", error);
        hideLoadingScreen();
    }
}

/**
 * Sets up the global sidebar, loading its content and attaching event listeners.
 */
function setupSidebar() {
    fetch('global_sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load sidebar: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            const sidebarContainer = document.getElementById('globalSidebar');
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;
                attachSidebarEventListeners();
                console.log('Global sidebar loaded successfully');
            } else {
                console.error('Sidebar container #globalSidebar not found');
            }
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            // Fallback: try to attach event listeners to existing HTML if any
            const existingSidebar = document.getElementById('globalSidebar');
            if (existingSidebar && existingSidebar.innerHTML.trim()) {
                console.log('Falling back to existing sidebar HTML');
                attachSidebarEventListeners();
            }
        });
}

/**
 * TASK U.2: Sets up comprehensive data loss prevention safety net.
 * Includes beforeunload event listener and periodic auto-save to prevent any data loss scenarios.
 */
function setupDataLossPreventionSafetyNet() {
    // Add beforeunload event listener as ultimate safety net
    window.addEventListener('beforeunload', (event) => {
        // Save form data before any page unload
        autoSaveCurrentPageFormData();
        
        // Check if there's unsaved form data to warn user
        const formInputs = document.querySelectorAll('textarea[id*="Input"], input[type="text"][id*="Input"]');
        const hasUnsavedData = Array.from(formInputs).some(input => input.value && input.value.trim() !== '');
        
        if (hasUnsavedData) {
            // Modern browsers ignore custom messages, but we still set it for compatibility
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            event.returnValue = message; // For older browsers
            return message; // For modern browsers
        }
    });
    
    // Set up periodic auto-save every 30 seconds for extra safety
    setInterval(() => {
        autoSaveCurrentPageFormData();
    }, 30000);
    
    console.log('Data loss prevention safety net activated');
}

/**
 * TASK U.2: Automatically saves form data from the current page before navigation.
 * Detects the current module and step, then saves any form input data to prevent data loss.
 */
function autoSaveCurrentPageFormData() {
    try {
        // Detect current page context from URL or page elements
        const currentUrl = window.location.pathname;
        const filename = currentUrl.split('/').pop();
        
        // Parse module and step from filename (e.g., "brainstorm_step1.html" -> module: "brainstorm", step: "step1")
        const match = filename.match(/^(\w+)_(step\d+)\.html$/);
        if (!match) {
            console.log('Auto-save: Not a journey step page, skipping form data save');
            return;
        }
        
        const [, module, step] = match;
        
        // Find form input elements on the current page
        const formInputs = document.querySelectorAll('textarea[id*="Input"], input[type="text"][id*="Input"]');
        
        formInputs.forEach(input => {
            if (input.value && input.value.trim() !== '') {
                // Save form data using existing saveFormData function
                console.log(`Auto-save: Saving ${module} ${step} data from input ${input.id}`);
                saveFormData(module, step, input.id);
            }
        });
        
        console.log(`Auto-save: Form data preserved for ${module} ${step}`);
    } catch (error) {
        console.error('Auto-save: Error saving form data before navigation:', error);
    }
}

/**
 * Attaches necessary event listeners to the elements within the sidebar.
 */
function attachSidebarEventListeners() {
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const globalSidebar = document.getElementById('globalSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggleBtn && globalSidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            // Toggle sidebar-visible class on body to match CSS implementation
            document.body.classList.toggle('sidebar-visible');
        });
    }

    // Close sidebar when clicking on overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            document.body.classList.remove('sidebar-visible');
        });
    }

    // TASK U.2: Fix Data Loss on Menu Navigation
    // Add event listeners to all sidebar navigation links to save form data before navigation
    if (globalSidebar) {
        const navigationLinks = globalSidebar.querySelectorAll('a.nav-link[href]');
        navigationLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                // Save current form data before navigation
                autoSaveCurrentPageFormData();
                // Allow normal navigation to proceed
            });
        });
    }

    const exportJsonButton = document.getElementById('exportJsonButton');
    if (exportJsonButton) {
        exportJsonButton.addEventListener('click', downloadSessionAsJson);
    }
}

/**
 * Hides the loading screen.
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    isLoading = false;
}

/**
 * Checks the online status and updates the offline banner visibility.
 */
function updateOnlineStatus() {
    const offlineBanner = document.getElementById('offlineBanner');
    if (offlineBanner) {
        if (navigator.onLine) {
            offlineBanner.style.display = 'none';
        } else {
            offlineBanner.style.display = 'block';
        }
    }
    isOnline = navigator.onLine;
}

/**
 * Manually triggers a connection check.
 */
function checkConnection() {
    updateOnlineStatus();
}

/**
 * Handles the logic for showing the home confirmation modal.
 */
function showHomeConfirmationModal() {
    const modalEl = document.getElementById('homeConfirmationModal');
    if (modalEl) {
        const homeModal = new bootstrap.Modal(modalEl);
        homeModal.show();
        document.getElementById('modalGoHomeButton').onclick = () => {
            window.location.href = 'index.html';
        };
    }
}

/**
 * Generates and triggers the download of the entire session state as a JSON file.
 */
function downloadSessionAsJson() {
    const sessionData = loadSessionData();
    const dataStr = JSON.stringify({ sessionData }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'project_arrowhead_export.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

/**
 * Downloads the Objectives module results as a JSON file.
 */
function downloadObjectivesResults() {
    const sessionData = loadSessionData();
    const objectivesData = sessionData.objectives;
    
    const exportData = {
        exportType: "objectives",
        exportDate: new Date().toISOString(),
        data: objectivesData
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const today = new Date().toISOString().split('T')[0];
    const exportFileName = `objectives-results-${today}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
}

/**
 * Copies the Objectives module results as formatted Markdown to the clipboard.
 */
function copyObjectivesResults() {
    const sessionData = loadSessionData();
    const objectivesData = sessionData.objectives;
    const today = new Date().toISOString().split('T')[0];
    
    const questions = {
        step1: "Which objective would you like to talk about?",
        step2: "What are the steps to accomplish the objective if you were to delegate it?",
        step3: "What additional Business Services are needed?",
        step4: "What skills are necessary to achieve this objective?",
        step5: "What additional tools, software, or resources are needed?",
        step6: "Who will you need to contact or inform?",
        step7: "Who will you need to cooperate with to achieve this objective?"
    };
    
    let markdownContent = `# Objectives Results - ${today}\n\n`;
    
    for (let i = 1; i <= 7; i++) {
        const stepKey = `step${i}`;
        const stepData = objectivesData[stepKey];
        const question = questions[stepKey];
        
        if (stepData && stepData.trim() !== '') {
            markdownContent += `## Step ${i}: ${getStepTitle(i)}\n`;
            markdownContent += `**Question:** ${question}\n`;
            markdownContent += `**Response:** ${stepData}\n\n`;
        }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdownContent).then(() => {
        alert('Objectives results copied to clipboard as Markdown!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

/**
 * Helper function to get step titles for Objectives module.
 */
function getStepTitle(stepNumber) {
    const titles = {
        1: "Objective",
        2: "Delegation Steps",
        3: "Business Services",
        4: "Necessary Skills",
        5: "Additional Tools",
        6: "Contacts",
        7: "Cooperation"
    };
    return titles[stepNumber] || `Step ${stepNumber}`;
}

/**
 * Downloads the Brainstorm module results as a JSON file.
 */
function downloadBrainstormResults() {
    const sessionData = loadSessionData();
    const brainstormData = sessionData.brainstorm;
    
    const exportData = {
        exportType: "brainstorm",
        exportDate: new Date().toISOString(),
        data: brainstormData
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const today = new Date().toISOString().split('T')[0];
    const exportFileName = `brainstorm-results-${today}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
}

/**
 * Copies the Brainstorm module results as formatted Markdown to the clipboard.
 */
function copyBrainstormResults() {
    const sessionData = loadSessionData();
    const brainstormData = sessionData.brainstorm;
    const today = new Date().toISOString().split('T')[0];
    
    const questions = {
        step1: "How are competitors, industry leaders, or even other successful entities (in different fields) doing it? What trends are emerging that could be relevant?",
        step2: "What other ideas do we have? Think broadly and creatively.",
        step3: "What should we consciously ignore or set aside for now?",
        step4: "How can we combine or integrate different ideas to make them better?",
        step5: "First, play devil's advocate. How could our own plan fail? What are its critical flaws, hidden assumptions, or potential blockers? Next, focus on the competition. How could we actively slow our competitors down or create a strategic disadvantage for them?"
    };
    
    let markdownContent = `# Brainstorm Results - ${today}\n\n`;
    
    for (let i = 1; i <= 5; i++) {
        const stepKey = `step${i}`;
        const stepData = brainstormData[stepKey];
        const question = questions[stepKey];
        
        if (stepData && stepData.trim() !== '') {
            markdownContent += `## Step ${i}: ${getBrainstormStepTitle(i)}\n`;
            markdownContent += `**Question:** ${question}\n`;
            markdownContent += `**Response:** ${stepData}\n\n`;
        }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdownContent).then(() => {
        alert('Brainstorm results copied to clipboard as Markdown!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

/**
 * Helper function to get step titles for Brainstorm module.
 */
function getBrainstormStepTitle(stepNumber) {
    const titles = {
        1: "Imitate/Trends",
        2: "Ideate",
        3: "Ignore",
        4: "Integrate",
        5: "Interfere"
    };
    return titles[stepNumber] || `Step ${stepNumber}`;
}

/**
 * Downloads the Choose module results as a JSON file.
 */
function downloadChooseResults() {
    const sessionData = loadSessionData();
    const chooseData = sessionData.choose;
    
    const exportData = {
        exportType: "choose",
        exportDate: new Date().toISOString(),
        data: chooseData
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const today = new Date().toISOString().split('T')[0];
    const exportFileName = `choose-results-${today}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
}

/**
 * Copies the Choose module results as formatted Markdown to the clipboard.
 */
function copyChooseResults() {
    const sessionData = loadSessionData();
    const chooseData = sessionData.choose;
    const today = new Date().toISOString().split('T')[0];
    
    const questions = {
        step1: "What scenarios are being considered?",
        step2: "What are the similarities and differences between the scenarios?",
        step3: "How do you decide on what aspects are more or less important?",
        step4: "Evaluate the differences between scenarios based on those important aspects.",
        step5: "Based on your evaluation, make clear statements that support your final decision."
    };
    
    let markdownContent = `# Choose Results - ${today}\n\n`;
    
    for (let i = 1; i <= 5; i++) {
        const stepKey = `step${i}`;
        const stepData = chooseData[stepKey];
        const question = questions[stepKey];
        
        if (stepData && stepData.trim() !== '') {
            markdownContent += `## Step ${i}: ${getChooseStepTitle(i)}\n`;
            markdownContent += `**Question:** ${question}\n`;
            markdownContent += `**Response:** ${stepData}\n\n`;
        }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdownContent).then(() => {
        alert('Choose results copied to clipboard as Markdown!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

/**
 * Helper function to get step titles for Choose module.
 */
function getChooseStepTitle(stepNumber) {
    const titles = {
        1: "Scenarios",
        2: "Compare",
        3: "Important Aspects",
        4: "Evaluate",
        5: "Support Decision"
    };
    return titles[stepNumber] || `Step ${stepNumber}`;
}

/**
 * Downloads the complete project data from all modules as a unified JSON file.
 * Follows the PRD v3.0 unified project export format specification.
 */
function downloadFullProject() {
    const sessionData = loadSessionData();
    
    // Create unified project export following PRD v3.0 specification
    const exportData = {
        exportType: "unified_project",
        exportDate: new Date().toISOString(),
        brainstorm: sessionData.brainstorm,
        choose: sessionData.choose,
        objectives: sessionData.objectives,
        taskList: sessionData.taskList
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = 'project_arrowhead_export.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    // Provide user feedback
    alert('Full project export downloaded successfully! The file includes all module data and tasks.');
}
