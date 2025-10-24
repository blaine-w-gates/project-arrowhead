import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Tasks API Integration Tests
 * Tests all task management endpoints
 */

let app: Express;
let testSessionId: string;
let testTaskId: string;

describe('Tasks API', () => {
  beforeAll(async () => {
    const { default: createApp } = await import('../../server/index.js');
    app = createApp;
    testSessionId = `test-session-${Date.now()}`;
  });

  describe('POST /api/tasks', () => {
    it('creates a new task', async () => {
      const taskData = {
        sessionId: testSessionId,
        title: 'Test Task',
        description: 'Test task description',
        status: 'todo',
        priority: 'medium',
        sourceModule: 'brainstorm',
        sourceStep: 1
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Test Task',
        status: 'todo',
        priority: 'medium'
      });

      // Save task ID for later tests
      testTaskId = response.body.id;
    });

    it('returns 400 for invalid task data', async () => {
      const invalidData = {
        sessionId: '',
        title: '', // Empty title should fail
        status: 'invalid_status'
      };

      await request(app)
        .post('/api/tasks')
        .send(invalidData)
        .expect(400);
    });

    it('creates task with minimal required fields', async () => {
      const minimalTask = {
        sessionId: testSessionId,
        title: 'Minimal Task',
        status: 'todo'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(minimalTask)
        .expect(201);

      expect(response.body.title).toBe('Minimal Task');
      expect(response.body.status).toBe('todo');
    });

    it('creates task with all optional fields', async () => {
      const fullTask = {
        sessionId: testSessionId,
        title: 'Full Task',
        description: 'Complete description',
        status: 'in-progress',
        priority: 'high',
        assignedTo: 'John Doe',
        dueDate: new Date('2025-12-31').toISOString(),
        sourceModule: 'choose',
        sourceStep: 3,
        tags: JSON.stringify(['important', 'urgent'])
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(fullTask)
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Full Task',
        description: 'Complete description',
        status: 'in-progress',
        priority: 'high',
        assignedTo: 'John Doe',
        sourceModule: 'choose',
        sourceStep: 3
      });
    });
  });

  describe('GET /api/tasks', () => {
    it('retrieves tasks by sessionId query param', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ sessionId: testSessionId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].sessionId).toBe(testSessionId);
    });

    it('returns empty array for session with no tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ sessionId: 'no-tasks-session' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('returns 400 when sessionId is missing', async () => {
      await request(app)
        .get('/api/tasks')
        .expect(400);
    });
  });

  describe('GET /api/tasks/session/:sessionId', () => {
    it('retrieves all tasks for a session', async () => {
      const response = await request(app)
        .get(`/api/tasks/session/${testSessionId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for session with no tasks', async () => {
      const response = await request(app)
        .get('/api/tasks/session/empty-session')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/tasks/:taskId', () => {
    it('updates task status', async () => {
      const updateData = {
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).toBeTruthy();
    });

    it('updates task priority', async () => {
      const updateData = {
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.priority).toBe('high');
    });

    it('updates task title and description', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe('Updated Task Title');
      expect(response.body.description).toBe('Updated description');
    });

    it('updates task assignee and due date', async () => {
      const dueDate = new Date('2025-12-31').toISOString();
      const updateData = {
        assignedTo: 'Jane Smith',
        dueDate
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.assignedTo).toBe('Jane Smith');
      expect(response.body.dueDate).toBe(dueDate);
    });

    it('returns 404 for non-existent task', async () => {
      const updateData = {
        status: 'completed'
      };

      await request(app)
        .put('/api/tasks/99999')
        .send(updateData)
        .expect(404);
    });

    it('returns 400 for invalid update data', async () => {
      const invalidData = {
        status: 'invalid_status'
      };

      await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send(invalidData)
        .expect(400);
    });

    it('automatically sets completedAt when status changes to completed', async () => {
      // Create a new task
      const newTask = await request(app)
        .post('/api/tasks')
        .send({
          sessionId: testSessionId,
          title: 'Task to complete',
          status: 'todo'
        })
        .expect(201);

      expect(newTask.body.completedAt).toBeNull();

      // Update to completed
      const updated = await request(app)
        .put(`/api/tasks/${newTask.body.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(updated.body.completedAt).toBeTruthy();
      expect(new Date(updated.body.completedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('clears completedAt when status changes from completed', async () => {
      // Update task to in-progress
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .send({ status: 'in-progress' })
        .expect(200);

      expect(response.body.status).toBe('in-progress');
      expect(response.body.completedAt).toBeNull();
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('deletes a task', async () => {
      // Create a task to delete
      const newTask = await request(app)
        .post('/api/tasks')
        .send({
          sessionId: testSessionId,
          title: 'Task to delete',
          status: 'todo'
        })
        .expect(201);

      // Delete it
      await request(app)
        .delete(`/api/tasks/${newTask.body.id}`)
        .expect(204);

      // Verify it's gone
      const tasks = await request(app)
        .get(`/api/tasks/session/${testSessionId}`)
        .expect(200);

      const deletedTask = tasks.body.find((t: any) => t.id === newTask.body.id);
      expect(deletedTask).toBeUndefined();
    });

    it('returns 404 for non-existent task', async () => {
      await request(app)
        .delete('/api/tasks/99999')
        .expect(404);
    });

    it('returns 404 when trying to delete already deleted task', async () => {
      // Create and delete
      const task = await request(app)
        .post('/api/tasks')
        .send({
          sessionId: testSessionId,
          title: 'Double delete test',
          status: 'todo'
        })
        .expect(201);

      await request(app)
        .delete(`/api/tasks/${task.body.id}`)
        .expect(204);

      // Try to delete again
      await request(app)
        .delete(`/api/tasks/${task.body.id}`)
        .expect(404);
    });
  });
});

describe('Tasks API - Status Workflow', () => {
  let workflowSessionId: string;
  let workflowTaskId: string;

  beforeAll(async () => {
    workflowSessionId = `workflow-${Date.now()}`;
    
    // Create a task for workflow testing
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: workflowSessionId,
        title: 'Workflow Task',
        status: 'todo'
      })
      .expect(201);

    workflowTaskId = response.body.id;
  });

  it('transitions task through complete workflow: todo → in-progress → completed', async () => {
    // Start as todo
    let task = await request(app)
      .get(`/api/tasks/session/${workflowSessionId}`)
      .expect(200);
    expect(task.body[0].status).toBe('todo');

    // Move to in-progress
    await request(app)
      .put(`/api/tasks/${workflowTaskId}`)
      .send({ status: 'in-progress' })
      .expect(200);

    task = await request(app)
      .get(`/api/tasks/session/${workflowSessionId}`)
      .expect(200);
    expect(task.body[0].status).toBe('in-progress');

    // Complete
    await request(app)
      .put(`/api/tasks/${workflowTaskId}`)
      .send({ status: 'completed' })
      .expect(200);

    task = await request(app)
      .get(`/api/tasks/session/${workflowSessionId}`)
      .expect(200);
    expect(task.body[0].status).toBe('completed');
    expect(task.body[0].completedAt).toBeTruthy();
  });

  it('can move task back from completed to todo', async () => {
    const response = await request(app)
      .put(`/api/tasks/${workflowTaskId}`)
      .send({ status: 'todo' })
      .expect(200);

    expect(response.body.status).toBe('todo');
    expect(response.body.completedAt).toBeNull();
  });
});

describe('Tasks API - Priority Levels', () => {
  let prioritySessionId: string;

  beforeAll(() => {
    prioritySessionId = `priority-${Date.now()}`;
  });

  it('creates tasks with low priority', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: prioritySessionId,
        title: 'Low Priority Task',
        status: 'todo',
        priority: 'low'
      })
      .expect(201);

    expect(response.body.priority).toBe('low');
  });

  it('creates tasks with medium priority (default)', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: prioritySessionId,
        title: 'Medium Priority Task',
        status: 'todo',
        priority: 'medium'
      })
      .expect(201);

    expect(response.body.priority).toBe('medium');
  });

  it('creates tasks with high priority', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: prioritySessionId,
        title: 'High Priority Task',
        status: 'todo',
        priority: 'high'
      })
      .expect(201);

    expect(response.body.priority).toBe('high');
  });
});

describe('Tasks API - Source Tracking', () => {
  it('tracks task source from brainstorm module', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: `source-${Date.now()}`,
        title: 'Brainstorm Task',
        status: 'todo',
        sourceModule: 'brainstorm',
        sourceStep: 2
      })
      .expect(201);

    expect(response.body.sourceModule).toBe('brainstorm');
    expect(response.body.sourceStep).toBe(2);
  });

  it('tracks task source from choose module', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: `source-${Date.now()}`,
        title: 'Choose Task',
        status: 'todo',
        sourceModule: 'choose',
        sourceStep: 4
      })
      .expect(201);

    expect(response.body.sourceModule).toBe('choose');
    expect(response.body.sourceStep).toBe(4);
  });

  it('tracks task source from objectives module', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        sessionId: `source-${Date.now()}`,
        title: 'Objectives Task',
        status: 'todo',
        sourceModule: 'objectives',
        sourceStep: 7
      })
      .expect(201);

    expect(response.body.sourceModule).toBe('objectives');
    expect(response.body.sourceStep).toBe(7);
  });
});
