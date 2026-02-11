// Journey API Service for frontend-backend communication

export interface JourneySession {
  id: number;
  sessionId: string;
  userId?: number;
  module: string;
  currentStep: number;
  stepData: Record<string, unknown>;
  completedSteps: string[];
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  sessionId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  sourceModule?: string;
  sourceStep?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJourneySessionRequest {
  sessionId: string;
  userId?: number;
  module: string;
  stepData?: string; // JSON string as expected by backend schema
  completedSteps?: string; // JSON array string as expected by backend schema
  currentStep?: number;
  isCompleted?: boolean;
}

export interface UpdateJourneySessionRequest {
  currentStep?: number;
  stepData?: string; // JSON string as expected by backend schema
  isCompleted?: boolean;
  completedAt?: string;
}

export interface CreateTaskRequest {
  sessionId: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  sourceModule?: string;
  sourceStep?: number;
  tags?: string[];
}

class JourneyApiService {
  private baseUrl = '/api';

  // Journey Session Methods
  async createJourneySession(data: CreateJourneySessionRequest): Promise<JourneySession> {
    const response = await fetch(`${this.baseUrl}/journey/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create journey session: ${response.statusText}`);
    }

    return response.json();
  }

  async getJourneySession(sessionId: string): Promise<JourneySession | null> {
    const response = await fetch(`${this.baseUrl}/journey/sessions/${sessionId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get journey session: ${response.statusText}`);
    }

    return response.json();
  }

  async updateJourneySession(
    sessionId: string, 
    data: UpdateJourneySessionRequest
  ): Promise<JourneySession> {
    const response = await fetch(`${this.baseUrl}/journey/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update journey session: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllJourneySessionsForUser(sessionId: string): Promise<JourneySession[]> {
    const response = await fetch(`${this.baseUrl}/journey/sessions?sessionId=${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get user journey sessions: ${response.statusText}`);
    }

    return response.json();
  }

  // Task Methods
  async createTask(data: CreateTaskRequest): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  }

  async getTask(taskId: string): Promise<Task | null> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTask(taskId: string, data: Partial<CreateTaskRequest>): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }

    return response.json();
  }

  async getTasksBySession(sessionId: string): Promise<Task[]> {
    const response = await fetch(`${this.baseUrl}/tasks?sessionId=${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get tasks for session: ${response.statusText}`);
    }

    return response.json();
  }

  // Progress Tracking
  async getJourneyProgress(sessionId: string): Promise<{
    sessions: JourneySession[];
    tasks: Task[];
    totalSteps: number;
    completedSteps: number;
    progressPercentage: number;
  }> {
    const response = await fetch(`${this.baseUrl}/journey/progress/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get journey progress: ${response.statusText}`);
    }

    return response.json();
  }

  // Export Methods
  async exportJourneyData(sessionId: string, format: 'json' | 'csv' | 'markdown' = 'json') {
    const response = await fetch(`${this.baseUrl}/journey/export/${sessionId}?format=${format}`);

    if (!response.ok) {
      throw new Error(`Failed to export journey data: ${response.statusText}`);
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.text();
    }
  }
}

export const journeyApi = new JourneyApiService();
