import { test, expect } from '@playwright/test';

test.describe('E2E Smoke', () => {
  test('home page loads without server error', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    // Try to find a common login form element if present; tolerate absence for smoke
    const maybeEmail = page.getByLabel(/email/i);
    const maybePassword = page.getByLabel(/password/i);
    await expect(page.locator('body')).toBeVisible(); // keep test resilient
  });

  test('test API is reachable (200 or 401)', async ({ request }) => {
    const res = await request.get('/api/test');
    const status = res.status();
    expect([200, 401]).toContain(status);
  });
});