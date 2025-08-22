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
} from "@shared/schema";
import { FileBlogStorage } from "./fileStorage";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Blog methods
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  
  // Email subscriber methods
  createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber>;
  getEmailSubscriber(email: string): Promise<EmailSubscriber | undefined>;
  
  // Journey session methods
  createJourneySession(session: InsertJourneySession): Promise<JourneySession>;
  getJourneySession(sessionId: string): Promise<JourneySession | undefined>;
  updateJourneySession(sessionId: string, updates: UpdateJourneySession): Promise<JourneySession | undefined>;
  getAllJourneySessionsForUser(sessionId: string): Promise<JourneySession[]>;
  getAllJourneySessions(): Promise<JourneySession[]>;
  
  // Task methods
  createTask(task: InsertTask): Promise<Task>;
  getTask(taskId: string): Promise<Task | undefined>;
  updateTask(taskId: string, updates: UpdateTask): Promise<Task | undefined>;
  deleteTask(taskId: string): Promise<boolean>;
  getTasksBySession(sessionId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private blogPosts: Map<number, BlogPost>;
  private emailSubscribers: Map<number, EmailSubscriber>;
  private journeySessions: Map<string, JourneySession>;
  private tasks: Map<string, Task>;
  private currentUserId: number;
  private currentBlogPostId: number;
  private currentEmailSubscriberId: number;
  private currentJourneySessionId: number;
  private currentTaskId: number;

  constructor() {
    this.users = new Map();
    this.blogPosts = new Map();
    this.emailSubscribers = new Map();
    this.journeySessions = new Map();
    this.tasks = new Map();
    this.currentUserId = 1;
    this.currentBlogPostId = 1;
    this.currentEmailSubscriberId = 1;
    this.currentJourneySessionId = 1;
    this.currentTaskId = 1;
    
    // Initialize with some sample blog posts
    this.initializeBlogPosts();
  }

  private initializeBlogPosts() {
    const samplePosts: InsertBlogPost[] = [
      {
        title: "5 Common Strategic Planning Mistakes to Avoid",
        slug: "strategic-planning-mistakes",
        excerpt: "Learn how to navigate the most common pitfalls in strategic planning and set your team up for success.",
        content: "Strategic planning is crucial for business success, but many organizations fall into common traps that can derail their efforts. In this comprehensive guide, we'll explore the five most frequent mistakes and how to avoid them...",
        imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        published: true,
        publishedAt: new Date('2025-03-15'),
      },
      {
        title: "The HSE Framework: A Complete Guide",
        slug: "hse-framework-guide",
        excerpt: "Deep dive into our proven Headlights, Steering Wheel, Engine framework for strategic success.",
        content: `The HSE Framework represents a practical approach to strategic execution.

## Headlights
Set the vision, define success, and surface risks.

## Steering Wheel
Make informed decisions with clear tradeoffs and governance.

## Engine
Enable execution with the right people, process, and tools.

> When used together, HSE turns strategy into results.`,
        imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        published: true,
        publishedAt: new Date('2025-03-10'),
      },
      {
        title: "Building High-Performance Teams Through Clear Objectives",
        slug: "high-performance-teams",
        excerpt: "Discover how clear objectives can transform team performance and drive exceptional results.",
        content: "High-performance teams don't happen by accident. They are built through intentional processes, clear communication, and most importantly, well-defined objectives that everyone understands and commits to...",
        imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        published: true,
        publishedAt: new Date('2025-03-05'),
      },
      {
        title: "XSS Test: Script Sanitization",
        slug: "xss-test",
        excerpt: "This post contains a script tag to verify sanitization.",
        content: `This page is used to validate XSS protections in the blog renderer.

Before the script tag <script>alert('XSS')</script> after the script tag.

Additional safe content below to ensure normal rendering continues.

- Item A
- Item B

End of test.`,
        imageUrl: null,
        published: true,
        publishedAt: new Date('2025-03-20'),
      },
    ];

    samplePosts.forEach(post => {
      this.createBlogPost(post);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      tier: insertUser.tier || "free",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Blog methods
  async getBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.published)
      .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
  }

  async getBlogPost(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find(post => post.slug === slug && post.published);
  }

  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    const id = this.currentBlogPostId++;
    const post: BlogPost = {
      ...insertPost,
      id,
      imageUrl: insertPost.imageUrl || null,
      published: insertPost.published || false,
      publishedAt: insertPost.publishedAt || null,
      createdAt: new Date(),
    };
    this.blogPosts.set(id, post);
    return post;
  }

  // Email subscriber methods
  async createEmailSubscriber(insertSubscriber: InsertEmailSubscriber): Promise<EmailSubscriber> {
    const id = this.currentEmailSubscriberId++;
    const subscriber: EmailSubscriber = {
      ...insertSubscriber,
      id,
      subscribed: true,
      createdAt: new Date(),
    };
    this.emailSubscribers.set(id, subscriber);
    return subscriber;
  }

  async getEmailSubscriber(email: string): Promise<EmailSubscriber | undefined> {
    return Array.from(this.emailSubscribers.values()).find(subscriber => subscriber.email === email);
  }

  // Journey session methods
  async createJourneySession(insertSession: InsertJourneySession): Promise<JourneySession> {
    console.log('🔧 STORAGE CREATE: Starting session creation for sessionId:', insertSession.sessionId);
    const id = this.currentJourneySessionId++;
    const session: JourneySession = {
      ...insertSession,
      id, // Auto-incrementing integer primary key
      userId: insertSession.userId || null,
      stepData: insertSession.stepData || '{}',
      completedSteps: insertSession.completedSteps || '[]',
      currentStep: insertSession.currentStep || 1,
      isCompleted: insertSession.isCompleted || false,
      completedAt: insertSession.completedAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Store using sessionId as the key (not the auto-incrementing id)
    this.journeySessions.set(insertSession.sessionId, session);
    console.log('✅ STORAGE CREATE: Session stored successfully. Map size:', this.journeySessions.size);
    console.log('🔍 STORAGE CREATE: Verifying immediate retrieval...');
    const verification = this.journeySessions.get(insertSession.sessionId);
    console.log('✅ STORAGE CREATE: Immediate verification result:', verification ? 'FOUND' : 'NOT FOUND');
    return session;
  }

  async getJourneySession(sessionId: string): Promise<JourneySession | undefined> {
    console.log('🔍 STORAGE GET: Looking for sessionId:', sessionId);
    console.log('🔍 STORAGE GET: Current map size:', this.journeySessions.size);
    console.log('🔍 STORAGE GET: All stored session keys:', Array.from(this.journeySessions.keys()));
    const session = this.journeySessions.get(sessionId);
    console.log('🔍 STORAGE GET: Result:', session ? 'FOUND' : 'NOT FOUND');
    return session;
  }

  async updateJourneySession(sessionId: string, updates: UpdateJourneySession): Promise<JourneySession | undefined> {
    const existing = this.journeySessions.get(sessionId);
    if (!existing) return undefined;
    
    const updated: JourneySession = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.journeySessions.set(sessionId, updated);
    return updated;
  }

  async getAllJourneySessionsForUser(sessionId: string): Promise<JourneySession[]> {
    // For guest users, we use sessionId as the identifier
    // For logged-in users, we would filter by userId
    return Array.from(this.journeySessions.values())
      .filter(session => session.sessionId === sessionId || session.userId?.toString() === sessionId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAllJourneySessions(): Promise<JourneySession[]> {
    return Array.from(this.journeySessions.values());
  }

  // Task methods
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const taskId = `task_${id}_${Date.now()}`;
    const task: Task = {
      ...insertTask,
      id,
      userId: insertTask.userId || null,
      status: insertTask.status || 'todo',
      description: insertTask.description || null,
      priority: insertTask.priority || null,
      dueDate: insertTask.dueDate || null,
      assignedTo: insertTask.assignedTo || null,
      sourceModule: insertTask.sourceModule || null,
      sourceStep: insertTask.sourceStep || null,
      tags: insertTask.tags || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(taskId, task);
    return task;
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  async updateTask(taskId: string, updates: UpdateTask): Promise<Task | undefined> {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;
    
    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return this.tasks.delete(taskId);
  }

  async getTasksBySession(sessionId: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.sessionId === sessionId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
}

// Hybrid storage that reads blog posts from the filesystem and delegates everything else to memory storage
export class HybridStorage implements IStorage {
  private mem: MemStorage;
  private files: FileBlogStorage;

  constructor(options?: { blogDir?: string }) {
    this.mem = new MemStorage();
    this.files = new FileBlogStorage(options?.blogDir);
  }

  // User methods
  async getUser(id: number) { return this.mem.getUser(id); }
  async getUserByEmail(email: string) { return this.mem.getUserByEmail(email); }
  async createUser(user: InsertUser) { return this.mem.createUser(user); }

  // Blog methods: delegate reads to filesystem, writes remain in-memory for compatibility
  async getBlogPosts() { return this.files.getBlogPosts(); }
  async getBlogPost(slug: string) { return this.files.getBlogPost(slug); }
  async createBlogPost(post: InsertBlogPost) { return this.mem.createBlogPost(post); }

  // Email subscriber methods
  async createEmailSubscriber(subscriber: InsertEmailSubscriber) { return this.mem.createEmailSubscriber(subscriber); }
  async getEmailSubscriber(email: string) { return this.mem.getEmailSubscriber(email); }

  // Journey session methods
  async createJourneySession(session: InsertJourneySession) { return this.mem.createJourneySession(session); }
  async getJourneySession(sessionId: string) { return this.mem.getJourneySession(sessionId); }
  async updateJourneySession(sessionId: string, updates: UpdateJourneySession) { return this.mem.updateJourneySession(sessionId, updates); }
  async getAllJourneySessionsForUser(sessionId: string) { return this.mem.getAllJourneySessionsForUser(sessionId); }
  async getAllJourneySessions() { return this.mem.getAllJourneySessions(); }

  // Task methods
  async createTask(task: InsertTask) { return this.mem.createTask(task); }
  async getTask(taskId: string) { return this.mem.getTask(taskId); }
  async updateTask(taskId: string, updates: UpdateTask) { return this.mem.updateTask(taskId, updates); }
  async deleteTask(taskId: string) { return this.mem.deleteTask(taskId); }
  async getTasksBySession(sessionId: string) { return this.mem.getTasksBySession(sessionId); }
  async getAllTasks() { return this.mem.getAllTasks(); }
}

export const storage = new HybridStorage();
