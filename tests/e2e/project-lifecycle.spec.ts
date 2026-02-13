import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from './fixtures/auth.fixture';
import { cleanupTestData } from './fixtures/data.fixture';

test.describe('Project Lifecycle & Vision', () => {
    let userEmail: string;

    test.beforeEach(async ({ page }) => {
        const data = await signUpAndGetTeam(page);
        userEmail = data.email;
    });

    test.afterEach(async ({ page }) => {
        if (userEmail) {
            await cleanupTestData(userEmail, page);
        }
    });

    test('should create a project with vision and track completion', async ({ page }) => {
        // --- 1. Create Project with Vision (Progressive Flow) ---
        const addProjectBtn = page.getByRole('button', { name: 'Add Project' });
        await addProjectBtn.waitFor({ state: 'visible', timeout: 30000 });
        console.log('🔘 Add Project button found, clicking...');
        await addProjectBtn.click({ force: true });

        const projectName = `Strategic Initiative ${Date.now()}`;
        await page.getByLabel('Project Name').fill(projectName);
        await page.getByLabel('Fill out Vision now').check();
        await page.getByRole('button', { name: 'Create Project' }).click();

        // Expect Vision Modal to open
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Project Vision - Question 1 of 5')).toBeVisible();

        // Q1: Purpose
        await page.getByPlaceholder('Describe the core purpose').fill('To revolutionize the widget industry.');
        await page.getByRole('button', { name: 'Next' }).click();

        // Q2: Achieve
        await expect(page.getByText('Question 2 of 5')).toBeVisible();
        await page.getByPlaceholder('Explain the concrete outcomes').fill('Market dominance in Q4.');
        await page.getByRole('button', { name: 'Next' }).click();

        // Q3: Market
        await expect(page.getByText('Question 3 of 5')).toBeVisible();
        await page.getByPlaceholder('Describe the market').fill('Competitive widget sector.');
        await page.getByRole('button', { name: 'Next' }).click();

        // Q4: Customers
        await expect(page.getByText('Question 4 of 5')).toBeVisible();
        await page.getByPlaceholder('Summarize key traits').fill('Tech-savvy widget enthusiasts.');
        await page.getByRole('button', { name: 'Next' }).click();

        // Q5: Win
        await expect(page.getByText('Question 5 of 5')).toBeVisible();
        await page.getByPlaceholder('Explain your strategy').fill('Better UI/UX than competitors.');
        await page.getByRole('button', { name: 'Save Vision' }).click();

        // Expect Modal to close and Project Card to show
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText(projectName)).toBeVisible();
        await expect(page.getByText('Vision: 5/5 questions answered')).toBeVisible();

        // --- 2. Completion Tracker ---
        // We need to find the specific project card.
        // Robustly find the card containing the project name heading
        const projectCard = page.locator('.rounded-lg').filter({ has: page.getByRole('heading', { name: projectName }) });
        await expect(projectCard).toBeVisible();

        // Check initial state (assuming default is incomplete)
        // The Completion Tracker has a toggle.
        // Let's verify the "Mark as Complete" text is there
        await expect(projectCard.getByText('Mark as Complete')).toBeVisible();

        // Toggle completion (Status: Manual)
        // Assuming it's a switch or checkbox
        // Need to act on the specific switch inside this card
        await projectCard.getByRole('switch').click();
        await projectCard.getByRole('button', { name: 'Save Changes' }).click();

        // Expect visual confirmation (implementation dependent, maybe text change or toast)
        // For now, let's assume it persists. We'll verify persistence by reloading.
        await page.reload();
        await expect(projectCard.getByRole('switch')).toBeChecked();

        // --- 3. Archive Project ---
        // After page reload, we need to re-locate the card
        const projectCardForArchive = page.locator('.rounded-lg').filter({ has: page.getByRole('heading', { name: projectName }) });

        // Use data-testid to find the menu trigger
        await projectCardForArchive.locator('[data-testid="project-menu-trigger"]').click();

        await page.getByText('Archive Project').click();

        // Verify it disappears from Active list
        await expect(page.getByText(projectName)).not.toBeVisible();

        // Show Archived
        await page.getByRole('button', { name: 'Show Archived Projects' }).click();
        await expect(page.getByText(projectName)).toBeVisible();
        await expect(page.getByText('Archived').first()).toBeVisible();

        // --- 4. Delete Project ---
        // Let's delete from Archived view.
        // The card is now in the archived section.
        const archivedCard = page.locator('.rounded-lg').filter({ has: page.getByRole('heading', { name: projectName }) });
        await archivedCard.locator('[data-testid="project-menu-trigger"]').click();

        await page.getByText('Delete Project').click();

        // Confirm Dialog - look for the actual dialog text
        await expect(page.getByText(/Are you sure you want to delete/)).toBeVisible();
        await page.getByRole('button', { name: 'Delete Project' }).click();

        // Wait for delete dialog to close
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

        // Verify gone completely - no card with this project name should remain
        await expect(page.locator('.rounded-lg').filter({ has: page.getByRole('heading', { name: projectName }) })).not.toBeVisible();
    });
});
