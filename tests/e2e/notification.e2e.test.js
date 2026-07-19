const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
const { startServer, stopServer, reset } = require('./helpers/server');

const SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const token = jwt.sign({ user_id: 'usr_e2e' }, SECRET, { expiresIn: '1h' });

let PORT;

test.beforeAll(async () => {
  PORT = await startServer();
});

test.afterAll(async () => {
  await stopServer();
});

test.beforeEach(async () => {
  reset();
});

test.describe('Notification Demo Page', () => {
  test('should load the demo page', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}`);
    await expect(page.locator('h1')).toContainText('Notification Demo');
    await expect(page.locator('#tokenInput')).toBeVisible();
    await expect(page.locator('#status')).toHaveText('Disconnected');
  });

  test('should connect via websocket with valid JWT', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}`);
    await page.fill('#tokenInput', token);
    await page.click('.btn-connect');

    await expect(page.locator('#status')).toHaveText('Connected', { timeout: 5000 });
    await expect(page.locator('#status')).toHaveClass(/connected/);
  });

  test('should receive real-time notification after sending via API', async ({ page, request }) => {
    await page.goto(`http://localhost:${PORT}`);
    await page.fill('#tokenInput', token);
    await page.click('.btn-connect');
    await expect(page.locator('#status')).toHaveText('Connected', { timeout: 5000 });

    const res = await request.post(`http://localhost:${PORT}/api/v1/notifications/send`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        user_id: 'usr_e2e',
        type: 'E2E_TEST',
        title: 'Playwright Test',
        body: 'This notification was sent by an E2E test.',
        data: { test: true },
      },
    });

    expect(res.status()).toBe(201);

    const notification = page.locator('.notification-item').first();
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification.locator('.title')).toHaveText('Playwright Test');
    await expect(notification.locator('.body')).toHaveText('This notification was sent by an E2E test.');
    await expect(notification.locator('.type')).toHaveText('E2E_TEST');
  });

  test('should update badge count on new notifications', async ({ page, request }) => {
    await page.goto(`http://localhost:${PORT}`);
    await page.fill('#tokenInput', token);
    await page.click('.btn-connect');
    await expect(page.locator('#status')).toHaveText('Connected', { timeout: 5000 });

    for (let i = 1; i <= 2; i++) {
      await request.post(`http://localhost:${PORT}/api/v1/notifications/send`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          user_id: 'usr_e2e',
          type: 'BADGE_TEST',
          title: `Notification ${i}`,
          body: `Badge count test #${i}`,
        },
      });
    }

    await expect(page.locator('.notification-item')).toHaveCount(2, { timeout: 5000 });
    await expect(page.locator('#badge')).toHaveText('(2)');
  });

  test('should send notification from the demo form', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}`);
    await page.fill('#tokenInput', token);
    await page.click('.btn-connect');
    await expect(page.locator('#status')).toHaveText('Connected', { timeout: 5000 });

    await page.fill('#userId', 'usr_e2e');
    await page.fill('#notifTitle', 'Form Test');
    await page.fill('#notifBody', 'Sent from the demo form');
    await page.click('.btn-send');

    const notification = page.locator('.notification-item').first();
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification.locator('.title')).toHaveText('Form Test');
  });

  test('should disconnect cleanly', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}`);
    await page.fill('#tokenInput', token);
    await page.click('.btn-connect');
    await expect(page.locator('#status')).toHaveText('Connected', { timeout: 5000 });

    await page.click('.btn-disconnect');
    await expect(page.locator('#status')).toHaveText('Disconnected', { timeout: 5000 });
    await expect(page.locator('#status')).toHaveClass(/disconnected/);
  });
});
