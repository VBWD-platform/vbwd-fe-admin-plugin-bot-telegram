/**
 * bot-telegram-admin — admin dashboard e2e (S45.4)
 *
 * Verifies the fe-admin companion for `bot-telegram`:
 *   - Bot CRUD: create a bot, then confirm the token is rendered MASKED
 *     (never the real value) after save.
 *   - Per-bot actions: Set Webhook + Send Test buttons are reachable and
 *     surface a result.
 *   - Linked-accounts view reads the GENERIC bot-base `/admin/links` and
 *     shows a seeded link row.
 *
 * Navigation is by URL (the admin navbar became dropdown groups; the flat
 * nav helper is broken — see project_fe_admin_navbar_e2e_helper_rot). Auth is
 * a real admin login, which seeds BOTH `admin_token` and `admin_token_user`
 * (token alone redirects to /admin/login — project_fe_admin_e2e_auth_harness).
 *
 * Run via:
 *   E2E_BASE_URL=http://localhost:8081 npx playwright test bot-telegram-admin
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = `${BASE}/api/v1`;
const ADMIN_EMAIL = process.env.VBWD_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.VBWD_ADMIN_PASSWORD ?? 'AdminPass123@';

async function loginAsAdmin(page: Page): Promise<string> {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForLoadState('networkidle');
  const onLogin = await page
    .locator('[data-testid="login-form"], [data-testid="username-input"], input#username')
    .first()
    .isVisible()
    .catch(() => false);
  if (onLogin) {
    await page.locator('[data-testid="username-input"], input#username').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="password-input"], input#password').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="login-button"], button[type="submit"]').click();
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20_000 });
  }
  // A real login seeds BOTH admin_token AND admin_token_user.
  return (await page.evaluate(() => localStorage.getItem('admin_token'))) || '';
}

async function apiPost(token: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test.describe('bot-telegram-admin', () => {
  let token = '';

  test.beforeEach(async ({ page }) => {
    token = await loginAsAdmin(page);
  });

  test('Telegram Bots nav section renders in the sidebar', async ({ page }) => {
    await page.goto(`${BASE}/admin/dashboard`);
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('aside, nav, .sidebar, .admin-sidebar').first();
    await expect(sidebar).toContainText(/Telegram Bots|Bots/i, { timeout: 10_000 });
  });

  test('create a bot → token is shown MASKED after save (never the real value)', async ({ page }) => {
    const unique = `e2e_${Date.now()}`;
    const realToken = '987654321:THIS_IS_THE_REAL_SECRET_TOKEN_VALUE';

    await page.goto(`${BASE}/admin/bot-telegram/bots/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="bot-telegram-bot-form"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="field-name"]').fill(`E2E Bot ${unique}`);
    await page.locator('[data-testid="field-username"]').fill(`${unique}_bot`);
    await page.locator('[data-testid="field-token"]').fill(realToken);
    await page.locator('[data-testid="btn-save-bot"]').click();

    // Redirected back to the list; the new row shows a MASKED token.
    await page.waitForURL(/\/admin\/bot-telegram\/bots$/, { timeout: 15_000 });
    const row = page.locator('[data-testid="bot-row"]', { hasText: `${unique}_bot` });
    await expect(row).toBeVisible({ timeout: 10_000 });

    const maskedCell = row.locator('[data-testid="bot-token-masked"]');
    const masked = (await maskedCell.textContent())?.trim() ?? '';
    expect(masked).toContain('****');
    // The real secret must NEVER appear anywhere on the page.
    expect(masked).not.toContain('THIS_IS_THE_REAL_SECRET');
    await expect(page.locator('body')).not.toContainText('THIS_IS_THE_REAL_SECRET');
  });

  test('Set Webhook + Send Test actions are reachable on a bot row', async ({ page }) => {
    await page.goto(`${BASE}/admin/bot-telegram/bots`);
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('[data-testid="bot-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await expect(firstRow.locator('[data-testid="btn-set-webhook"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="btn-send-test"]')).toBeVisible();

    // Send Test: a chat id is prompted; an invalid id surfaces a result banner
    // (success / rate-limited / error are all surfaced via the same banner).
    page.once('dialog', (dialog) => dialog.accept('123456789'));
    await firstRow.locator('[data-testid="btn-send-test"]').click();
    await expect(page.locator('[data-testid="bot-action-result"]')).toBeVisible({ timeout: 10_000 });
  });

  test('linked-accounts view shows a seeded link row (generic bot-base /admin/links)', async ({ page }) => {
    // Seed a link through the bot-base admin API (the service layer) so the
    // view has a deterministic row. Provider is arbitrary — the view is generic.
    const usersRes = await fetch(`${API}/admin/users?per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersBody = await usersRes.json().catch(() => ({}));
    const seededUserId: string | undefined =
      usersBody?.items?.[0]?.id ?? usersBody?.users?.[0]?.id;
    test.skip(!seededUserId, 'No seed user available to attach a link to.');

    await apiPost(token, '/plugins/bot/admin/links', {
      provider_id: 'telegram',
      external_user_id: `e2e_${Date.now()}`,
      vbwd_user_id: seededUserId,
    }).catch(() => undefined);

    await page.goto(`${BASE}/admin/bot-telegram/links`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin/bot-telegram/links');
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('[data-testid="bot-telegram-links"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="link-row"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
