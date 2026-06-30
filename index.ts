/**
 * bot-telegram Admin Plugin (S45.4)
 *
 * The only fe-admin companion in the bot family. Provides:
 *  - Telegram bot CRUD (list/create/edit/delete) backed by `bot-telegram`
 *    `/admin/bots`. The token is write-only: set on create/rotate, always
 *    rendered masked (`1234****`), never re-populated from the API.
 *  - Per-bot "Set webhook" and "Send test message" actions.
 *  - A linked-accounts view backed by the GENERIC `bot-base` `/admin/links`
 *    endpoint, so it already covers future providers, not just Telegram.
 *
 * Nav + routes are permission-gated (R12): bot management behind
 * `bot_telegram.manage`, linked accounts behind `bot_base.manage`.
 */
import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

const NAV_SECTIONS = [
  {
    id: 'bot-telegram',
    label: 'Telegram Bots',
    items: [
      {
        label: 'Bots',
        to: '/admin/bot-telegram/bots',
        icon: 'bot',
        requiredPermission: 'bot_telegram.manage',
      },
      {
        label: 'Linked Accounts',
        to: '/admin/bot-telegram/links',
        icon: 'link',
        requiredPermission: 'bot_base.manage',
      },
    ],
  },
];

function addTranslations(sdk: IPlatformSDK): void {
  const bundles: Record<string, Record<string, unknown>> = {
    en: en as Record<string, unknown>,
    de: de as Record<string, unknown>,
    es: es as Record<string, unknown>,
    fr: fr as Record<string, unknown>,
    ja: ja as Record<string, unknown>,
    ru: ru as Record<string, unknown>,
    th: th as Record<string, unknown>,
    zh: zh as Record<string, unknown>,
  };
  for (const [locale, bundle] of Object.entries(bundles)) {
    sdk.addTranslations(locale, { botTelegramAdmin: bundle.botTelegramAdmin });
  }
}

export const botTelegramAdminPlugin: IPlugin = {
  name: 'bot-telegram-admin',
  version: '26.6.1',
  description: 'Telegram bot management, webhook/test actions, and linked accounts.',

  install(sdk: IPlatformSDK) {
    addTranslations(sdk);
    extensionRegistry.register('bot-telegram-admin', { navSections: NAV_SECTIONS });

    sdk.addRoute({
      path: 'bot-telegram/bots',
      name: 'bot-telegram-bots',
      component: () => import('./src/views/BotList.vue'),
      meta: { requiredPermission: 'bot_telegram.manage' },
    });
    sdk.addRoute({
      path: 'bot-telegram/bots/new',
      name: 'bot-telegram-bot-new',
      component: () => import('./src/views/BotForm.vue'),
      meta: { requiredPermission: 'bot_telegram.manage' },
    });
    sdk.addRoute({
      path: 'bot-telegram/bots/:id',
      name: 'bot-telegram-bot-edit',
      component: () => import('./src/views/BotForm.vue'),
      meta: { requiredPermission: 'bot_telegram.manage' },
    });
    sdk.addRoute({
      path: 'bot-telegram/links',
      name: 'bot-telegram-links',
      component: () => import('./src/views/BotLinksList.vue'),
      meta: { requiredPermission: 'bot_base.manage' },
    });
  },

  activate() {
    extensionRegistry.register('bot-telegram-admin', { navSections: NAV_SECTIONS });
  },

  deactivate() {
    extensionRegistry.unregister('bot-telegram-admin');
  },
};

export default botTelegramAdminPlugin;
