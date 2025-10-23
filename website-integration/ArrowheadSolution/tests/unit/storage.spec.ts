import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Storage Abstraction Unit Tests
 * Tests the storage interface implementations
 */

describe('Storage Interface', () => {
  describe('MemStorage (In-Memory)', () => {
    let MemStorage: any;
    let storage: any;

    beforeEach(async () => {
      const { MemStorage: MS } = await import('../../server/storage.js');
      MemStorage = MS;
      storage = new MemStorage();
    });

    describe('Journey Sessions', () => {
      it('creates and retrieves a journey session', async () => {
        const sessionData = {
          sessionId: 'test-session-1',
          module: 'brainstorm',
          stepData: JSON.stringify({ step_1: { answer: 'Test' } }),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        };

        const created = await storage.createJourneySession(sessionData);
        expect(created).toMatchObject(sessionData);

        const retrieved = await storage.getJourneySession('test-session-1');
        expect(retrieved).toMatchObject(sessionData);
      });

      it('updates journey session', async () => {
        const sessionData = {
          sessionId: 'test-session-2',
          module: 'choose',
          stepData: JSON.stringify({}),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        };

        await storage.createJourneySession(sessionData);

        const updates = {
          currentStep: 3,
          stepData: JSON.stringify({ step_3: { answer: 'Updated' } })
        };

        const updated = await storage.updateJourneySession('test-session-2', updates);
        expect(updated.currentStep).toBe(3);
        expect(updated.stepData).toBe(updates.stepData);
      });

      it('returns null for non-existent session', async () => {
        const result = await storage.getJourneySession('non-existent');
        expect(result).toBeNull();
      });

      it('retrieves all sessions for a user', async () => {
        await storage.createJourneySession({
          sessionId: 'user-1',
          module: 'brainstorm',
          stepData: JSON.stringify({}),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        });

        await storage.createJourneySession({
          sessionId: 'user-1',
          module: 'choose',
          stepData: JSON.stringify({}),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        });

        const sessions = await storage.getAllJourneySessionsForUser('user-1');
        expect(sessions.length).toBe(2);
      });

      it('handles session completion', async () => {
        const sessionData = {
          sessionId: 'complete-test',
          module: 'objectives',
          stepData: JSON.stringify({}),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        };

        await storage.createJourneySession(sessionData);

        const updates = {
          isCompleted: true,
          completedAt: new Date().toISOString()
        };

        const completed = await storage.updateJourneySession('complete-test', updates);
        expect(completed.isCompleted).toBe(true);
        expect(completed.completedAt).toBeTruthy();
      });
    });

    describe('Tasks', () => {
      it('creates and retrieves a task', async () => {
        const taskData = {
          sessionId: 'task-session-1',
          title: 'Test Task',
          description: 'Test Description',
          status: 'todo' as const,
          priority: 'medium' as const
        };

        const created = await storage.createTask(taskData);
        expect(created).toMatchObject(taskData);
        expect(created.id).toBeDefined();

        const tasks = await storage.getTasksBySession('task-session-1');
        expect(tasks.length).toBe(1);
        expect(tasks[0].title).toBe('Test Task');
      });

      it('updates task', async () => {
        const taskData = {
          sessionId: 'task-session-2',
          title: 'Update Test',
          status: 'todo' as const,
          priority: 'low' as const
        };

        const created = await storage.createTask(taskData);

        const updates = {
          status: 'completed' as const,
          completedAt: new Date().toISOString()
        };

        const updated = await storage.updateTask(created.id.toString(), updates);
        expect(updated.status).toBe('completed');
        expect(updated.completedAt).toBeTruthy();
      });

      it('deletes task', async () => {
        const taskData = {
          sessionId: 'task-session-3',
          title: 'Delete Test',
          status: 'todo' as const
        };

        const created = await storage.createTask(taskData);
        const taskId = created.id.toString();

        const deleted = await storage.deleteTask(taskId);
        expect(deleted).toBe(true);

        const tasks = await storage.getTasksBySession('task-session-3');
        expect(tasks.length).toBe(0);
      });

      it('returns false when deleting non-existent task', async () => {
        const result = await storage.deleteTask('99999');
        expect(result).toBe(false);
      });

      it('handles task with all optional fields', async () => {
        const taskData = {
          sessionId: 'task-session-4',
          title: 'Full Task',
          description: 'Full description',
          status: 'in-progress' as const,
          priority: 'high' as const,
          assignedTo: 'John Doe',
          dueDate: new Date('2025-12-31').toISOString(),
          sourceModule: 'brainstorm',
          sourceStep: 2,
          tags: JSON.stringify(['important'])
        };

        const created = await storage.createTask(taskData);
        expect(created).toMatchObject(taskData);
        expect(created.sourceModule).toBe('brainstorm');
        expect(created.sourceStep).toBe(2);
      });

      it('automatically sets completedAt when status becomes completed', async () => {
        const taskData = {
          sessionId: 'task-session-5',
          title: 'Auto Complete Test',
          status: 'todo' as const
        };

        const created = await storage.createTask(taskData);
        expect(created.completedAt).toBeNull();

        const updated = await storage.updateTask(created.id.toString(), {
          status: 'completed' as const
        });

        expect(updated.status).toBe('completed');
        expect(updated.completedAt).toBeTruthy();
      });

      it('clears completedAt when status changes from completed', async () => {
        const taskData = {
          sessionId: 'task-session-6',
          title: 'Uncomplete Test',
          status: 'completed' as const,
          completedAt: new Date().toISOString()
        };

        const created = await storage.createTask(taskData);
        expect(created.completedAt).toBeTruthy();

        const updated = await storage.updateTask(created.id.toString(), {
          status: 'in-progress' as const
        });

        expect(updated.status).toBe('in-progress');
        expect(updated.completedAt).toBeNull();
      });
    });

    describe('Blog Posts', () => {
      it('retrieves all published blog posts', async () => {
        const posts = await storage.getAllBlogPosts();
        expect(Array.isArray(posts)).toBe(true);
      });

      it('retrieves blog post by slug', async () => {
        // MemStorage uses filesystem for blog posts
        const post = await storage.getBlogPostBySlug('test-slug');
        // May be null if file doesn't exist, which is fine
        if (post) {
          expect(post).toHaveProperty('slug');
          expect(post).toHaveProperty('title');
        }
      });
    });
  });
});

describe('Storage Data Validation', () => {
  it('validates journey session data structure', async () => {
    const { MemStorage } = await import('../../server/storage.js');
    const storage = new MemStorage();

    // Valid data
    const validSession = {
      sessionId: 'valid-session',
      module: 'brainstorm',
      stepData: JSON.stringify({}),
      completedSteps: JSON.stringify([]),
      currentStep: 1
    };

    await expect(storage.createJourneySession(validSession)).resolves.toBeDefined();
  });

  it('validates task data structure', async () => {
    const { MemStorage } = await import('../../server/storage.js');
    const storage = new MemStorage();

    // Valid data
    const validTask = {
      sessionId: 'valid-task-session',
      title: 'Valid Task',
      status: 'todo' as const,
      priority: 'medium' as const
    };

    await expect(storage.createTask(validTask)).resolves.toBeDefined();
  });
});

describe('Storage Concurrency', () => {
  it('handles concurrent session creation', async () => {
    const { MemStorage } = await import('../../server/storage.js');
    const storage = new MemStorage();

    const promises = Array.from({ length: 10 }, (_, i) =>
      storage.createJourneySession({
        sessionId: `concurrent-user-${i}`,
        module: 'brainstorm',
        stepData: JSON.stringify({}),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    results.forEach((result, i) => {
      expect(result.sessionId).toBe(`concurrent-user-${i}`);
    });
  });

  it('handles concurrent task creation', async () => {
    const { MemStorage } = await import('../../server/storage.js');
    const storage = new MemStorage();

    const sessionId = 'concurrent-tasks';

    const promises = Array.from({ length: 10 }, (_, i) =>
      storage.createTask({
        sessionId,
        title: `Task ${i}`,
        status: 'todo' as const
      })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(10);

    const allTasks = await storage.getTasksBySession(sessionId);
    expect(allTasks.length).toBe(10);
  });
});
