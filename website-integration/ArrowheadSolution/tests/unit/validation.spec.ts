import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Unit Tests: Validation Schemas
 * Tests Zod schemas used for request validation
 */

describe('Validation Schemas', () => {
  describe('Journey Session Creation', () => {
    const createSessionSchema = z.object({
      userId: z.string().optional(),
      metadata: z.record(z.unknown()).optional()
    });

    it('accepts valid session data', () => {
      const data = {
        userId: 'user-123',
        metadata: { source: 'web' }
      };

      const result = createSessionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = createSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid types', () => {
      const data = {
        userId: 123, // Should be string
        metadata: 'invalid' // Should be object
      };

      const result = createSessionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Step Data Validation', () => {
    const stepDataSchema = z.object({
      answer: z.string().min(1, 'Answer cannot be empty'),
      metadata: z.record(z.unknown()).optional()
    });

    it('accepts valid step data', () => {
      const data = {
        answer: 'This is my answer to step 1',
        metadata: { timestamp: Date.now() }
      };

      const result = stepDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects empty answer', () => {
      const data = {
        answer: ''
      };

      const result = stepDataSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Answer cannot be empty');
      }
    });

    it('rejects missing answer field', () => {
      const data = {
        metadata: { test: true }
      };

      const result = stepDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Task Creation Validation', () => {
    const createTaskSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      dueDate: z.string().optional()
    });

    it('accepts valid task data', () => {
      const data = {
        title: 'Complete user research',
        description: 'Interview 10 users',
        priority: 'high' as const,
        dueDate: '2025-12-31'
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('accepts minimal task data', () => {
      const data = {
        title: 'Simple task'
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects title over 200 characters', () => {
      const data = {
        title: 'a'.repeat(201)
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority', () => {
      const data = {
        title: 'Task',
        priority: 'urgent' // Not in enum
      };

      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
