import { test, expect } from '@playwright/test';

test('debug login page', async ({ page }) => {
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('/pages/login.html');

  const fnType = await page.evaluate(() => {
    return typeof window.signInWithEmail;
  });

  console.log({ fnType });

  await page.click('#emailBtn');

  const errorText = await page.locator('#errorBox').textContent();

  console.log({ errorText });

  await page.waitForTimeout(3000);
});
