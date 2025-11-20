/**
 * API Seeding Fixtures for E2E Tests
 * 
 * Provides fast data setup via API calls instead of slow UI interactions
 * 
 * Strategy: "Headless Setup, Headed Verification"
 * - Use API to create test data (fast, reliable)
 * - Use UI to verify functionality (accurate, realistic)
 */

import { Page } from '@playwright/test';

/**
 * Seed a project via API
 * 
 * @param page - Playwright page object
 * @param teamId - Team ID to create project under
 * @param projectName - Optional project name
 * @returns Created project object with ID
 */
export async function seedProject(
  page: Page,
  teamId: string,
  projectName?: string
): Promise<{ id: string; name: string }> {
  const name = projectName || `API Test Project ${Date.now()}`;
  
  // Use page.evaluate to make request with browser's session cookies AND access token
  const result = await page.evaluate(async ({ teamId, name }) => {
    // Get access token from Supabase localStorage
    let accessToken = '';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase.auth.token')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            accessToken = parsed.access_token || parsed.currentSession?.access_token || '';
            break;
          } catch (e) {
            // Continue searching
          }
        }
      }
    }

    const response = await fetch(`/api/teams/${teamId}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    const text = await response.text();
    
    console.log(`[API Seed] POST /api/teams/${teamId}/projects - Status: ${response.status}`);
    console.log(`[API Seed] Access Token: ${accessToken ? 'Present' : 'Missing'}`);
    
    if (!response.ok) {
      console.error(`[API Seed] Error response: ${text.substring(0, 300)}`);
      throw new Error(`Failed to seed project: ${response.status} - ${text.substring(0, 200)}`);
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`[API Seed] Invalid JSON: ${text.substring(0, 300)}`);
      throw new Error(`Invalid JSON response (status ${response.status}): ${text.substring(0, 200)}`);
    }
  }, { teamId, name });

  console.log(`✅ Seeded project via API: ${name} (${result.id})`);
  
  return {
    id: result.id,
    name: result.name,
  };
}

/**
 * Seed an objective via API
 * 
 * @param page - Playwright page object
 * @param projectId - Project ID to create objective under
 * @param objectiveName - Optional objective name
 * @returns Created objective object with ID
 */
export async function seedObjective(
  page: Page,
  projectId: string,
  objectiveName?: string
): Promise<{ id: string; name: string }> {
  const name = objectiveName || `API Test Objective ${Date.now()}`;
  
  // Use page.evaluate to make request with browser's session cookies AND access token
  const result = await page.evaluate(async ({ projectId, name }) => {
    // Get access token from Supabase localStorage
    let accessToken = '';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase.auth.token')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            accessToken = parsed.access_token || parsed.currentSession?.access_token || '';
            break;
          } catch (e) {
            // Continue searching
          }
        }
      }
    }

    const response = await fetch(`/api/projects/${projectId}/objectives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`Failed to seed objective: ${response.status} - ${text.substring(0, 200)}`);
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
    }
  }, { projectId, name });

  console.log(`✅ Seeded objective via API: ${name} (${result.id})`);
  
  return {
    id: result.id,
    name: result.name,
  };
}

/**
 * Seed a task via API
 * 
 * @param page - Playwright page object
 * @param objectiveId - Objective ID to create task under
 * @param taskTitle - Optional task title
 * @param options - Additional options (assignees, etc.)
 * @returns Created task object with ID
 */
export async function seedTask(
  page: Page,
  objectiveId: string,
  taskTitle?: string,
  options?: {
    description?: string;
    assigneeIds?: string[];
  }
): Promise<{ id: string; title: string }> {
  const title = taskTitle || `API Test Task ${Date.now()}`;
  const description = options?.description || '';
  const assigneeIds = options?.assigneeIds || [];
  
  // Use page.evaluate to make request with browser's session cookies AND access token
  const result = await page.evaluate(async ({ objectiveId, title, description, assigneeIds }) => {
    // Get access token from Supabase localStorage
    let accessToken = '';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase.auth.token')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            accessToken = parsed.access_token || parsed.currentSession?.access_token || '';
            break;
          } catch (e) {
            // Continue searching
          }
        }
      }
    }

    const response = await fetch(`/api/objectives/${objectiveId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        description,
        assigneeIds,
      }),
    });

    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`Failed to seed task: ${response.status} - ${text.substring(0, 200)}`);
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
    }
  }, { objectiveId, title, description, assigneeIds });

  console.log(`✅ Seeded task via API: ${title} (${result.id})`);
  
  return {
    id: result.id,
    title: result.title,
  };
}

/**
 * Complete test data setup: Project -> Objective -> Task
 * 
 * This is the most common pattern for RRGT/Touchbase tests
 * 
 * @param page - Playwright page object
 * @param teamId - Team ID
 * @param userId - User ID to assign task to
 * @param options - Custom names for entities
 * @returns Complete hierarchy with IDs
 */
export async function seedCompleteHierarchy(
  page: Page,
  teamId: string,
  userId: string,
  options?: {
    projectName?: string;
    objectiveName?: string;
    taskTitle?: string;
  }
): Promise<{
  project: { id: string; name: string };
  objective: { id: string; name: string };
  task: { id: string; title: string };
}> {
  console.log('🌱 Seeding complete hierarchy via API...');
  
  // Create project
  const project = await seedProject(page, teamId, options?.projectName);
  
  // Create objective
  const objective = await seedObjective(page, project.id, options?.objectiveName);
  
  // Create task
  const task = await seedTask(page, objective.id, options?.taskTitle, {
    assigneeIds: [userId],
  });
  
  console.log('✅ Complete hierarchy seeded:', {
    project: project.name,
    objective: objective.name,
    task: task.title,
  });
  
  return { project, objective, task };
}

/**
 * Seed RRGT item via API
 * 
 * @param page - Playwright page object
 * @param taskId - Task ID
 * @param teamMemberId - Team member ID
 * @param columnIndex - Column index (1-6)
 * @param title - Item title
 * @returns Created RRGT item
 */
export async function seedRrgtItem(
  page: Page,
  taskId: string,
  teamMemberId: string,
  columnIndex: number,
  title?: string
): Promise<{ id: string; title: string }> {
  const itemTitle = title || `API Test Item ${Date.now()}`;
  
  const response = await page.request.post('/api/rrgt/items', {
    data: {
      taskId,
      teamMemberId,
      columnIndex,
      title: itemTitle,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed RRGT item: ${response.status()} ${await response.text()}`);
  }

  const item = await response.json();
  console.log(`✅ Seeded RRGT item via API: ${itemTitle} (Column ${columnIndex})`);
  
  return {
    id: item.id,
    title: item.title,
  };
}

/**
 * Helper to get user's team member ID from profile
 */
export async function getTeamMemberId(page: Page): Promise<string | null> {
  try {
    const response = await page.request.get('/api/auth/profile');
    if (response.ok()) {
      const profile = await response.json();
      return profile.teamMemberId || profile.id;
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch team member ID:', error);
  }
  return null;
}
