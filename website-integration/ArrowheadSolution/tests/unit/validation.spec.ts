import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Validation Schema Unit Tests
 * Tests Zod validation schemas from shared/schema.ts
 */

describe('Journey Session Validation', () => {
  let insertJourneySessionSchema: any;
  let updateJourneySessionSchema: any;

  beforeEach(async () => {
    const schemas = await import('../../shared/schema.js');
    insertJourneySessionSchema = schemas.insertJourneySessionSchema;
    updateJourneySessionSchema = schemas.updateJourneySessionSchema;
  });

  describe('Insert Journey Session Schema', () => {
    it('validates correct session data', () => {
      const validData = {
        sessionId: 'test-session',
        module: 'brainstorm',
        stepData: JSON.stringify({}),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      };

      const result = insertJourneySessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const invalidData = {
        module: 'brainstorm'
        // Missing sessionId, stepData, etc.
      };

      const result = insertJourneySessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid module name', () => {
      const invalidData = {
        sessionId: 'test',
        module: 'invalid_module',
        stepData: JSON.stringify({}),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      };

      const result = insertJourneySessionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts all valid module names', () => {
      const modules = ['brainstorm', 'choose', 'objectives'];

      modules.forEach(module => {
        const data = {
          sessionId: 'test',
          module,
          stepData: JSON.stringify({}),
          completedSteps: JSON.stringify([]),
          currentStep: 1
        };

        const result = insertJourneySessionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('validates step data as string', () => {
      const validData = {
        sessionId: 'test',
        module: 'brainstorm',
        stepData: JSON.stringify({ step_1: { answer: 'test' } }),
        completedSteps: JSON.stringify([1]),
        currentStep: 1
      };

      const result = insertJourneySessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Update Journey Session Schema', () => {
    it('validates partial updates', () => {
      const validUpdate = {
        currentStep: 2
      };

      const result = updateJourneySessionSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('validates completion data', () => {
      const completionUpdate = {
        isCompleted: true,
        completedAt: new Date().toISOString()
      };

      const result = updateJourneySessionSchema.safeParse(completionUpdate);
      expect(result.success).toBe(true);
    });

    it('validates step data update', () => {
      const update = {
        stepData: JSON.stringify({ step_3: { answer: 'updated' } }),
        currentStep: 3
      };

      const result = updateJourneySessionSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('allows empty update object', () => {
      const result = updateJourneySessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Task Validation', () => {
  let insertTaskSchema: any;
  let updateTaskSchema: any;

  beforeEach(async () => {
    const schemas = await import('../../shared/schema.js');
    insertTaskSchema = schemas.insertTaskSchema;
    updateTaskSchema = schemas.updateTaskSchema;
  });

  describe('Insert Task Schema', () => {
    it('validates minimal task data', () => {
      const validData = {
        sessionId: 'test-session',
        title: 'Test Task',
        status: 'todo'
      };

      const result = insertTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates full task data', () => {
      const validData = {
        sessionId: 'test-session',
        title: 'Full Task',
        description: 'Description',
        status: 'in-progress',
        priority: 'high',
        assignedTo: 'John Doe',
        dueDate: new Date().toISOString(),
        sourceModule: 'brainstorm',
        sourceStep: 2,
        tags: JSON.stringify(['important'])
      };

      const result = insertTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const invalidData = {
        title: 'Task without sessionId'
      };

      const result = insertTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates status enum', () => {
      const validStatuses = ['todo', 'in-progress', 'completed'];

      validStatuses.forEach(status => {
        const data = {
          sessionId: 'test',
          title: 'Test',
          status
        };

        const result = insertTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid status', () => {
      const invalidData = {
        sessionId: 'test',
        title: 'Test',
        status: 'invalid_status'
      };

      const result = insertTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates priority enum', () => {
      const validPriorities = ['low', 'medium', 'high'];

      validPriorities.forEach(priority => {
        const data = {
          sessionId: 'test',
          title: 'Test',
          status: 'todo',
          priority
        };

        const result = insertTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid priority', () => {
      const invalidData = {
        sessionId: 'test',
        title: 'Test',
        status: 'todo',
        priority: 'critical'
      };

      const result = insertTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates sourceModule enum', () => {
      const validModules = ['brainstorm', 'choose', 'objectives'];

      validModules.forEach(sourceModule => {
        const data = {
          sessionId: 'test',
          title: 'Test',
          status: 'todo',
          sourceModule,
          sourceStep: 1
        };

        const result = insertTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('validates date formats', () => {
      const data = {
        sessionId: 'test',
        title: 'Test',
        status: 'todo',
        dueDate: new Date().toISOString()
      };

      const result = insertTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const invalidData = {
        sessionId: 'test',
        title: '',
        status: 'todo'
      };

      const result = insertTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Update Task Schema', () => {
    it('validates status update', () => {
      const update = {
        status: 'completed'
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('validates priority update', () => {
      const update = {
        priority: 'high'
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('validates title and description update', () => {
      const update = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('validates completedAt timestamp', () => {
      const update = {
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('allows null completedAt', () => {
      const update = {
        status: 'todo',
        completedAt: null
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('validates assignee and due date', () => {
      const update = {
        assignedTo: 'Jane Smith',
        dueDate: new Date('2025-12-31').toISOString()
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('allows empty update object', () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid status in update', () => {
      const update = {
        status: 'invalid'
      };

      const result = updateTaskSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });
});

describe('Blog Post Validation', () => {
  let insertBlogPostSchema: any;

  beforeEach(async () => {
    const schemas = await import('../../shared/schema.js');
    insertBlogPostSchema = schemas.insertBlogPostSchema;
  });

  it('validates complete blog post data', () => {
    const validData = {
      slug: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      content: 'Test content',
      author: 'Test Author',
      publishedAt: new Date().toISOString(),
      published: true
    };

    const result = insertBlogPostSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates draft post', () => {
    const draftData = {
      slug: 'draft-post',
      title: 'Draft Post',
      excerpt: 'Draft excerpt',
      content: 'Draft content',
      author: 'Author',
      published: false
    };

    const result = insertBlogPostSchema.safeParse(draftData);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const invalidData = {
      title: 'No Slug'
    };

    const result = insertBlogPostSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Email Subscriber Validation', () => {
  let insertEmailSubscriberSchema: any;

  beforeEach(async () => {
    const schemas = await import('../../shared/schema.js');
    insertEmailSubscriberSchema = schemas.insertEmailSubscriberSchema;
  });

  it('validates email subscriber data', () => {
    const validData = {
      email: 'test@example.com'
    };

    const result = insertEmailSubscriberSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const invalidData = {
      email: 'not-an-email'
    };

    const result = insertEmailSubscriberSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const invalidData = {
      email: ''
    };

    const result = insertEmailSubscriberSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('User Validation', () => {
  let insertUserSchema: any;

  beforeEach(async () => {
    const schemas = await import('../../shared/schema.js');
    insertUserSchema = schemas.insertUserSchema;
  });

  it('validates user data', () => {
    const validData = {
      email: 'user@example.com',
      name: 'Test User'
    };

    const result = insertUserSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates user with optional fields', () => {
    const validData = {
      email: 'user@example.com',
      name: 'Test User',
      plan: 'pro',
      status: 'active'
    };

    const result = insertUserSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const invalidData = {
      email: 'invalid',
      name: 'User'
    };

    const result = insertUserSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
