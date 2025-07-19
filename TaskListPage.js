// Utility to escape HTML to prevent XSS attacks.
function escapeHTML(str) {
    if (str === null || typeof str === 'undefined') {
        return '';
    }
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(String(str)));
    return p.innerHTML;
}

function renderTasks(tasks) {
    const taskListEl = document.getElementById('taskList');
    if (!taskListEl) return;

    taskListEl.innerHTML = '';
    if (tasks.length === 0) {
        taskListEl.innerHTML = '<tr><td colspan="5" class="text-center">No tasks yet. Add one to get started!</td></tr>';
        return;
    }

    const statusStyles = {
        'To Do': 'bg-secondary',
        'In Progress': 'bg-primary',
        'Done': 'bg-success'
    };

    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.className = `task-item ${task.status === 'Done' ? 'task-done' : ''}`;
        const statusClass = statusStyles[task.status] || 'bg-secondary';

        row.innerHTML = `
            <td>
                <span class="badge rounded-pill ${statusClass} task-status" onclick="handleStatusClick('${escapeHTML(task.id)}')" style="cursor: pointer;">
                    ${escapeHTML(task.status)}
                </span>
            </td>
            <td class="task-description">${escapeHTML(task.task)}</td>
            <td class="task-person">${escapeHTML(task.person)}</td>
            <td>${escapeHTML(task.date)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editTask('${escapeHTML(task.id)}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('${escapeHTML(task.id)}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        taskListEl.appendChild(row);
    });
}

function loadTaskList() {
    const sessionData = loadSessionData();
    renderTasks(sessionData.taskList);
}

function showAddTaskModal() {
    const modalEl = document.getElementById('addTaskModal');
    if (!modalEl) return;

    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
    }

    document.getElementById('addTaskForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDate').value = today;
    modalInstance.show();
}

function addTask() {
    const description = document.getElementById('taskDescription').value.trim();
    const person = document.getElementById('taskPerson').value.trim();
    const date = document.getElementById('taskDate').value;

    if (!description || !person || !date) {
        return; 
    }

    const task = {
        id: 'task_' + Date.now(),
        task: description,
        person: person,
        date: date,
        status: 'To Do'
    };

    addTaskToList(task); // This function is in main.js
    const addTaskModal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
    if (addTaskModal) {
        addTaskModal.hide();
    }
    loadTaskList();
}

function editTask(taskId) {
    const sessionData = loadSessionData();
    const task = sessionData.taskList.find(t => t.id === taskId);
    
    if (task) {
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskDescription').value = task.task;
        document.getElementById('editTaskPerson').value = task.person;
        document.getElementById('editTaskDate').value = task.date;
        
        const editModal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        editModal.show();
    }
}

function saveTaskChanges() {
    const taskId = document.getElementById('editTaskId').value;
    const updatedTask = {
        task: document.getElementById('editTaskDescription').value.trim(),
        person: document.getElementById('editTaskPerson').value.trim(),
        date: document.getElementById('editTaskDate').value
    };

    updateTaskInList(taskId, updatedTask); // from main.js
    loadTaskList();
    const editModal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
    if (editModal) {
        editModal.hide();
    }
}

// Missing function that was referenced in onclick handler
function updateTask() {
    // This function was missing, causing the Update Task button to fail
    // It should perform the same logic as saveTaskChanges()
    saveTaskChanges();
}

function confirmDelete(taskId) {
    console.log('🔥 confirmDelete ENTRY - taskId:', taskId);
    
    const deleteModalEl = document.getElementById('deleteConfirmationModal');
    const confirmBtn = document.getElementById('confirmDeleteButton');
    
    console.log('🔍 Element check:', { 
        deleteModalEl: !!deleteModalEl, 
        confirmBtn: !!confirmBtn,
        deleteModalElId: deleteModalEl ? deleteModalEl.id : 'NOT_FOUND',
        confirmBtnId: confirmBtn ? confirmBtn.id : 'NOT_FOUND'
    });
    
    if (!deleteModalEl || !confirmBtn) {
        console.error('🚨 Delete modal elements not found - EARLY EXIT:', { 
            deleteModalEl: !!deleteModalEl, 
            confirmBtn: !!confirmBtn,
            allModals: Array.from(document.querySelectorAll('[id*="modal"]')).map(m => m.id),
            allButtons: Array.from(document.querySelectorAll('[id*="Button"]')).map(b => b.id)
        });
        
        // Fallback to native confirm dialog
        if (confirm('Are you sure you want to delete this task?')) {
            console.log('🔄 Using fallback deletion for taskId:', taskId);
            deleteTaskFromList(taskId);
            loadTaskList();
        }
        return;
    }

    console.log('✅ confirmDelete proceeding with taskId:', taskId);

    const confirmAction = () => {
        console.log('Confirm action triggered for taskId:', taskId);
        deleteTaskFromList(taskId); // From main.js
        loadTaskList();
        const modalInstance = bootstrap.Modal.getInstance(deleteModalEl);
        if (modalInstance) {
            modalInstance.hide();
        }
    };

    // Clear any existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', confirmAction, { once: true });

    try {
        // Initialize and show the modal
        const modal = new bootstrap.Modal(deleteModalEl);
        console.log('Modal initialized, attempting to show...');
        modal.show();
        console.log('Modal show() called');
    } catch (error) {
        console.error('Error showing modal:', error);
        // Fallback: use browser confirm dialog
        if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            confirmAction();
        }
    }
}

function handleStatusClick(taskId) {
    cycleTaskStatus(taskId);
    loadTaskList();
}

// Expose functions to global scope for onclick handlers
window.confirmDelete = confirmDelete;
window.editTask = editTask;
window.handleStatusClick = handleStatusClick;
window.updateTask = updateTask;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    const addTaskButton = document.getElementById('addTaskButton');
    if (addTaskButton) {
        addTaskButton.addEventListener('click', showAddTaskModal);
    }

    const saveChangesButton = document.getElementById('saveChangesButton');
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', saveTaskChanges);
    }

    const navHomeButton = document.getElementById('navHomeButton');
    if (navHomeButton) {
        navHomeButton.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('homeConfirmationModal'));
            modal.show();
        });
    }

    const modalGoHomeButton = document.getElementById('modalGoHomeButton');
    if (modalGoHomeButton) {
        modalGoHomeButton.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }

    loadTaskList();
});
