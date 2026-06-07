import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/pages/login.html');

  await expect(page).toHaveTitle(/Login/i);

  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#emailBtn')).toBeVisible();
});

test('empty form shows validation', async ({ page }) => {
  await page.goto('/pages/login.html');

  await page.click('#emailBtn');

  await expect(page.locator('#errorBox'))
    .toContainText('Please enter your email and password.');
});
