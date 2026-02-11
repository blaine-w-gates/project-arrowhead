/**
 * Standardized Add Task Component JavaScript for Operation: Unification Task U.4
 * This component provides context-aware task creation functionality for all journey step pages
 */

/**
 * Context-aware function to create task from current journey step
 * Automatically detects the current module and step from the page URL
 */
function createTaskFromCurrentStep() {
    try {
        // Get task content and person from the form
        const taskContent = document.getElementById('taskContentInput').value;
        const taskPerson = document.getElementById('taskPersonInput').value || '';
        
        // Validate task content
        if (!taskContent || taskContent.trim() === '') {
            alert('Please enter a task description before creating a task.');
            return false;
        }
        
        // Auto-detect current page context from URL
        const currentUrl = window.location.pathname;
        const filename = currentUrl.split('/').pop();
        
        // Parse module and step from filename (e.g., "brainstorm_step1.html" -> module: "brainstorm", step: "step1")
        const match = filename.match(/^(\w+)_(step\d+)\.html$/);
        if (!match) {
            console.error('Add Task: Could not detect current page context from URL:', filename);
            alert('Error: Could not determine current page context. Please try again.');
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
        alert('Error creating task. Please try again.');
        return false;
    }
}

/**
 * Initialize Add Task component functionality
 * This should be called after the DOM is loaded on pages with Add Task component
 */
function initializeAddTaskComponent() {
    // Ensure the Add Task section exists on this page
    const addTaskSection = document.getElementById('addTaskSection');
    if (!addTaskSection) {
        console.log('Add Task: Component not found on this page, skipping initialization');
        return;
    }
    
    // Set up any additional event listeners or initialization logic here
    console.log('Add Task: Component initialized successfully');
    
    // Focus on task content input when component is first loaded (optional UX enhancement)
    const taskContentInput = document.getElementById('taskContentInput');
    if (taskContentInput) {
        // Add placeholder text based on current module context
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
}
