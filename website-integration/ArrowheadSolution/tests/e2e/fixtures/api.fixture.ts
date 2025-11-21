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
import { supabaseAdmin, ensureAuthToken } from './auth.fixture';

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

  // Use the authenticated Express API so data is created in the same
  // database the app under test is using.
  const token = await ensureAuthToken(page);

  const response = await page.request.post(`/api/teams/${teamId}/projects`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    data: { name },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to seed project (API): HTTP ${response.status()}${body ? ` - ${body}` : ''}`
    );
  }

  const json = await response.json() as any;
  const project = json.project ?? json;

  if (!project?.id || !project?.name) {
    throw new Error('Failed to seed project (API): invalid response shape');
  }

  console.log(`✅ Seeded project via API: ${project.name} (${project.id})`);

  return {
    id: project.id,
    name: project.name,
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
  void page;

  const name = objectiveName || `API Test Objective ${Date.now()}`;

  const { data, error } = await supabaseAdmin
    .from('objectives')
    .insert({
      project_id: projectId,
      name,
      current_step: 1,
      journey_status: 'draft',
    })
    .select('id, name')
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed objective (DB): ${error?.message || 'no data returned'}`);
  }

  console.log(`✅ Seeded objective via DB: ${name} (${data.id})`);

  return {
    id: data.id,
    name: data.name,
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
  void page;

  const title = taskTitle || `API Test Task ${Date.now()}`;
  const description = options?.description || '';
  const assigneeIds = options?.assigneeIds || [];

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      objective_id: objectiveId,
      title,
      description: description || null,
      status: 'todo',
      priority: 2,
    })
    .select('id, title')
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed task (DB): ${error?.message || 'no data returned'}`);
  }

  if (assigneeIds.length > 0) {
    const { error: assignError } = await supabaseAdmin
      .from('task_assignments')
      .upsert(
        assigneeIds.map((teamMemberId) => ({
          task_id: data.id,
          team_member_id: teamMemberId,
        })),
        { onConflict: 'task_id,team_member_id' as any },
      );

    if (assignError) {
      throw new Error(`Failed to create task assignments (DB): ${assignError.message}`);
    }
  }

  console.log(`✅ Seeded task via DB: ${title} (${data.id})`);

  return {
    id: data.id,
    title: data.title,
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
  console.log('🌱 Seeding complete hierarchy via DB...');

  // Create project
  const project = await seedProject(page, teamId, options?.projectName);

  // Ensure the current team member is assigned to this project to satisfy RLS
  const { error: assignmentError } = await supabaseAdmin
    .from('team_member_project_assignments')
    .upsert(
      {
        team_member_id: userId,
        project_id: project.id,
      },
      { onConflict: 'team_member_id,project_id' as any },
    );

  if (assignmentError) {
    throw new Error(`Failed to assign project to team member (DB): ${assignmentError.message}`);
  }

  // Create objective
  const objective = await seedObjective(page, project.id, options?.objectiveName);

  // Create task (assigned to this team member)
  const task = await seedTask(page, objective.id, options?.taskTitle, {
    assigneeIds: [userId],
  });

  console.log('✅ Complete hierarchy seeded (DB):', {
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
