import { test } from '@playwright/test';

test('verify login validation', async ({ page }) => {
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });

  await page.goto('/pages/login.html');

  const before = await page.locator('#errorBox').textContent();
  console.log({ before });

  await page.click('#emailBtn');

  await page.waitForTimeout(1000);

  const after = await page.locator('#errorBox').textContent();
  const visible = await page.locator('#errorBox').isVisible();

  console.log({
    after,
    visible
  });
});
