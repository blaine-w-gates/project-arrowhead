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
        const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Validate the structure and provide defaults for missing properties
            const validatedData = validateAndMergeSessionData(parsedData);
            sessionState = validatedData;
            return validatedData;
        }
    } catch (error) {
        console.error('Error loading session data:', error);
        console.log('Loading default session state due to error');
    }

    // Return default state if no data found or error occurred
    const defaultState = getDefaultSessionState();
    sessionState = defaultState;
    return defaultState;
}

/**
 * Validates session data structure and merges with defaults for missing properties
 * @param {Object} data - Data to validate
 * @returns {Object} Validated and complete session data
 */
function validateAndMergeSessionData(data) {
    const defaultState = getDefaultSessionState();

    // Merge with defaults to ensure all required properties exist
    const merged = {
        brainstorm: { ...defaultState.brainstorm, ...(data.brainstorm || {}) },
        choose: { ...defaultState.choose, ...(data.choose || {}) },
        objectives: { ...defaultState.objectives, ...(data.objectives || {}) },
        taskList: Array.isArray(data.taskList) ? data.taskList : [],
        lastVisitedModulePage: data.lastVisitedModulePage || null,
        timestamp: data.timestamp || new Date().toISOString()
    };

    return merged;
}

/**
 * Removes the session from localStorage and resets the live state variable
 */
function clearSessionData() {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionState = getDefaultSessionState();
        console.log('Session data cleared successfully');

        // Show confirmation
        alert('Session cleared successfully. You can start fresh!');

        // Optionally redirect to home
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        } else {
            // Reload current page to reflect cleared state
            window.location.reload();
        }
    } catch (error) {
        console.error('Error clearing session data:', error);
        alert('Error clearing session data. Please try again.');
    }
}

/**
 * Updates the width of the progress bar UI element
 * @param {number} current - Current step number
 * @param {number} total - Total number of steps
 */
function updateProgressBar(current, total) {
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const percentage = Math.round((current / total) * 100);
        progressBar.style.width = percentage + '%';
        progressBar.setAttribute('aria-valuenow', percentage);
        progressBar.textContent = `Step ${current} of ${total}`;

        if (current === total) {
            progressBar.textContent += ' - Complete';
        }
    }
}

/**
 * Shows the "Go Home" confirmation modal
 */
function showHomeConfirmationModal() {
    const modal = document.getElementById('homeConfirmationModal');
    if (modal) {
        new bootstrap.Modal(modal).show();
    }
}

/**
 * Hides the "Go Home" confirmation modal
 */
function hideHomeConfirmationModal() {
    const modal = document.getElementById('homeConfirmationModal');
    if (modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
}

/**
 * Navigates to home page (called from confirmation modal)
 */
function goHome() {
    window.location.href = 'index.html';
}

/**
 * Saves form data for a specific module and step
 * @param {string} module - Module name (brainstorm, choose, objectives)
 * @param {string} step - Step identifier (step1, step2, etc.)
 * @param {string} inputId - ID of the input element
 */
function saveFormData(module, step, inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
        console.error(`Input element with ID ${inputId} not found`);
        return;
    }

    const currentState = loadSessionData();
    if (!currentState[module]) {
        currentState[module] = {};
    }

    currentState[module][step] = inputElement.value.trim();
    currentState.lastVisitedModulePage = `${module}_${step}.html`;

    saveSessionData(currentState);
}

/**
 * Loads form data for a specific module and step
 * @param {string} module - Module name (brainstorm, choose, objectives)
 * @param {string} step - Step identifier (step1, step2, etc.)
 * @param {string} inputId - ID of the input element
 */
function loadFormData(module, step, inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
        console.error(`Input element with ID ${inputId} not found`);
        return;
    }

    const currentState = loadSessionData();
    if (currentState[module] && currentState[module][step]) {
        inputElement.value = currentState[module][step];
    }
}

/**
 * Generates Markdown formatted output for brainstorm module
 * @returns {string} Markdown formatted brainstorm results
 */
function generateBrainstormMarkdown() {
    const currentState = loadSessionData();
    const brainstorm = currentState.brainstorm;

    const markdown = `# Brainstorming Session Results

**Generated:** ${new Date().toLocaleDateString()}

## 1. Imitate/Trends
${brainstorm.step1 || 'No response provided'}

## 2. Ideate
${brainstorm.step2 || 'No response provided'}

## 3. Ignore
${brainstorm.step3 || 'No response provided'}

## 4. Integrate
${brainstorm.step4 || 'No response provided'}

## 5. Interfere
${brainstorm.step5 || 'No response provided'}

---
*Generated by Project Arrowhead*`;

    return markdown;
}

/**
 * Generates Markdown formatted output for choose module
 * @returns {string} Markdown formatted decision-making results
 */
function generateChooseMarkdown() {
    const currentState = loadSessionData();
    const choose = currentState.choose;

    const markdown = `# Decision Making Session Results

**Generated:** ${new Date().toLocaleDateString()}

## 1. Scenarios
${choose.step1 || 'No response provided'}

## 2. Similarities/Differences
${choose.step2 || 'No response provided'}

## 3. Important Aspects
${choose.step3 || 'No response provided'}

## 4. Evaluate Differences
${choose.step4 || 'No response provided'}

## 5. Support Decision
${choose.step5 || 'No response provided'}

---
*Generated by Project Arrowhead*`;

    return markdown;
}

/**
 * Generates Markdown formatted output for objectives module
 * @returns {string} Markdown formatted objectives results
 */
function generateObjectivesMarkdown() {
    const currentState = loadSessionData();
    const objectives = currentState.objectives;

    const markdown = `# Objectives Planning Session Results

**Generated:** ${new Date().toLocaleDateString()}

## 1. Objective
${objectives.step1 || 'No response provided'}

## 2. Delegation Steps
${objectives.step2 || 'No response provided'}

## 3. Business Services
${objectives.step3 || 'No response provided'}

## 4. Necessary Skills
${objectives.step4 || 'No response provided'}

## 5. Additional Tools
${objectives.step5 || 'No response provided'}

## 6. Contacts
${objectives.step6 || 'No response provided'}

## 7. Cooperation
${objectives.step7 || 'No response provided'}

---
*Generated by Project Arrowhead*`;

    return markdown;
}

/**
 * Generates Markdown formatted output for task list
 * @returns {string} Markdown formatted task list
 */
function generateTaskListMarkdown() {
    const currentState = loadSessionData();
    const tasks = currentState.taskList || [];

    if (tasks.length === 0) {
        return `# Task List

**Generated:** ${new Date().toLocaleDateString()}

No tasks have been created yet.

---
*Generated by Project Arrowhead*`;
    }

    const taskRows = tasks.map(task => {
        const status = task.completed ? '✅' : '⏳';
        const isOverdue = new Date(task.date) < new Date() && !task.completed;
        const overdueFlag = isOverdue ? ' 🚨' : '';
        return `| ${status} | ${task.task} | ${task.person} | ${task.date}${overdueFlag} |`;
    }).join('\n');

    const markdown = `# Task List

**Generated:** ${new Date().toLocaleDateString()}

| Status | Task | Assigned To | Due Date |
|--------|------|-------------|----------|
${taskRows}

**Legend:**
- ✅ Completed
- ⏳ Pending
- 🚨 Overdue

---
*Generated by Project Arrowhead*`;

    return markdown;
}

/**
 * Generates CSV formatted output for task list
 * @returns {string} CSV formatted task list
 */
function generateTaskListCSV() {
    const currentState = loadSessionData();
    const tasks = currentState.taskList || [];

    const header = 'Task,Assigned To,Due Date,Status\n';
    const rows = tasks.map(task => {
        const status = task.completed ? 'Completed' : 'Pending';
        // Escape commas and quotes in task description
        const taskDesc = `"${task.task.replace(/"/g, '""')}"`;
        const person = `"${task.person.replace(/"/g, '""')}"`;
        return `${taskDesc},${person},${task.date},${status}`;
    }).join('\n');

    return header + rows;
}

/**
 * Adds a new task to the task list
 * @param {Object} task - Task object with id, task, person, date, completed properties
 */
function addTaskToList(task) {
    const currentState = loadSessionData();
    if (!currentState.taskList) {
        currentState.taskList = [];
    }

    // Validate task object
    if (!task.id || !task.task || !task.person || !task.date) {
        console.error('Invalid task object:', task);
        return false;
    }

    currentState.taskList.push({
        id: task.id,
        task: task.task,
        person: task.person,
        date: task.date,
        completed: task.completed || false
    });

    saveSessionData(currentState);
    return true;
}

/**
 * Updates an existing task in the task list
 * @param {string} taskId - ID of the task to update
 * @param {Object} updates - Object containing fields to update
 */
function updateTaskInList(taskId, updates) {
    const currentState = loadSessionData();
    if (!currentState.taskList) {
        return false;
    }

    const taskIndex = currentState.taskList.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
        console.error('Task not found:', taskId);
        return false;
    }

    // Update the task with provided fields
    currentState.taskList[taskIndex] = {
        ...currentState.taskList[taskIndex],
        ...updates
    };

    saveSessionData(currentState);
    return true;
}

/**
 * Deletes a task from the task list
 * @param {string} taskId - ID of the task to delete
 */
function deleteTaskFromList(taskId) {
    const currentState = loadSessionData();
    if (!currentState.taskList) {
        return false;
    }

    const initialLength = currentState.taskList.length;
    currentState.taskList = currentState.taskList.filter(task => task.id !== taskId);

    if (currentState.taskList.length < initialLength) {
        saveSessionData(currentState);
        return true;
    }

    return false;
}

/**
 * Toggles the completion status of a task
 * @param {string} taskId - ID of the task to toggle
 */
function toggleTaskCompletion(taskId) {
    const currentState = loadSessionData();
    if (!currentState.taskList) {
        return false;
    }

    const task = currentState.taskList.find(task => task.id === taskId);
    if (!task) {
        console.error('Task not found:', taskId);
        return false;
    }

    task.completed = !task.completed;
    saveSessionData(currentState);
    return true;
}

/**
 * Initializes the application - should be called on page load
 * Implements a conditional loading screen for a better user experience.
 */
function initializeApp() {
    console.log('Initializing Project Arrowhead');

    // Set a timer to show the loading screen *only if* the page takes too long.
    const loadingTimer = setTimeout(() => {
        showLoadingScreen();
    }, 250); // Show loading screen if initialization takes more than 250ms.

    // --- All regular synchronous setup happens here ---
    initializeConnectivityMonitoring();
    loadSessionData();
    window.addEventListener('error', (e) => console.error('Global error:', e.error));
    window.addEventListener('beforeunload', () => {
        if (sessionState) {
            try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState)); }
            catch (error) { console.error('Error saving session data on unload:', error); }
        }
    });

    // Attach global event listeners
    const sidebarToggleButton = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleButton) { sidebarToggleButton.addEventListener('click', handleSidebarToggle); }

    const globalSidebar = document.getElementById('globalSidebar');
    if (globalSidebar) {
        globalSidebar.addEventListener('click', (event) => {
            if (event.target.tagName === 'A' || event.target.closest('a')) {
                event.preventDefault();
                handleSidebarNavigation(event);
            }
        });
    }

    const modalGoHomeButton = document.getElementById('modalGoHomeButton');
    if(modalGoHomeButton) { modalGoHomeButton.addEventListener('click', goHome); }
    // --- End of regular setup ---

    // Now that all setup is done, cancel the timer.
    clearTimeout(loadingTimer);

    // And hide the loading screen (in case it was shown).
    hideLoadingScreen();

    console.log('Project Arrowhead initialized successfully');
}

/**
 * Shows the loading screen
 */
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

/**
 * Hides the loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
        }, 500);
    }
    isLoading = false;
}

/**
 * Initializes connectivity monitoring
 */
function initializeConnectivityMonitoring() {
    // Check initial connection status
    updateConnectionStatus();

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Delay the first automatic check to avoid false positives on page load
    setTimeout(() => {
        // Periodic connection check - reduced frequency to prevent false positives
        connectionCheckInterval = setInterval(checkConnection, 60000); // Check every 60 seconds
    }, 30000); // Wait 30 seconds before starting periodic checks
}

/**
 * Handles when the browser goes online
 */
function handleOnline() {
    isOnline = true;
    updateConnectionStatus();
    hideOfflineBanner();
    showConnectionStatus('online', 'Connected');
}

/**
 * Handles when the browser goes offline
 */
function handleOffline() {
    isOnline = false;
    updateConnectionStatus();
    showOfflineBanner();
    showConnectionStatus('offline', 'Offline');
}

/**
 * Updates the connection status display
 */
function updateConnectionStatus() {
    const body = document.body;
    if (isOnline) {
        body.classList.remove('offline-mode');
    } else {
        body.classList.add('offline-mode');
    }
}

/**
 * Shows the offline banner
 */
function showOfflineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
        banner.classList.add('show');
    }
}

/**
 * Hides the offline banner
 */
function hideOfflineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
        banner.classList.remove('show');
    }
}

/**
 * Shows a temporary connection status message
 */
function showConnectionStatus(type, message) {
    // Remove existing status indicator
    const existing = document.querySelector('.connection-status');
    if (existing) {
        existing.remove();
    }

    // Create new status indicator
    const status = document.createElement('div');
    status.className = `connection-status ${type}`;
    status.innerHTML = `<i class="fas fa-${type === 'online' ? 'wifi' : 'wifi-slash'} me-1"></i>${message}`;
    document.body.appendChild(status);

    // Remove after 3 seconds
    setTimeout(() => {
        if (status.parentNode) {
            status.style.opacity = '0';
            setTimeout(() => status.remove(), 300);
        }
    }, 3000);
}

/**
 * Manually checks connection by trying to load a small resource
 */
function checkConnection() {
    // Show immediate feedback when manually triggered
    showConnectionStatus('checking', 'Checking connection...');

    // Also update button text in banner if it exists
    const tryAgainBtn = document.querySelector('#offlineBanner .btn');
    if (tryAgainBtn) {
        const originalText = tryAgainBtn.innerHTML;
        tryAgainBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Checking...';
        tryAgainBtn.disabled = true;

        // Restore button after check completes
        setTimeout(() => {
            tryAgainBtn.innerHTML = originalText;
            tryAgainBtn.disabled = false;
        }, 3000);
    }

    // Use fetch with a timeout to test connectivity more reliably
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for manual checks

    fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
    })
    .then(response => {
        clearTimeout(timeoutId);
        if (response.ok) {
            if (!isOnline) {
                handleOnline();
            } else {
                showConnectionStatus('online', 'Connection verified');
            }
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        // Only treat as offline if it's a network error, not an abort or other error
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            if (isOnline) {
                handleOffline();
            } else {
                showConnectionStatus('offline', 'Still offline');
            }
        } else if (error.name === 'AbortError') {
            showConnectionStatus('offline', 'Connection timeout');
        }
    });
}

/**
 * Shows loading overlay on specific elements
 */
function showLoadingOverlay(element) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';

    element.style.position = 'relative';
    element.appendChild(overlay);
}

/**
 * Hides loading overlay from specific elements
 */
function hideLoadingOverlay(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Utility function to format dates
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Utility function to check if a date is overdue
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if the date is in the past
 */
function isOverdue(dateString) {
    try {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return date < today;
    } catch (error) {
        console.error('Error checking if overdue:', error);
        return false;
    }
}

/**
 * Generates a unique ID for tasks
 * @returns {string} Unique task ID
 */
function generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Validates email format (for future use)
 * @param {string} email - Email to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe string that may contain HTML
 * @returns {string} Safe HTML-escaped string
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Toggles the global sidebar visibility
 * Adds/removes the .sidebar-visible class on body and manages overlay
 */
function handleSidebarToggle() {
    const body = document.body;

    // Toggle the sidebar-visible class on body
    body.classList.toggle('sidebar-visible');

    // Check if sidebar is now visible
    const isVisible = body.classList.contains('sidebar-visible');
    let sidebarOverlay = document.getElementById('sidebarOverlay');

    // Create overlay if it doesn't exist and the sidebar is being opened
    if (!sidebarOverlay && isVisible) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.id = 'sidebarOverlay';
        body.appendChild(sidebarOverlay);

        // Add click handler to close sidebar when overlay is clicked
        sidebarOverlay.addEventListener('click', function() {
            handleSidebarToggle();
        });
    }

    // Handle overlay visibility for smooth transitions
    if (sidebarOverlay) {
        if (isVisible) {
            // Make it visible before adding the transition class
            sidebarOverlay.style.display = 'block';
            // Force a browser reflow to apply the display style before the transition starts
            void sidebarOverlay.offsetWidth; 
            sidebarOverlay.classList.add('show');
        } else {
            sidebarOverlay.classList.remove('show');
            // Remove the element from the DOM after the transition completes
            setTimeout(() => {
                if (sidebarOverlay && !body.classList.contains('sidebar-visible')) {
                    sidebarOverlay.remove();
                }
            }, 300); // Must match the CSS transition duration
        }
    }
}

/**
 * Handles navigation from the sidebar by saving current form data before navigating
 * @param {Event} event - The click event from the sidebar navigation link
 */
function handleSidebarNavigation(event) {
    // Get the destination URL from the clicked link
    const destinationUrl = event.target.href;

    // Parse the current page's filename from the pathname
    const currentPath = window.location.pathname;
    const currentFilename = currentPath.split('/').pop() || 'index.html';

    // Dynamically determine module and step from current filename
    let currentModule = null;
    let currentStep = null;
    let inputId = null;

    if (currentFilename.startsWith('brainstorm_step')) {
        currentModule = 'brainstorm';
        const stepMatch = currentFilename.match(/brainstorm_step(\d+)\.html/);
        if (stepMatch) {
            currentStep = `step${stepMatch[1]}`;
            inputId = `brainstormStep${stepMatch[1]}Input`;
        }
    } else if (currentFilename.startsWith('choose_step')) {
        currentModule = 'choose';
        const stepMatch = currentFilename.match(/choose_step(\d+)\.html/);
        if (stepMatch) {
            currentStep = `step${stepMatch[1]}`;
            inputId = `chooseStep${stepMatch[1]}Input`;
        }
    } else if (currentFilename.startsWith('objectives_step')) {
        currentModule = 'objectives';
        const stepMatch = currentFilename.match(/objectives_step(\d+)\.html/);
        if (stepMatch) {
            currentStep = `step${stepMatch[1]}`;
            inputId = `objectivesStep${stepMatch[1]}Input`;
        }
    }

    // Save form data if we successfully identified the current page
    if (currentModule && currentStep && inputId) {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            saveFormData(currentModule, currentStep, inputId);
        }
    }

    // Navigate to the destination URL
    window.location.href = destinationUrl;
}

// Export functions for testing (if running in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDefaultSessionState,
        saveSessionData,
        loadSessionData,
        clearSessionData,
        updateProgressBar,
        saveFormData,
        loadFormData,
        generateBrainstormMarkdown,
        generateChooseMarkdown,
        generateObjectivesMarkdown,
        generateTaskListMarkdown,
        generateTaskListCSV,
        addTaskToList,
        updateTaskInList,
        deleteTaskFromList,
        toggleTaskCompletion,
        initializeApp,
        formatDate,
        isOverdue,
        generateTaskId,
        isValidEmail,
        escapeHtml,
        debounce
    };
}