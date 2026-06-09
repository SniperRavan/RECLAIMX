import { test } from '@playwright/test';

test('login page ready', async ({ page }) => {
  await page.goto('http://localhost:3000/pages/login');

  await page.waitForFunction(
    () => typeof window.signInWithEmail === 'function'
  );

  const info = await page.evaluate(() => ({
    signIn: typeof window.signInWithEmail,
    email: !!document.getElementById('email'),
    password: !!document.getElementById('password'),
    button: !!document.getElementById('emailBtn')
  }));

  console.log(info);
});
