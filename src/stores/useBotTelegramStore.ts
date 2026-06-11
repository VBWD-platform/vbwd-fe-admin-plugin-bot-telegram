/**
 * bot-telegram admin store (S45.4).
 *
 * Drives the Telegram bot CRUD admin surface backed by the `bot-telegram`
 * plugin (`/api/v1/plugins/bot-telegram/admin/bots`).
 *
 * Token handling (D4 — write-only): the API ALWAYS masks the token (`1234****`)
 * in every response and never returns the real value. This store therefore
 * never holds an unmasked token: it sends the operator-entered token only on
 * create/rotate, and reads back only the masked value.
 */
import { defineStore } from 'pinia';
import { ApiError } from 'vbwd-view-component';
import { api } from '@/api';

/** A Telegram bot as returned by the admin API (token is always masked). */
export interface TelegramBot {
  id: string;
  name: string;
  /** BotFather @handle, stored without the leading '@'. */
  username: string;
  /** Always masked by the server (e.g. `1234****`); never the real token. */
  token: string;
  default: boolean;
  enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * The editable shape of a bot form. `token` and `webhook_secret` are
 * write-only: set on create/rotate, never populated back from the API.
 */
export interface TelegramBotInput {
  id?: string;
  name: string;
  username: string;
  /** Operator-entered token; blank on edit means "keep the existing token". */
  token?: string;
  /** Write-only webhook secret; blank on edit means "leave unchanged". */
  webhook_secret?: string;
  default?: boolean;
  enabled?: boolean;
}

/** Outcome of a test-send, distinguishing rate-limiting from generic failure. */
export type TestSendStatus = 'ok' | 'rate_limited' | 'error';

export interface TestSendResult {
  status: TestSendStatus;
  message?: string;
}

const HTTP_TOO_MANY_REQUESTS = 429;
const BASE_PATH = '/plugins/bot-telegram/admin/bots';

interface BotTelegramState {
  bots: TelegramBot[];
  currentBot: TelegramBot | null;
  loading: boolean;
  error: string | null;
}

function unwrapBots(response: unknown): TelegramBot[] {
  if (Array.isArray(response)) return response as TelegramBot[];
  const envelope = response as { bots?: TelegramBot[] } | null;
  return Array.isArray(envelope?.bots) ? (envelope!.bots as TelegramBot[]) : [];
}

function unwrapBot(response: unknown): TelegramBot {
  const envelope = response as { bot?: TelegramBot } | null;
  return (envelope?.bot ?? response) as TelegramBot;
}

/** Build the save payload, omitting the write-only token when left blank. */
function buildPayload(input: TelegramBotInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    username: input.username,
  };
  if (input.token) payload.token = input.token;
  if (input.webhook_secret) payload.webhook_secret = input.webhook_secret;
  if (input.default !== undefined) payload.default = input.default;
  if (input.enabled !== undefined) payload.enabled = input.enabled;
  return payload;
}

export const useBotTelegramStore = defineStore('bot-telegram-admin', {
  state: (): BotTelegramState => ({
    bots: [],
    currentBot: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchBots() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get<unknown>(BASE_PATH);
        this.bots = unwrapBots(response);
      } catch (caught) {
        this.error = (caught as Error)?.message ?? 'Failed to load bots';
      } finally {
        this.loading = false;
      }
    },

    async fetchBot(id: string): Promise<TelegramBot> {
      this.loading = true;
      this.error = null;
      try {
        const bot = unwrapBot(await api.get<unknown>(`${BASE_PATH}/${id}`));
        this.currentBot = bot;
        return bot;
      } catch (caught) {
        this.error = (caught as Error)?.message ?? 'Failed to load bot';
        throw caught;
      } finally {
        this.loading = false;
      }
    },

    async saveBot(input: TelegramBotInput): Promise<TelegramBot> {
      this.loading = true;
      this.error = null;
      try {
        const payload = buildPayload(input);
        const response = input.id
          ? await api.put<unknown>(`${BASE_PATH}/${input.id}`, payload)
          : await api.post<unknown>(BASE_PATH, payload);
        const bot = unwrapBot(response);
        this.currentBot = bot;
        return bot;
      } catch (caught) {
        this.error = (caught as Error)?.message ?? 'Failed to save bot';
        throw caught;
      } finally {
        this.loading = false;
      }
    },

    async deleteBot(id: string): Promise<void> {
      await api.delete(`${BASE_PATH}/${id}`);
      await this.fetchBots();
    },

    async setWebhook(id: string, publicBaseUrl?: string): Promise<void> {
      const body = publicBaseUrl ? { public_base_url: publicBaseUrl } : {};
      await api.post(`${BASE_PATH}/${id}/set-webhook`, body);
    },

    async sendTest(id: string, chatId: string, text?: string): Promise<TestSendResult> {
      const body: Record<string, unknown> = { chat_id: chatId };
      if (text) body.text = text;
      try {
        await api.post(`${BASE_PATH}/${id}/test`, body);
        return { status: 'ok' };
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === HTTP_TOO_MANY_REQUESTS) {
          return { status: 'rate_limited', message: caught.message };
        }
        return { status: 'error', message: (caught as Error)?.message ?? 'Test send failed' };
      }
    },
  },
});
