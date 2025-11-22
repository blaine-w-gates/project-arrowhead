import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../fixtures/auth.fixture';
import { seedRrgtPlan } from '../fixtures/api.fixture';

// This atomic test verifies that we can seed RRGT plans directly via supabaseAdmin
// without touching the UI, in line with the God Mode seeding strategy.

// Optionally skip in CI / WebKit until hardened, similar to other RRGT atomic tests.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Skip RRGT seeding atomic test in CI and on WebKit while hardening.'
);

test.describe('RRGT - God Mode Seeding', () => {
  test('can seed RRGT plan, rabbit, and subtasks via supabaseAdmin', async ({ page }) => {
    void page; // not used; this test is pure DB seeding via supabaseAdmin

    // Seed prerequisite entities entirely via supabaseAdmin to avoid REST/UI races
    const teamName = `RRGT Seeding Team ${Date.now()}`;

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: teamName,
      })
      .select('id')
      .single();

    if (teamError || !team?.id) {
      throw new Error(`Failed to seed team (DB): ${teamError?.message || 'no data returned'}`);
    }

    const teamId: string = team.id;

    const memberName = `RRGT Seeder ${Date.now()}`;
    const memberEmail = `rrgt.seeder+${Date.now()}@example.com`;

    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: teamId,
        name: memberName,
        email: memberEmail,
        role: 'Team Member',
        is_virtual: false,
        invite_status: 'active',
      })
      .select('id')
      .single();

    if (memberError || !member?.id) {
      throw new Error(`Failed to seed team member (DB): ${memberError?.message || 'no data returned'}`);
    }

    const teamMemberId: string = member.id;

    const projectName = `RRGT Seeding Project ${Date.now()}`;

    const { data: projectRow, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        team_id: teamId,
        name: projectName,
      })
      .select('id')
      .single();

    if (projectError || !projectRow?.id) {
      throw new Error(`Failed to seed project (DB): ${projectError?.message || 'no data returned'}`);
    }

    const project = { id: projectRow.id as string, name: projectName };

    const objectiveName = `RRGT Seeding Objective ${Date.now()}`;

    const { data: objectiveRow, error: objectiveError } = await supabaseAdmin
      .from('objectives')
      .insert({
        project_id: project.id,
        name: objectiveName,
        current_step: 1,
        journey_status: 'draft',
      })
      .select('id')
      .single();

    if (objectiveError || !objectiveRow?.id) {
      throw new Error(`Failed to seed objective (DB): ${objectiveError?.message || 'no data returned'}`);
    }

    const objective = { id: objectiveRow.id as string, name: objectiveName };

    const taskTitle = `RRGT Seeding Task ${Date.now()}`;

    const { data: taskRow, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert({
        objective_id: objective.id,
        title: taskTitle,
        status: 'todo',
        priority: 2,
      })
      .select('id, title')
      .single();

    if (taskError || !taskRow?.id) {
      throw new Error(`Failed to seed task (DB): ${taskError?.message || 'no data returned'}`);
    }

    const task = { id: taskRow.id as string, title: taskRow.title as string };

    const subtasks = ['First step', 'Second step', 'Third step'];
    const rabbitColumn = 2;

    const { planId } = await seedRrgtPlan({
      taskId: task.id,
      teamMemberId,
      projectId: project.id,
      objectiveId: objective.id,
      subtasks,
      rabbitColumn,
    });

    expect(planId).toBeTruthy();

    // Verify plan row exists and is wired correctly
    const { data: plans, error: planError } = await supabaseAdmin
      .from('rrgt_plans')
      .select('id, task_id, team_member_id, project_id, objective_id, max_column_index')
      .eq('id', planId);

    expect(planError).toBeNull();
    expect(plans).toBeTruthy();
    expect(plans?.length).toBe(1);

    const plan = plans![0] as any;
    expect(plan.task_id).toBe(task.id);
    expect(plan.team_member_id).toBe(teamMemberId);
    expect(plan.project_id).toBe(project.id);
    expect(plan.objective_id).toBe(objective.id);
    expect(plan.max_column_index).toBeGreaterThanOrEqual(6);

    // Verify subtasks
    const { data: subtaskRows, error: subtaskError } = await supabaseAdmin
      .from('rrgt_subtasks')
      .select('plan_id, column_index, text')
      .eq('plan_id', planId)
      .order('column_index', { ascending: true });

    expect(subtaskError).toBeNull();
    expect(subtaskRows).toBeTruthy();
    expect(subtaskRows?.length).toBe(subtasks.length);

    subtaskRows!.forEach((row: any, idx: number) => {
      expect(row.plan_id).toBe(planId);
      expect(row.column_index).toBe(idx + 1);
      expect(row.text).toBe(subtasks[idx]);
    });

    // Verify rabbit state
    const { data: rabbit, error: rabbitError } = await supabaseAdmin
      .from('rrgt_rabbits')
      .select('plan_id, current_column_index')
      .eq('plan_id', planId)
      .single();

    expect(rabbitError).toBeNull();
    expect(rabbit).toBeTruthy();
    expect(rabbit!.plan_id).toBe(planId);
    expect(rabbit!.current_column_index).toBe(rabbitColumn);
  });
});
