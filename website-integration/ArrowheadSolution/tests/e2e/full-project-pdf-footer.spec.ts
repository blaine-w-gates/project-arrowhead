import { test, expect } from '@playwright/test';
import fs from 'fs/promises';

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

// Validates footer rendering behavior in Full Project PDF: cover page should not have footer
// later pages should have "Page X of Y" footer.

test('Full Project PDF footer skip on cover page, present later', async ({ page }) => {
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
  expect(pages.length).toBeGreaterThan(1); // ensure multiple pages

  // Cover page: should NOT include footer text like "Page 1 of"
  expect(pages[0]).not.toMatch(/Page\s*1\s*of\s*\d+/);

  // Subsequent page (page index 1 => page 2): should include footer
  expect(pages[1]).toMatch(/Page\s*2\s*of\s*\d+/);
});
