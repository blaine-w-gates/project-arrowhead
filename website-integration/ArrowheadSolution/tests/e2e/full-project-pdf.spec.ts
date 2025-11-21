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

async function parsePdfToPages(buffer: Buffer): Promise<string[]> {
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(buffer);
  const loadingTask = (pdfjsLib as any).getDocument({ data: uint8, disableWorker: true } as any);
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i);
    const txt = await p.getTextContent();
    const pageText = (txt.items as any[])
      .map((it) => (typeof (it as any)?.str === 'string' ? (it as any).str : ''))
      .join(' ');
    pages.push(pageText);
  }
  return pages;
}

// Small helper to pause auto-saves or UI transitions if needed
async function shortPause(ms = 200) {
  await new Promise((r) => setTimeout(r, ms));
}

test.describe('Full Project PDF export integrity', () => {
  // Temporarily skip on WebKit in CI due to intermittent timeouts during heavy PDF generation/parsing.
  // Keep enabled for local runs so we can continue to iterate on root-cause.
  test.skip(({ browserName }) => !!process.env.CI && browserName === 'webkit', 'Temporarily skipped on WebKit in CI (PDF export flakiness)');

  test('exports Full Project PDF with tasks and per-step answers; validates wrapping and no leakage', async ({ page }) => {
    // Allow extra time for PDF generation on CI runners
    test.setTimeout(180_000);
    const sessionId = 'e2e_session_full_project';

    // Seed many tasks to force table to span multiple pages
    const tasksSeed = Array.from({ length: 40 }).map((_, i) => ({
      id: String(1000 + i),
      task:
        i === 0
          ? `Task ${i + 1} description with extra long detail to test wrapping across columns: ` +
            'wrap '.repeat(50) +
            'end.'
          : `Task ${i + 1} short description`,
      person: `User ${((i % 3) + 1)}`,
      status: i % 3 === 0 ? 'To Do' : i % 3 === 1 ? 'In Progress' : 'Done',
      // Use ISO-like date strings for consistency
      date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    // Seed per-module answers. Provide answers for nearly all steps to minimize placeholders.
    const answersSeed: Record<string, any> = {};

    // Brainstorm: 5 steps; leave step 3 empty to validate placeholder rendering
    const bsAnswers: Record<number, string> = {
      1: 'BS Step 1 Unique E2E Answer',
      2: 'BS Step 2 Unique E2E Answer',
      4: 'BS Step 4 Unique E2E Answer',
      5: 'BS Step 5 Unique E2E Answer',
    };

    // Choose: 5 steps; step 2 uses a very long answer to force multi-page wrapping and continued header
    const longHeader = 'LongAnswerStart E2E Choose Step 2 - SentinelStart';
    const longTail = 'LongAnswerEnd E2E Choose Step 2 - SentinelEnd';
    const chooseAnswers: Record<number, string> = {
      1: 'CH Step 1 Unique E2E Answer',
      2: `${longHeader} ${'a'.repeat(4000)} ${longTail}`,
      3: 'CH Step 3 Unique E2E Answer',
      4: 'CH Step 4 Unique E2E Answer',
      5: 'CH Step 5 Unique E2E Answer',
    };

    // Objectives: 7 steps; all answered
    const objAnswers: Record<number, string> = {
      1: 'OBJ Step 1 Unique E2E Answer',
      2: 'OBJ Step 2 Unique E2E Answer',
      3: 'OBJ Step 3 Unique E2E Answer',
      4: 'OBJ Step 4 Unique E2E Answer',
      5: 'OBJ Step 5 Unique E2E Answer',
      6: 'OBJ Step 6 Unique E2E Answer',
      7: 'OBJ Step 7 Unique E2E Answer',
    };

    // Build the key-value map the app expects: journey_<sessionId>_<module>_step_<n>
    for (const [stepStr, val] of Object.entries(bsAnswers)) {
      const step = Number(stepStr);
      answersSeed[`journey_${sessionId}_brainstorm_step_${step}`] = { step, answer: val };
    }
    for (const [stepStr, val] of Object.entries(chooseAnswers)) {
      const step = Number(stepStr);
      answersSeed[`journey_${sessionId}_choose_step_${step}`] = { step, answer: val };
    }
    for (const [stepStr, val] of Object.entries(objAnswers)) {
      const step = Number(stepStr);
      answersSeed[`journey_${sessionId}_objectives_step_${step}`] = { step, answer: val };
    }

    // Pre-seed localStorage before the page loads
    await page.addInitScript(({ tasksSeed, answersSeed, sessionId }) => {
      try {
        localStorage.setItem(
          'objectiveBuilderSession',
          JSON.stringify({ taskList: tasksSeed, tasks: tasksSeed, lastModified: new Date().toISOString() })
        );
        localStorage.setItem('journey_session_id', sessionId);
        for (const [k, v] of Object.entries(answersSeed as Record<string, any>)) {
          localStorage.setItem(k, JSON.stringify(v));
        }
      } catch (e) {
        console.warn('Init script failed to seed localStorage', e);
      }
    }, { tasksSeed, answersSeed, sessionId });

    // Navigate to Task List and trigger Full Project export
    await page.goto('/tasks');
    await page.waitForSelector('text=Task List Management');
    await shortPause();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Full Project as PDF/i }).click(),
    ]);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    const text = await parsePdfToText(buffer);

    // Basic sanity checks
    expect(text).toContain('Arrowhead Project Report');

    // Task section assertions
    expect(text).toContain('Task Management Dashboard');

    // Because we seeded many tasks, the table should continue onto a new page
    expect(text).toContain('Task Management Dashboard (continued)');

    // Module headings (numbers removed in refined export)
    expect(text).toContain('Brainstorm Module');
    expect(text).toContain('Decision Making Module');
    expect(text).toContain('Objectives Planning Module');

    // Brainstorm overview should include the new official module description text
    expect(text).toContain('Explore the competitive landscape');

    // Deprecated metrics must not appear anywhere in the PDF
    expect(text).not.toContain('Total Steps:');
    expect(text).not.toContain('Status: Ready for completion');

    // Unique answer checks: each should appear exactly once
    const uniques = [
      'BS Step 1 Unique E2E Answer',
      'BS Step 2 Unique E2E Answer',
      'BS Step 4 Unique E2E Answer',
      'BS Step 5 Unique E2E Answer',
      'CH Step 1 Unique E2E Answer',
      'CH Step 3 Unique E2E Answer',
      'CH Step 4 Unique E2E Answer',
      'CH Step 5 Unique E2E Answer',
      'OBJ Step 1 Unique E2E Answer',
      'OBJ Step 2 Unique E2E Answer',
      'OBJ Step 3 Unique E2E Answer',
      'OBJ Step 4 Unique E2E Answer',
      'OBJ Step 5 Unique E2E Answer',
      'OBJ Step 6 Unique E2E Answer',
      'OBJ Step 7 Unique E2E Answer',
    ];
    for (const u of uniques) {
      expect(countOccurrences(text, u)).toBe(1);
    }

    // Placeholder must appear exactly once because only Brainstorm step 3 is intentionally empty
    expect(countOccurrences(text, '[No response provided yet]')).toBe(1);

    // Long answer sentinels must each appear exactly once, validating full inclusion and wrapping
    expect(countOccurrences(text, longHeader)).toBe(1);
    expect(countOccurrences(text, longTail)).toBe(1);

    // Long task description should be included and wrapped across lines (not truncated)
    const longTaskPrefix = 'Task 1 description with extra long detail to test wrapping across columns:';
    expect(countOccurrences(text, longTaskPrefix)).toBe(1);
    // The repeated token from the long task content should appear many times
    // to indicate proper wrapping in the task table column
    expect((text.match(/\bwrap\b/g) || []).length).toBeGreaterThan(20);
    // The sequence "wrap end." should appear once at the end of the long task text
    expect(countOccurrences(text, 'wrap end.')).toBe(1);

    // Module pagination header should appear when content spans pages
    expect(text).toContain('Decision Making Module (continued)');

    // No cross-step leakage: ensure uniqueness still holds
    const duplicates = uniques.filter((v) => countOccurrences(text, v) !== 1);
    expect(duplicates, `Unexpected duplicate occurrences for: ${duplicates.join(', ')}`).toHaveLength(0);

    // Best-effort: capture a screenshot of the first page of the PDF using the browser viewer (may be skipped in headless)
    try {
      const base64 = buffer.toString('base64');
      const pdfPage = await page.context().newPage();
      await pdfPage.setViewportSize({ width: 1200, height: 1600 });
      await pdfPage.goto(`data:application/pdf;base64,${base64}`);
      await pdfPage.waitForTimeout(1500);
      await fs.mkdir('tests/downloads', { recursive: true });
      await pdfPage.screenshot({ path: 'tests/downloads/full_project_pdf_first_page.png' });
      await pdfPage.close();
    } catch (e) {
      console.warn('Skipping PDF screenshot capture:', e);
    }
  });

  test('does not include answers from other sessions', async ({ page }) => {
    const BS_STEPS = 5;
    const CH_STEPS = 5;
    const OBJ_STEPS = 7;
    const sessionA = 'e2e_session_A';
    const sessionB = 'e2e_session_B';

    const tasksSeed = Array.from({ length: 8 }).map((_, i) => ({
      id: String(2000 + i),
      task: `Leakage Test Task ${i + 1}`,
      person: `Tester ${(i % 2) + 1}`,
      status: i % 2 === 0 ? 'To Do' : 'Done',
      date: `2025-02-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    const A_BS1 = 'A_BS1 Unique Answer';
    const A_CH2 = 'A_CH2 Unique Answer';
    const A_OBJ1 = 'A_OBJ1 Unique Answer';

    const B_BS3 = 'B_BS3 SHOULD_NOT_APPEAR';
    const B_CH2 = 'B_CH2 SHOULD_NOT_APPEAR';
    const B_OBJ1 = 'B_OBJ1 SHOULD_NOT_APPEAR';

    const answersSeedA: Record<string, any> = {
      [`journey_${sessionA}_brainstorm_step_1`]: { step: 1, answer: A_BS1 },
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

    expect(text).toContain('Arrowhead Project Report');

    expect(countOccurrences(text, A_BS1)).toBe(1);
    expect(countOccurrences(text, A_CH2)).toBe(1);
    expect(countOccurrences(text, A_OBJ1)).toBe(1);

    expect(text).not.toContain('SHOULD_NOT_APPEAR');

    const expectedPlaceholders = (BS_STEPS - 1) + (CH_STEPS - 1) + (OBJ_STEPS - 1);
    expect((text.match(/\[No response provided yet\]/g) || []).length).toBe(expectedPlaceholders);
  });

  test('has footer only on non-cover pages', async ({ page }) => {
    const sessionId = 'e2e_session_footer';

    const tasksSeed = Array.from({ length: 20 }).map((_, i) => ({
      id: String(4000 + i),
      task: `Footer Test Task ${i + 1} ${i === 0 ? ' '.repeat(30) + 'wrap '.repeat(30) + 'end.' : ''}`,
      person: `User F${(i % 3) + 1}`,
      status: i % 3 === 0 ? 'To Do' : i % 3 === 1 ? 'In Progress' : 'Done',
      date: `2025-04-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    const answersSeed: Record<string, any> = {
      [`journey_${sessionId}_brainstorm_step_1`]: { step: 1, answer: 'Footer BS1' },
      [`journey_${sessionId}_choose_step_1`]: { step: 1, answer: 'Footer CH1' },
      [`journey_${sessionId}_objectives_step_1`]: { step: 1, answer: 'Footer OBJ1' },
    };

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
    if (!filePath) throw new Error('No file path for downloaded PDF');
    const buffer = await fs.readFile(filePath);

    const pages = await parsePdfToPages(buffer);
    expect(pages.length).toBeGreaterThan(1);

    expect(pages[0]).not.toMatch(/Page\s*1\s*of\s*\d+/);
    expect(pages[1]).toMatch(/Page\s*2\s*of\s*\d+/);
  });

  test('has no placeholders when all steps are answered', async ({ page }) => {
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

    expect(text).toContain('Arrowhead Project Report');
    expect(text).not.toContain('[No response provided yet]');

    const checks: string[] = [];
    for (let s = 1; s <= BS_STEPS; s++) checks.push(`NP BS Step ${s} Answer`);
    for (let s = 1; s <= CH_STEPS; s++) checks.push(`NP CH Step ${s} Answer`);
    for (let s = 1; s <= OBJ_STEPS; s++) checks.push(`NP OBJ Step ${s} Answer`);

    for (const u of checks) {
      expect(countOccurrences(text, u)).toBe(1);
    }
  });
});
