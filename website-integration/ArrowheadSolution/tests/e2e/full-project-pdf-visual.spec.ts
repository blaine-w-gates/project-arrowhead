import { test, expect } from '@playwright/test';
import fs from 'fs/promises';

async function parsePdfBufferToBase64(buffer: Buffer): Promise<string> {
  return buffer.toString('base64');
}

test.describe('Full Project PDF - visual regression (optional)', () => {
  test('first page visual snapshot', async ({ page }) => {
    test.skip(process.env.E2E_VISUAL !== '1', 'Visual test disabled unless E2E_VISUAL=1');

    const sessionId = 'e2e_visual_session';

    // Minimal but deterministic seed
    const tasksSeed = Array.from({ length: 10 }).map((_, i) => ({
      id: String(3000 + i),
      task: `Visual Task ${i + 1} ${i === 0 ? ' '.repeat(50) + 'wrap '.repeat(20) + 'end.' : ''}`,
      person: `User V${(i % 3) + 1}`,
      status: i % 3 === 0 ? 'To Do' : i % 3 === 1 ? 'In Progress' : 'Done',
      date: `2025-03-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    const answersSeed: Record<string, any> = {
      [`journey_${sessionId}_brainstorm_step_1`]: { step: 1, answer: 'Visual BS Step 1' },
      [`journey_${sessionId}_choose_step_1`]: { step: 1, answer: 'Visual CH Step 1' },
      [`journey_${sessionId}_objectives_step_1`]: { step: 1, answer: 'Visual OBJ Step 1' },
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

    // Render first page via pdf.js in a browser page and snapshot a canvas
    const base64 = await parsePdfBufferToBase64(buffer);
    const pdfPage = await page.context().newPage();
    await pdfPage.setViewportSize({ width: 1400, height: 1800 });
    await pdfPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PDF Canvas Render</title>
          <style>
            html, body { margin: 0; padding: 0; background: #ffffff; }
            #pdf-canvas { display: block; margin: 0 auto; background: #ffffff; }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
        </head>
        <body>
          <canvas id="pdf-canvas" width="1200" height="1600"></canvas>
          <script>
            (async () => {
              function waitFor(cond, timeout = 20000) {
                return new Promise((resolve, reject) => {
                  const start = Date.now();
                  const tick = () => {
                    try {
                      if (cond()) return resolve(true);
                      if (Date.now() - start > timeout) return reject(new Error('waitFor timeout'));
                      setTimeout(tick, 50);
                    } catch (e) {
                      reject(e);
                    }
                  };
                  tick();
                });
              }

              await waitFor(() => !!window['pdfjsLib']);
              await waitFor(() => !!window['PDF_DATA_BASE64']);

              const pdfjsLib = window['pdfjsLib'];
              // Disable worker to avoid separate network fetches in test env
              pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;

              const base64 = window['PDF_DATA_BASE64'];
              function base64ToUint8Array(b64) {
                const raw = atob(b64);
                const len = raw.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) arr[i] = raw.charCodeAt(i);
                return arr;
              }
              const data = base64ToUint8Array(base64);
              const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
              const pdf = await loadingTask.promise;
              const firstPage = await pdf.getPage(1);
              const scale = 1.5;
              const viewport = firstPage.getViewport({ scale });
              const canvas = document.getElementById('pdf-canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = Math.floor(viewport.width);
              canvas.height = Math.floor(viewport.height);
              await firstPage.render({ canvasContext: ctx, viewport }).promise;
              window['__renderDone'] = true;
            })().catch(e => { window['__renderError'] = String(e && e.message || e); });
          </script>
        </body>
      </html>
    `);
    await pdfPage.evaluate((b64) => { (window as any).PDF_DATA_BASE64 = b64; }, base64);
    await pdfPage.waitForFunction(() => (window as any).__renderDone === true || !!(window as any).__renderError, undefined, { timeout: 25000 });
    const renderErr = await pdfPage.evaluate(() => (window as any).__renderError || null);
    if (renderErr) throw new Error('PDF render error: ' + renderErr);

    // Create/update baseline with: npx playwright test --update-snapshots --project=chromium
    await expect(pdfPage.locator('#pdf-canvas')).toHaveScreenshot('full_project_pdf_first_page.png', {
      maxDiffPixelRatio: 0.08,
      animations: 'disabled',
    });

    await pdfPage.close();
  });
});
