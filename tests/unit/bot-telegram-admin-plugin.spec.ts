import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PluginRegistry, PlatformSDK } from 'vbwd-view-component';
import botTelegramAdminPlugin from '../../index';

describe('bot-telegram-admin plugin', () => {
  let registry: PluginRegistry;
  let sdk: PlatformSDK;

  beforeEach(() => {
    registry = new PluginRegistry();
    sdk = new PlatformSDK();
  });

  it('declares correct metadata', () => {
    expect(botTelegramAdminPlugin.name).toBe('bot-telegram-admin');
    expect(botTelegramAdminPlugin.version).toBe('1.0.0');
  });

  it('registers the bot CRUD + linked-accounts routes on install', async () => {
    registry.register(botTelegramAdminPlugin);
    await registry.installAll(sdk);

    const paths = sdk.getRoutes().map((r) => r.path);
    expect(paths).toContain('bot-telegram/bots');
    expect(paths).toContain('bot-telegram/bots/new');
    expect(paths).toContain('bot-telegram/bots/:id');
    expect(paths).toContain('bot-telegram/links');
  });

  it('gates the bot routes behind bot_telegram.manage', async () => {
    registry.register(botTelegramAdminPlugin);
    await registry.installAll(sdk);

    const botRoutes = sdk
      .getRoutes()
      .filter((r) => r.path.startsWith('bot-telegram/bots'));
    expect(botRoutes.length).toBeGreaterThan(0);
    for (const route of botRoutes) {
      expect(route.meta?.requiredPermission).toBe('bot_telegram.manage');
    }
  });

  it('gates the linked-accounts route behind bot_base.manage (generic, all providers)', async () => {
    registry.register(botTelegramAdminPlugin);
    await registry.installAll(sdk);

    const linkRoute = sdk.getRoutes().find((r) => r.path === 'bot-telegram/links');
    expect(linkRoute?.meta?.requiredPermission).toBe('bot_base.manage');
  });

  it('loads all 8 locales', async () => {
    registry.register(botTelegramAdminPlugin);
    await registry.installAll(sdk);

    const translations = sdk.getTranslations() as Record<string, any>;
    for (const locale of ['en', 'de', 'es', 'fr', 'ja', 'ru', 'th', 'zh']) {
      expect(translations[locale]?.botTelegramAdmin?.bots?.title).toBeDefined();
    }
  });
});

describe('bot-telegram-admin manifest (index.ts) — nav gating', () => {
  const indexSource = readFileSync(
    resolve(process.cwd(), 'plugins/bot-telegram-admin/index.ts'),
    'utf-8',
  );

  it('declares a nav section gated by bot_telegram.manage for the bots entry', () => {
    expect(indexSource).toContain("requiredPermission: 'bot_telegram.manage'");
  });

  it('declares the linked-accounts nav entry gated by bot_base.manage', () => {
    expect(indexSource).toContain("requiredPermission: 'bot_base.manage'");
  });
});
