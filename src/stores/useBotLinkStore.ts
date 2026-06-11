/**
 * bot-base linked-accounts store (S45.4).
 *
 * Reads the GENERIC `bot-base` admin endpoint
 * (`/api/v1/plugins/bot/admin/links`) so the linked-accounts view already
 * covers every provider (telegram + future), not just Telegram. The
 * `provider_id` field on each row carries the source provider.
 */
import { defineStore } from 'pinia';
import { api } from '@/api';

/** One external-account ↔ vbwd-user binding (all providers). */
export interface BotLink {
  id: string;
  provider_id: string;
  external_user_id: string;
  vbwd_user_id: string;
  bot_ref: string | null;
  linked_at: string | null;
}

const LINKS_PATH = '/plugins/bot/admin/links';

interface BotLinkState {
  links: BotLink[];
  loading: boolean;
  error: string | null;
}

function unwrapLinks(response: unknown): BotLink[] {
  if (Array.isArray(response)) return response as BotLink[];
  const envelope = response as { links?: BotLink[] } | null;
  return Array.isArray(envelope?.links) ? (envelope!.links as BotLink[]) : [];
}

export const useBotLinkStore = defineStore('bot-base-links-admin', {
  state: (): BotLinkState => ({
    links: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchLinks() {
      this.loading = true;
      this.error = null;
      try {
        this.links = unwrapLinks(await api.get<unknown>(LINKS_PATH));
      } catch (caught) {
        this.error = (caught as Error)?.message ?? 'Failed to load linked accounts';
      } finally {
        this.loading = false;
      }
    },
  },
});
