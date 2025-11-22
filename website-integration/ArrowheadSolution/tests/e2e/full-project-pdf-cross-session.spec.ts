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

// Keep this test focused on cross-session leakage prevention

test.describe('Full Project PDF export - cross-session leakage prevention', () => {
  test('does not include answers from other sessions', async ({ page }) => {
    const BS_STEPS = 5;
    const CH_STEPS = 5;
    const OBJ_STEPS = 7;
    const sessionA = 'e2e_session_A';
    const sessionB = 'e2e_session_B';

    // Minimal tasks; we only care about answer scoping in this test
    const tasksSeed = Array.from({ length: 8 }).map((_, i) => ({
      id: String(2000 + i),
      task: `Leakage Test Task ${i + 1}`,
      person: `Tester ${(i % 2) + 1}`,
      status: i % 2 === 0 ? 'To Do' : 'Done',
      date: `2025-02-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    // Session A answers (current session)
    const A_BS1 = 'A_BS1 Unique Answer';
    const A_CH2 = 'A_CH2 Unique Answer';
    const A_OBJ1 = 'A_OBJ1 Unique Answer';

    // Session B answers (should NOT appear)
    const B_BS3 = 'B_BS3 SHOULD_NOT_APPEAR';
    const B_CH2 = 'B_CH2 SHOULD_NOT_APPEAR';
    const B_OBJ1 = 'B_OBJ1 SHOULD_NOT_APPEAR';

    const answersSeedA: Record<string, any> = {
      [`journey_${sessionA}_brainstorm_step_1`]: { step: 1, answer: A_BS1 },
      // Brainstorm step 3 intentionally NOT set for A to validate placeholder
      [`journey_${sessionA}_choose_step_2`]: { step: 2, answer: A_CH2 },
      [`journey_${sessionA}_objectives_step_1`]: { step: 1, answer: A_OBJ1 },
    };

    const answersSeedB: Record<string, any> = {
      [`journey_${sessionB}_brainstorm_step_3`]: { step: 3, answer: B_BS3 },
      [`journey_${sessionB}_choose_step_2`]: { step: 2, answer: B_CH2 },
      [`journey_${sessionB}_objectives_step_1`]: { step: 1, answer: B_OBJ1 },
    };

    await page.addInitScript(({ tasksSeed, answersSeedA, answersSeedB, sessionA }) => {
      try {
        localStorage.setItem(
          'objectiveBuilderSession',
          JSON.stringify({ taskList: tasksSeed, tasks: tasksSeed, lastModified: new Date().toISOString() })
        );
        localStorage.setItem('journey_session_id', sessionA);
        for (const [k, v] of Object.entries(answersSeedA as Record<string, any>)) {
          localStorage.setItem(k, JSON.stringify(v));
        }
        for (const [k, v] of Object.entries(answersSeedB as Record<string, any>)) {
          localStorage.setItem(k, JSON.stringify(v));
        }
      } catch (e) {
        console.warn('Init script failed to seed localStorage', e);
      }
    }, { tasksSeed, answersSeedA, answersSeedB, sessionA });

    await page.goto('/tasks');
    await page.waitForSelector('text=Task List Management');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Full Project as PDF/i }).click(),
    ]);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    const text = await parsePdfToText(buffer);

    // Baseline sanity
    expect(text).toContain('Arrowhead Project Report');

    // Session A answers should appear exactly once
    expect(countOccurrences(text, A_BS1)).toBe(1);
    expect(countOccurrences(text, A_CH2)).toBe(1);
    expect(countOccurrences(text, A_OBJ1)).toBe(1);

    // Session B answers should not appear at all
    expect(text).not.toContain('SHOULD_NOT_APPEAR');

    // Placeholder should appear for every unanswered step in current session
    // We answered: BS step1, CH step2, OBJ step1 -> total answered 3
    // Expected placeholders = (5-1) + (5-1) + (7-1) = 14
    const expectedPlaceholders = (BS_STEPS - 1) + (CH_STEPS - 1) + (OBJ_STEPS - 1);
    expect((text.match(/\[No response provided yet\]/g) || []).length).toBe(expectedPlaceholders);
  });
});
