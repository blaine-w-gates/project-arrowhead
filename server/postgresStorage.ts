import { getDb } from './db';
import type { IStorage } from './storage';
import { 
  users, 
  blogPosts, 
  emailSubscribers, 
  journeySessions,
  tasks,
  type User, 
  type InsertUser, 
  type BlogPost, 
  type InsertBlogPost, 
  type EmailSubscriber, 
  type InsertEmailSubscriber,
  type JourneySession,
  type InsertJourneySession,
  type UpdateJourneySession,
  type Task,
  type InsertTask,
  type UpdateTask
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    return db.select().from(users).where(eq(users.id, id)).then(res => res[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    return db.select().from(users).where(eq(users.email, email)).then(res => res[0]);
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDb();
    return db.insert(users).values(user).returning().then(res => res[0]);
  }

  // Blog methods
  async getBlogPosts(): Promise<BlogPost[]> {
    const db = getDb();
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.publishedAt));
  }

  async getBlogPost(slug: string): Promise<BlogPost | undefined> {
    const db = getDb();
    return db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).then(res => res[0]);
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const db = getDb();
    return db.insert(blogPosts).values(post).returning().then(res => res[0]);
  }

  // Email subscriber methods
  async createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber> {
    const db = getDb();
    return db.insert(emailSubscribers).values(subscriber).returning().then(res => res[0]);
  }

  async getEmailSubscriber(email: string): Promise<EmailSubscriber | undefined> {
    const db = getDb();
    return db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).then(res => res[0]);
  }

  // Journey session methods
  async createJourneySession(session: InsertJourneySession): Promise<JourneySession> {
    const db = getDb();
    return db.insert(journeySessions).values(session).returning().then(res => res[0]);
  }

  async getJourneySession(sessionId: string): Promise<JourneySession | undefined> {
    const db = getDb();
    return db.select().from(journeySessions).where(eq(journeySessions.sessionId, sessionId)).then(res => res[0]);
  }

  async updateJourneySession(sessionId: string, updates: UpdateJourneySession): Promise<JourneySession | undefined> {
    const db = getDb();
    return db.update(journeySessions).set(updates).where(eq(journeySessions.sessionId, sessionId)).returning().then(res => res[0]);
  }

  async getAllJourneySessionsForUser(sessionId: string): Promise<JourneySession[]> {
    const db = getDb();
    return db.select().from(journeySessions).where(eq(journeySessions.sessionId, sessionId));
  }

  async getAllJourneySessions(): Promise<JourneySession[]> {
    const db = getDb();
    return db.select().from(journeySessions);
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    const db = getDb();
    return db.insert(tasks).values(task).returning().then(res => res[0]);
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    // Assuming taskId is the string representation of the ID
    const db = getDb();
    return db.select().from(tasks).where(eq(tasks.id, parseInt(taskId, 10))).then(res => res[0]);
  }

  async updateTask(taskId: string, updates: UpdateTask): Promise<Task | undefined> {
    const db = getDb();
    return db.update(tasks).set(updates).where(eq(tasks.id, parseInt(taskId, 10))).returning().then(res => res[0]);
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(tasks).where(eq(tasks.id, parseInt(taskId, 10))).returning({ id: tasks.id });
    return result.length > 0;
  }

  async getTasksBySession(sessionId: string): Promise<Task[]> {
    const db = getDb();
    return db.select().from(tasks).where(eq(tasks.sessionId, sessionId));
  }

  async getAllTasks(): Promise<Task[]> {
    const db = getDb();
    return db.select().from(tasks);
  }
}
