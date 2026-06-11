import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { api } from '@/api';
import { ApiError } from 'vbwd-view-component';
import { useBotTelegramStore } from '../../src/stores/useBotTelegramStore';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useBotTelegramStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the bot list from the bot-telegram admin endpoint', async () => {
    (api.get as any).mockResolvedValueOnce({
      bots: [
        { id: 'b1', name: 'Support', username: 'support_bot', token: '1234****', default: true, enabled: true },
      ],
    });
    const store = useBotTelegramStore();
    await store.fetchBots();
    expect(api.get).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots');
    expect(store.bots).toHaveLength(1);
    expect(store.bots[0].username).toBe('support_bot');
  });

  it('tolerates a bare-array bots response', async () => {
    (api.get as any).mockResolvedValueOnce([
      { id: 'b1', name: 'Support', username: 'support_bot', token: '1234****', default: false, enabled: true },
    ]);
    const store = useBotTelegramStore();
    await store.fetchBots();
    expect(store.bots).toHaveLength(1);
  });

  it('fetches a single bot and unwraps the { bot } envelope', async () => {
    (api.get as any).mockResolvedValueOnce({
      bot: { id: 'b1', name: 'Support', username: 'support_bot', token: '1234****', default: false, enabled: true },
    });
    const store = useBotTelegramStore();
    const bot = await store.fetchBot('b1');
    expect(api.get).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots/b1');
    expect(bot.id).toBe('b1');
    expect(store.currentBot?.id).toBe('b1');
  });

  it('creates a bot via POST, sending the token on create', async () => {
    (api.post as any).mockResolvedValueOnce({
      bot: { id: 'b9', name: 'New', username: 'new_bot', token: '5678****', default: false, enabled: true },
    });
    const store = useBotTelegramStore();
    const saved = await store.saveBot({
      name: 'New',
      username: 'new_bot',
      token: 'realsecret5678',
      webhook_secret: 'whsec',
      enabled: true,
    });
    expect(api.post).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots', {
      name: 'New',
      username: 'new_bot',
      token: 'realsecret5678',
      webhook_secret: 'whsec',
      enabled: true,
    });
    expect(saved.id).toBe('b9');
    // The store NEVER holds the real token — only the masked value from the API.
    expect(saved.token).toBe('5678****');
  });

  it('updates a bot via PUT when an id is present', async () => {
    (api.put as any).mockResolvedValueOnce({
      bot: { id: 'b1', name: 'Renamed', username: 'support_bot', token: '1234****', default: false, enabled: true },
    });
    const store = useBotTelegramStore();
    await store.saveBot({ id: 'b1', name: 'Renamed', username: 'support_bot', enabled: true });
    expect(api.put).toHaveBeenCalledWith(
      '/plugins/bot-telegram/admin/bots/b1',
      expect.objectContaining({ name: 'Renamed' }),
    );
  });

  it('OMITS the token field on update when it was left blank (write-only, never re-sent)', async () => {
    (api.put as any).mockResolvedValueOnce({
      bot: { id: 'b1', name: 'Support', username: 'support_bot', token: '1234****', default: false, enabled: true },
    });
    const store = useBotTelegramStore();
    await store.saveBot({ id: 'b1', name: 'Support', username: 'support_bot', token: '', enabled: true });
    const payload = (api.put as any).mock.calls[0][1];
    expect('token' in payload).toBe(false);
  });

  it('SENDS the token on update when a new value was entered (rotation)', async () => {
    (api.put as any).mockResolvedValueOnce({
      bot: { id: 'b1', name: 'Support', username: 'support_bot', token: 'abcd****', default: false, enabled: true },
    });
    const store = useBotTelegramStore();
    await store.saveBot({ id: 'b1', name: 'Support', username: 'support_bot', token: 'rotated-abcd', enabled: true });
    const payload = (api.put as any).mock.calls[0][1];
    expect(payload.token).toBe('rotated-abcd');
  });

  it('deletes a bot and refreshes the list', async () => {
    (api.delete as any).mockResolvedValueOnce({ deleted: true });
    (api.get as any).mockResolvedValueOnce({ bots: [] });
    const store = useBotTelegramStore();
    await store.deleteBot('b1');
    expect(api.delete).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots/b1');
    expect(api.get).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots');
  });

  it('calls the set-webhook endpoint with the public base url', async () => {
    (api.post as any).mockResolvedValueOnce({ ok: true, telegram: { ok: true } });
    const store = useBotTelegramStore();
    await store.setWebhook('b1', 'https://example.test');
    expect(api.post).toHaveBeenCalledWith(
      '/plugins/bot-telegram/admin/bots/b1/set-webhook',
      { public_base_url: 'https://example.test' },
    );
  });

  it('calls the set-webhook endpoint without a body when no base url is given', async () => {
    (api.post as any).mockResolvedValueOnce({ ok: true, telegram: { ok: true } });
    const store = useBotTelegramStore();
    await store.setWebhook('b1');
    expect(api.post).toHaveBeenCalledWith('/plugins/bot-telegram/admin/bots/b1/set-webhook', {});
  });

  it('sends a test message and reports success', async () => {
    (api.post as any).mockResolvedValueOnce({ ok: true });
    const store = useBotTelegramStore();
    const result = await store.sendTest('b1', '12345', 'hi');
    expect(api.post).toHaveBeenCalledWith(
      '/plugins/bot-telegram/admin/bots/b1/test',
      { chat_id: '12345', text: 'hi' },
    );
    expect(result.status).toBe('ok');
  });

  it('omits the text field from the test payload when no text is given', async () => {
    (api.post as any).mockResolvedValueOnce({ ok: true });
    const store = useBotTelegramStore();
    await store.sendTest('b1', '12345');
    expect(api.post).toHaveBeenCalledWith(
      '/plugins/bot-telegram/admin/bots/b1/test',
      { chat_id: '12345' },
    );
  });

  it('reports a distinct rate-limited result on HTTP 429', async () => {
    (api.post as any).mockRejectedValueOnce(new ApiError('Too many requests', 429));
    const store = useBotTelegramStore();
    const result = await store.sendTest('b1', '12345');
    expect(result.status).toBe('rate_limited');
  });

  it('reports a generic error result for other failures (and surfaces the message)', async () => {
    (api.post as any).mockRejectedValueOnce(new ApiError('Telegram unreachable', 502));
    const store = useBotTelegramStore();
    const result = await store.sendTest('b1', '12345');
    expect(result.status).toBe('error');
    expect(result.message).toBe('Telegram unreachable');
  });
});
