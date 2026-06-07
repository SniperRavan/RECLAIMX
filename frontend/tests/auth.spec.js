import { test } from '@playwright/test';

test('find script failure', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type(), msg.text());
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('/pages/login.html');

  await page.waitForTimeout(5000);

  const result = await page.evaluate(() => ({
    apiBase: window.API_BASE,
    signIn: typeof window.signInWithEmail,
  }));

  console.log(result);
});
