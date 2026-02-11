/**
 * Unit Tests for Project Arrowhead
 * Tests core functionality in main.js
 */

// Mock localStorage for Node.js testing environment
const localStorageMock = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value.toString();
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

// Setup global objects for testing
global.localStorage = localStorageMock;
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Import the functions to test
const {
    getDefaultSessionState,
    saveSessionData,
    loadSessionData,
    clearSessionData,
    generateBrainstormMarkdown,
    generateChooseMarkdown,
    generateObjectivesMarkdown,
    generateTaskListMarkdown,
    generateTaskListCSV,
    addTaskToList,
    updateTaskInList,
    deleteTaskFromList,
    toggleTaskCompletion,
    formatDate,
    isOverdue,
    generateTaskId,
    isValidEmail,
    escapeHtml,
    debounce
} = require('./main.js');

describe('The Objective Builder - Core Functions', () => {
    
    beforeEach(() => {
        // Clear localStorage before each test
        localStorageMock.clear();
        // Clear console mocks
        console.log.mockClear();
        console.error.mockClear();
        console.warn.mockClear();
    });

    describe('Session State Management', () => {
        test('getDefaultSessionState returns correct structure', () => {
            const defaultState = getDefaultSessionState();
            
            expect(defaultState).toHaveProperty('brainstorm');
            expect(defaultState).toHaveProperty('choose');
            expect(defaultState).toHaveProperty('objectives');
            expect(defaultState).toHaveProperty('taskList');
            expect(defaultState).toHaveProperty('lastVisitedModulePage');
            expect(defaultState).toHaveProperty('timestamp');
            
            expect(defaultState.brainstorm).toHaveProperty('step1');
            expect(defaultState.brainstorm).toHaveProperty('step5');
            expect(defaultState.choose).toHaveProperty('step1');
            expect(defaultState.choose).toHaveProperty('step5');
            expect(defaultState.objectives).toHaveProperty('step1');
            expect(defaultState.objectives).toHaveProperty('step7');
            
            expect(Array.isArray(defaultState.taskList)).toBe(true);
            expect(defaultState.taskList).toHaveLength(0);
        });

        test('saveSessionData stores data correctly', () => {
            const testState = getDefaultSessionState();
            testState.brainstorm.step1 = 'Test brainstorm data';
            
            saveSessionData(testState);
            
            const storedData = JSON.parse(localStorage.getItem('objectiveBuilderSession'));
            expect(storedData.brainstorm.step1).toBe('Test brainstorm data');
            expect(storedData).toHaveProperty('timestamp');
        });

        test('loadSessionData retrieves stored data', () => {
            const testState = getDefaultSessionState();
            testState.brainstorm.step1 = 'Test data';
            localStorage.setItem('objectiveBuilderSession', JSON.stringify(testState));
            
            const loadedState = loadSessionData();
            expect(loadedState.brainstorm.step1).toBe('Test data');
        });

        test('loadSessionData returns default state when no data exists', () => {
            const loadedState = loadSessionData();
            const defaultState = getDefaultSessionState();
            
            expect(loadedState.brainstorm).toEqual(defaultState.brainstorm);
            expect(loadedState.choose).toEqual(defaultState.choose);
            expect(loadedState.objectives).toEqual(defaultState.objectives);
        });

        test('clearSessionData removes stored data', () => {
            const testState = getDefaultSessionState();
            localStorage.setItem('objectiveBuilderSession', JSON.stringify(testState));
            
            // Mock alert to prevent actual alert during testing
            global.alert = jest.fn();
            
            clearSessionData();
            
            expect(localStorage.getItem('objectiveBuilderSession')).toBeNull();
        });
    });

    describe('Markdown Generation', () => {
        test('generateBrainstormMarkdown creates correct format', () => {
            const testState = getDefaultSessionState();
            testState.brainstorm.step1 = 'Test trends';
            testState.brainstorm.step2 = 'Test ideas';
            localStorage.setItem('objectiveBuilderSession', JSON.stringify(testState));
            
            const markdown = generateBrainstormMarkdown();
            
            expect(markdown).toContain('# Brainstorming Session Results');
            expect(markdown).toContain('## 1. Imitate/Trends');
            expect(markdown).toContain('Test trends');
            expect(markdown).toContain('## 2. Ideate');
            expect(markdown).toContain('Test ideas');
        });

        test('generateChooseMarkdown creates correct format', () => {
            const testState = getDefaultSessionState();
            testState.choose.step1 = 'Test scenarios';
            testState.choose.step2 = 'Test differences';
            localStorage.setItem('objectiveBuilderSession', JSON.stringify(testState));
            
            const markdown = generateChooseMarkdown();
            
            expect(markdown).toContain('# Decision Making Session Results');
            expect(markdown).toContain('## 1. Scenarios');
            expect(markdown).toContain('Test scenarios');
            expect(markdown).toContain('## 2. Similarities/Differences');
            expect(markdown).toContain('Test differences');
        });

        test('generateObjectivesMarkdown creates correct format', () => {
            const testState = getDefaultSessionState();
            testState.objectives.step1 = 'Test objective';
            testState.objectives.step7 = 'Test cooperation';
            localStorage.setItem('objectiveBuilderSession', JSON.stringify(testState));
            
            const markdown = generateObjectivesMarkdown();
            
            expect(markdown).toContain('# Objectives Planning Session Results');
            expect(markdown).toContain('## 1. Objective');
            expect(markdown).toContain('Test objective');
            expect(markdown).toContain('## 7. Cooperation');
            expect(markdown).toContain('Test cooperation');
        });
    });

    describe('Task List Management', () => {
        test('addTaskToList adds task correctly', () => {
            const task = {
                id: 'test_123',
                task: 'Test task',
                person: 'Test Person',
                date: '2025-06-20',
                completed: false
            };
            
            const result = addTaskToList(task);
            expect(result).toBe(true);
            
            const loadedState = loadSessionData();
            expect(loadedState.taskList).toHaveLength(1);
            expect(loadedState.taskList[0]).toEqual(task);
        });

        test('addTaskToList validates task object', () => {
            const invalidTask = {
                id: 'test_123'
                // Missing required fields
            };
            
            const result = addTaskToList(invalidTask);
            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalled();
        });

        test('updateTaskInList updates existing task', () => {
            const task = {
                id: 'test_123',
                task: 'Original task',
                person: 'Test Person',
                date: '2025-06-20',
                completed: false
            };
            
            addTaskToList(task);
            
            const result = updateTaskInList('test_123', {
                task: 'Updated task',
                completed: true
            });
            
            expect(result).toBe(true);
            
            const loadedState = loadSessionData();
            expect(loadedState.taskList[0].task).toBe('Updated task');
            expect(loadedState.taskList[0].completed).toBe(true);
            expect(loadedState.taskList[0].person).toBe('Test Person'); // Should remain unchanged
        });

        test('deleteTaskFromList removes task', () => {
            const task = {
                id: 'test_123',
                task: 'Test task',
                person: 'Test Person',
                date: '2025-06-20',
                completed: false
            };
            
            addTaskToList(task);
            expect(loadSessionData().taskList).toHaveLength(1);
            
            const result = deleteTaskFromList('test_123');
            expect(result).toBe(true);
            expect(loadSessionData().taskList).toHaveLength(0);
        });

        test('toggleTaskCompletion toggles status', () => {
            const task = {
                id: 'test_123',
                task: 'Test task',
                person: 'Test Person',
                date: '2025-06-20',
                completed: false
            };
            
            addTaskToList(task);
            
            const result = toggleTaskCompletion('test_123');
            expect(result).toBe(true);
            expect(loadSessionData().taskList[0].completed).toBe(true);
            
            toggleTaskCompletion('test_123');
            expect(loadSessionData().taskList[0].completed).toBe(false);
        });

        test('generateTaskListMarkdown handles empty list', () => {
            const markdown = generateTaskListMarkdown();
            
            expect(markdown).toContain('# Task List');
            expect(markdown).toContain('No tasks have been created yet');
        });

        test('generateTaskListMarkdown formats tasks correctly', () => {
            const tasks = [
                {
                    id: 'test_1',
                    task: 'Complete testing',
                    person: 'Developer',
                    date: '2025-06-20',
                    completed: true
                },
                {
                    id: 'test_2',
                    task: 'Write documentation',
                    person: 'Writer',
                    date: '2025-06-21',
                    completed: false
                }
            ];
            
            tasks.forEach(task => addTaskToList(task));
            
            const markdown = generateTaskListMarkdown();
            
            expect(markdown).toContain('# Task List');
            expect(markdown).toContain('| Status | Task | Assigned To | Due Date |');
            expect(markdown).toContain('| ✅ | Complete testing | Developer | 2025-06-20 |');
            expect(markdown).toContain('| ⏳ | Write documentation | Writer | 2025-06-21 |');
        });

        test('generateTaskListCSV formats correctly', () => {
            const task = {
                id: 'test_1',
                task: 'Test "quoted" task',
                person: 'Test Person',
                date: '2025-06-20',
                completed: false
            };
            
            addTaskToList(task);
            
            const csv = generateTaskListCSV();
            
            expect(csv).toContain('Task,Assigned To,Due Date,Status');
            expect(csv).toContain('"Test ""quoted"" task","Test Person",2025-06-20,Pending');
        });
    });

    describe('Utility Functions', () => {
        test('formatDate formats date correctly', () => {
            const formatted = formatDate('2025-06-20');
            expect(formatted).toMatch(/Jun 20, 2025/);
        });

        test('formatDate handles invalid dates', () => {
            const result = formatDate('invalid-date');
            expect(result).toBe('invalid-date');
            expect(console.error).toHaveBeenCalled();
        });

        test('isOverdue detects overdue dates', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];
            
            expect(isOverdue(yesterdayString)).toBe(true);
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowString = tomorrow.toISOString().split('T')[0];
            
            expect(isOverdue(tomorrowString)).toBe(false);
        });

        test('generateTaskId creates unique IDs', () => {
            const id1 = generateTaskId();
            const id2 = generateTaskId();
            
            expect(id1).toMatch(/^task_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^task_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        test('isValidEmail validates email addresses', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('invalid.email')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
        });

        test('escapeHtml prevents XSS', () => {
            const unsafe = '<script>alert("xss")</script>';
            const safe = escapeHtml(unsafe);
            
            expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(safe).not.toContain('<script>');
        });

        test('debounce limits function execution', (done) => {
            let callCount = 0;
            const testFunction = () => callCount++;
            const debouncedFunction = debounce(testFunction, 100);
            
            // Call multiple times quickly
            debouncedFunction();
            debouncedFunction();
            debouncedFunction();
            
            // Should not have been called yet
            expect(callCount).toBe(0);
            
            // Wait for debounce period
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 150);
        });
    });

    describe('Error Handling', () => {
        test('saveSessionData handles localStorage errors', () => {
            // Mock localStorage to throw an error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = jest.fn(() => {
                throw new Error('Storage full');
            });
            
            // Mock alert
            global.alert = jest.fn();
            
            const testState = getDefaultSessionState();
            saveSessionData(testState);
            
            expect(console.error).toHaveBeenCalled();
            expect(alert).toHaveBeenCalledWith(
                expect.stringContaining('Your progress could not be saved')
            );
            
            // Restore original function
            localStorage.setItem = originalSetItem;
        });

        test('loadSessionData handles corrupted data', () => {
            localStorage.setItem('objectiveBuilderSession', 'invalid json');
            
            const loadedState = loadSessionData();
            const defaultState = getDefaultSessionState();
            
            expect(loadedState).toEqual(defaultState);
            expect(console.error).toHaveBeenCalled();
        });
    });
});
