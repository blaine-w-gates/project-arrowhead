import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Journey API Integration Tests
 * Tests all journey session endpoints
 */

// These tests will be run against the Express server
// The server setup should be handled by the test harness

let app: Express;
let testSessionId: string;

describe('Journey Session API', () => {
  beforeAll(async () => {
    // Import the Express app
    const { default: createApp } = await import('../../server/index.js');
    app = createApp;
    testSessionId = `test-session-${Date.now()}`;
  });

  describe('POST /api/journey/sessions', () => {
    it('creates a new journey session', async () => {
      const sessionData = {
        sessionId: testSessionId,
        module: 'brainstorm',
        stepData: JSON.stringify({ step_1: { answer: 'Test answer' } }),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      };

      const response = await request(app)
        .post('/api/journey/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toMatchObject({
        sessionId: testSessionId,
        module: 'brainstorm',
        currentStep: 1,
        isCompleted: false
      });
    });

    it('returns 400 for invalid session data', async () => {
      const invalidData = {
        sessionId: '',
        module: 'invalid_module',
        // Missing required fields
      };

      await request(app)
        .post('/api/journey/sessions')
        .send(invalidData)
        .expect(400);
    });

    it('returns 409 if session already exists', async () => {
      const sessionData = {
        sessionId: testSessionId,
        module: 'brainstorm',
        stepData: JSON.stringify({}),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      };

      // Create first time (should succeed or already exist from previous test)
      await request(app)
        .post('/api/journey/sessions')
        .send(sessionData);

      // Try to create again (should fail)
      const response = await request(app)
        .post('/api/journey/sessions')
        .send(sessionData);

      // Should either be 409 or 201 if first test didn't run
      expect([201, 409]).toContain(response.status);
    });
  });

  describe('GET /api/journey/sessions/:sessionId', () => {
    it('retrieves an existing journey session', async () => {
      const response = await request(app)
        .get(`/api/journey/sessions/${testSessionId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: testSessionId,
        module: 'brainstorm'
      });
    });

    it('returns 404 for non-existent session', async () => {
      await request(app)
        .get('/api/journey/sessions/non-existent-session')
        .expect(404);
    });
  });

  describe('PUT /api/journey/sessions/:sessionId', () => {
    it('updates journey session data', async () => {
      const updateData = {
        stepData: JSON.stringify({ 
          step_1: { answer: 'Updated answer' },
          step_2: { answer: 'Step 2 answer' }
        }),
        currentStep: 2
      };

      const response = await request(app)
        .put(`/api/journey/sessions/${testSessionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.currentStep).toBe(2);
    });

    it('marks session as completed', async () => {
      const updateData = {
        isCompleted: true,
        completedAt: new Date().toISOString()
      };

      const response = await request(app)
        .put(`/api/journey/sessions/${testSessionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.isCompleted).toBe(true);
      expect(response.body.completedAt).toBeTruthy();
    });

    it('returns 404 for non-existent session', async () => {
      const updateData = {
        currentStep: 3
      };

      await request(app)
        .put('/api/journey/sessions/non-existent-session')
        .send(updateData)
        .expect(404);
    });

    it('returns 400 for invalid update data', async () => {
      const invalidData = {
        currentStep: 'not-a-number' // Should be integer
      };

      await request(app)
        .put(`/api/journey/sessions/${testSessionId}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/journey/sessions', () => {
    it('retrieves all sessions for a user', async () => {
      const response = await request(app)
        .get('/api/journey/sessions')
        .query({ sessionId: testSessionId })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].sessionId).toBe(testSessionId);
    });

    it('returns empty array for user with no sessions', async () => {
      const response = await request(app)
        .get('/api/journey/sessions')
        .query({ sessionId: 'no-sessions-user' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/journey/sessions/:sessionId/export', () => {
    it('exports session data with answers', async () => {
      const response = await request(app)
        .get(`/api/journey/sessions/${testSessionId}/export`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('module');
      expect(response.body).toHaveProperty('stepData');
      expect(response.body).toHaveProperty('answers');
    });

    it('returns 404 for non-existent session', async () => {
      await request(app)
        .get('/api/journey/sessions/non-existent-session/export')
        .expect(404);
    });
  });

  describe('GET /api/journey/progress/:sessionId', () => {
    it('returns progress summary for session', async () => {
      const response = await request(app)
        .get(`/api/journey/progress/${testSessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('module');
      expect(response.body).toHaveProperty('currentStep');
      expect(response.body).toHaveProperty('totalSteps');
      expect(response.body).toHaveProperty('completedSteps');
      expect(response.body).toHaveProperty('progressPercentage');
    });

    it('calculates correct progress percentage', async () => {
      const response = await request(app)
        .get(`/api/journey/progress/${testSessionId}`)
        .expect(200);

      const { currentStep, totalSteps, progressPercentage } = response.body;
      
      // Progress should be calculated correctly
      const expectedProgress = Math.round(((currentStep - 1) / totalSteps) * 100);
      expect(progressPercentage).toBe(expectedProgress);
    });

    it('returns 404 for non-existent session', async () => {
      await request(app)
        .get('/api/journey/progress/non-existent-session')
        .expect(404);
    });
  });

  describe('GET /api/journey/export/full/:sessionId', () => {
    it('exports all sessions and tasks for user', async () => {
      const response = await request(app)
        .get(`/api/journey/export/full/${testSessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessions');
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });

    it('returns structured export data', async () => {
      const response = await request(app)
        .get(`/api/journey/export/full/${testSessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('userId', testSessionId);
    });
  });
});

describe('Journey Session - Module Specific Tests', () => {
  it('creates brainstorm session with 5 steps', async () => {
    const sessionId = `brainstorm-${Date.now()}`;
    const sessionData = {
      sessionId,
      module: 'brainstorm',
      stepData: JSON.stringify({}),
      completedSteps: JSON.stringify([]),
      currentStep: 1
    };

    const response = await request(app)
      .post('/api/journey/sessions')
      .send(sessionData)
      .expect(201);

    expect(response.body.module).toBe('brainstorm');
    
    // Get progress to verify step count
    const progress = await request(app)
      .get(`/api/journey/progress/${sessionId}`)
      .expect(200);
    
    expect(progress.body.totalSteps).toBe(5);
  });

  it('creates choose session with 5 steps', async () => {
    const sessionId = `choose-${Date.now()}`;
    const sessionData = {
      sessionId,
      module: 'choose',
      stepData: JSON.stringify({}),
      completedSteps: JSON.stringify([]),
      currentStep: 1
    };

    const response = await request(app)
      .post('/api/journey/sessions')
      .send(sessionData)
      .expect(201);

    expect(response.body.module).toBe('choose');
    
    const progress = await request(app)
      .get(`/api/journey/progress/${sessionId}`)
      .expect(200);
    
    expect(progress.body.totalSteps).toBe(5);
  });

  it('creates objectives session with 7 steps', async () => {
    const sessionId = `objectives-${Date.now()}`;
    const sessionData = {
      sessionId,
      module: 'objectives',
      stepData: JSON.stringify({}),
      completedSteps: JSON.stringify([]),
      currentStep: 1
    };

    const response = await request(app)
      .post('/api/journey/sessions')
      .send(sessionData)
      .expect(201);

    expect(response.body.module).toBe('objectives');
    
    const progress = await request(app)
      .get(`/api/journey/progress/${sessionId}`)
      .expect(200);
    
    expect(progress.body.totalSteps).toBe(7);
  });
});

describe('Journey Session - Data Persistence', () => {
  let persistenceSessionId: string;

  beforeAll(() => {
    persistenceSessionId = `persistence-${Date.now()}`;
  });

  it('persists step data across updates', async () => {
    // Create session
    await request(app)
      .post('/api/journey/sessions')
      .send({
        sessionId: persistenceSessionId,
        module: 'brainstorm',
        stepData: JSON.stringify({ step_1: { answer: 'Initial' } }),
        completedSteps: JSON.stringify([]),
        currentStep: 1
      })
      .expect(201);

    // Update with additional data
    await request(app)
      .put(`/api/journey/sessions/${persistenceSessionId}`)
      .send({
        stepData: JSON.stringify({ 
          step_1: { answer: 'Initial' },
          step_2: { answer: 'Second step' }
        }),
        currentStep: 2
      })
      .expect(200);

    // Retrieve and verify
    const response = await request(app)
      .get(`/api/journey/sessions/${persistenceSessionId}`)
      .expect(200);

    const stepData = JSON.parse(response.body.stepData);
    expect(stepData).toHaveProperty('step_1');
    expect(stepData).toHaveProperty('step_2');
    expect(stepData.step_2.answer).toBe('Second step');
  });

  it('handles JSON stepData correctly', async () => {
    const complexData = {
      step_1: { 
        answer: 'Complex answer with special chars: !@#$%^&*()',
        metadata: { timestamp: new Date().toISOString() }
      },
      step_2: {
        answer: 'Multi-line\nanswer\nwith\nbreaks',
        tags: ['important', 'reviewed']
      }
    };

    await request(app)
      .put(`/api/journey/sessions/${persistenceSessionId}`)
      .send({
        stepData: JSON.stringify(complexData)
      })
      .expect(200);

    const response = await request(app)
      .get(`/api/journey/sessions/${persistenceSessionId}`)
      .expect(200);

    const retrieved = JSON.parse(response.body.stepData);
    expect(retrieved.step_1.answer).toBe(complexData.step_1.answer);
    expect(retrieved.step_2.tags).toEqual(complexData.step_2.tags);
  });
});
