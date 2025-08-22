import { test, expect } from '@playwright/test';
import fs from 'fs/promises';

function countOccurrences(haystack: string, needle: string): number {
  return (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

async function parsePdfToText(buffer: Buffer): Promise<string> {
  let text = '';
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(buffer);
  const loadingTask = (pdfjsLib as any).getDocument({ data: uint8, disableWorker: true } as any);
  const pdf = await loadingTask.promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i);
    const txt = await p.getTextContent();
    const pageText = (txt.items as any[])
      .map((it) => (typeof (it as any)?.str === 'string' ? (it as any).str : ''))
      .join(' ');
    text += pageText + '\n';
  }
  return text;
}

test.describe('Full Project PDF - no placeholders when all steps answered', () => {
  test('exports with all module steps answered and no placeholders', async ({ page }) => {
    const sessionId = 'e2e_session_no_placeholder';
    const BS_STEPS = 5;
    const CH_STEPS = 5;
    const OBJ_STEPS = 7;

    const tasksSeed = Array.from({ length: 12 }).map((_, i) => ({
      id: String(5000 + i),
      task: `NP Task ${i + 1}`,
      person: `User NP${(i % 3) + 1}`,
      status: i % 3 === 0 ? 'To Do' : i % 3 === 1 ? 'In Progress' : 'Done',
      date: `2025-05-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    const answersSeed: Record<string, any> = {};
    for (let s = 1; s <= BS_STEPS; s++) {
      answersSeed[`journey_${sessionId}_brainstorm_step_${s}`] = { step: s, answer: `NP BS Step ${s} Answer` };
    }
    for (let s = 1; s <= CH_STEPS; s++) {
      answersSeed[`journey_${sessionId}_choose_step_${s}`] = { step: s, answer: `NP CH Step ${s} Answer` };
    }
    for (let s = 1; s <= OBJ_STEPS; s++) {
      answersSeed[`journey_${sessionId}_objectives_step_${s}`] = { step: s, answer: `NP OBJ Step ${s} Answer` };
    }

    await page.addInitScript(({ tasksSeed, answersSeed, sessionId }) => {
      localStorage.setItem(
        'objectiveBuilderSession',
        JSON.stringify({ taskList: tasksSeed, tasks: tasksSeed, lastModified: new Date().toISOString() })
      );
      localStorage.setItem('journey_session_id', sessionId);
      for (const [k, v] of Object.entries(answersSeed as Record<string, any>)) {
        localStorage.setItem(k, JSON.stringify(v));
      }
    }, { tasksSeed, answersSeed, sessionId });

    await page.goto('/tasks');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Full Project as PDF/i }).click(),
    ]);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    const text = await parsePdfToText(buffer);

    // Basic sanity
    expect(text).toContain('Arrowhead Project Report');

    // No placeholders should appear
    expect(text).not.toContain('[No response provided yet]');

    // Unique answers should appear exactly once overall
    const checks: string[] = [];
    for (let s = 1; s <= BS_STEPS; s++) checks.push(`NP BS Step ${s} Answer`);
    for (let s = 1; s <= CH_STEPS; s++) checks.push(`NP CH Step ${s} Answer`);
    for (let s = 1; s <= OBJ_STEPS; s++) checks.push(`NP OBJ Step ${s} Answer`);

    for (const u of checks) {
      expect(countOccurrences(text, u)).toBe(1);
    }
  });
});
