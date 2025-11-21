import { test, expect } from '@playwright/test';
import fs from 'fs/promises';

function countOccurrences(haystack: string, needle: string): number {
  return (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

async function shortPause(ms = 200) {
  await new Promise((r) => setTimeout(r, ms));
}

test.describe('Brainstorm PDF export integrity', () => {
  // Temporarily skip on WebKit in CI due to intermittent timeouts when handling PDF download/parsing.
  // Keep enabled locally so we can continue to investigate root cause.
  test.skip(({ browserName }) => !!process.env.CI && browserName === 'webkit', 'Temporarily skipped on WebKit in CI (PDF export flakiness)');

  test('exports Brainstorm PDF reflecting per-step answers without leakage', async ({ page }) => {
    // Allow extra time for PDF generation on CI runners
    test.setTimeout(180_000);
    // Step 1
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForSelector('#brainstormStep1Input');

    const a1 = 'Alpha One unique answer 1';
    await page.fill('#brainstormStep1Input', a1);
    await shortPause();

    // Next to Step 2
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForURL('**/journey/brainstorm/step/2');
    await page.waitForSelector('#brainstormStep2Input');

    const a2 = 'Bravo Two unique answer 2';
    await page.fill('#brainstormStep2Input', a2);
    await shortPause();

    // Next to Step 3 - enter then clear to simulate empty answer
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForURL('**/journey/brainstorm/step/3');
    await page.waitForSelector('#brainstormStep3Input');

    await page.fill('#brainstormStep3Input', 'SHOULD_BE_CLEARED_TEMP');
    await shortPause();
    await page.fill('#brainstormStep3Input', '');
    await shortPause();

    // Step 4
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForURL('**/journey/brainstorm/step/4');
    await page.waitForSelector('#brainstormStep4Input');

    const a4 = 'Delta Four unique answer 4';
    await page.fill('#brainstormStep4Input', a4);
    await shortPause();

    // Step 5 (final)
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForURL('**/journey/brainstorm/step/5');
    await page.waitForSelector('#brainstormStep5Input');

    const a5 = 'Echo Five unique answer 5';
    await page.fill('#brainstormStep5Input', a5);
    await shortPause();

    // Export Brainstorm PDF (button only appears on final step)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Brainstorm/i }).click(),
    ]);

    // Read the downloaded PDF
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const buffer = await fs.readFile(filePath!);

    // Parse PDF text in Node with pdfjs-dist via dynamic import (no network dependencies)
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

    // Basic sanity checks
    expect(text).toContain('Brainstorm');

    // The unique answers should appear exactly once
    expect(countOccurrences(text, a1)).toBe(1);
    expect(countOccurrences(text, a2)).toBe(1);
    expect(countOccurrences(text, a4)).toBe(1);
    expect(countOccurrences(text, a5)).toBe(1);

    // Cleared temp value must not appear
    expect(text).not.toContain('SHOULD_BE_CLEARED_TEMP');

    // Ensure no cross-step leakage: values should not repeat
    const duplicates = [a1, a2, a4, a5].filter((v) => countOccurrences(text, v) !== 1);
    expect(duplicates, `Unexpected duplicate occurrences for: ${duplicates.join(', ')}`).toHaveLength(0);

    // Verify simplified layout requirements
    // 1) Metrics removed from Module Overview
    expect(text).not.toContain('Total Steps:');
    expect(text).not.toContain('Status: Ready for completion');

    // 2) Updated overview text present (robust substring check)
    expect(text).toContain('Explore the competitive landscape');

    // 3) Empty step logic shows placeholder on step 3
    expect(text).toContain('[No response provided yet]');

    // Best-effort: capture a screenshot of the first page of the PDF using Chromium's built-in viewer in headed mode
    try {
      const base64 = buffer.toString('base64');
      const pdfPage = await page.context().newPage();
      await pdfPage.setViewportSize({ width: 1200, height: 1600 });
      // In headless mode, PDF viewer may not render; this is best-effort
      await pdfPage.goto(`data:application/pdf;base64,${base64}`);
      await pdfPage.waitForTimeout(1500);
      await fs.mkdir('tests/downloads', { recursive: true });
      await pdfPage.screenshot({ path: 'tests/downloads/brainstorm_pdf_first_page.png' });
      await pdfPage.close();
    } catch (e) {
      // Non-fatal: environments without PDF viewer support will skip screenshot
      console.warn('Skipping PDF screenshot capture:', e);
    }
  });
});
