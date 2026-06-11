import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { api } from '@/api';
import { useBotLinkStore } from '../../src/stores/useBotLinkStore';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useBotLinkStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('reads linked accounts from the GENERIC bot-base endpoint (covers all providers)', async () => {
    (api.get as any).mockResolvedValueOnce({
      links: [
        {
          id: 'l1',
          provider_id: 'telegram',
          external_user_id: '99887766',
          vbwd_user_id: 'u1',
          bot_ref: 'support_bot',
          linked_at: '2026-06-01T10:00:00+00:00',
        },
      ],
    });
    const store = useBotLinkStore();
    await store.fetchLinks();
    // bot-base, NOT bot-telegram — so future providers appear without changes here.
    expect(api.get).toHaveBeenCalledWith('/plugins/bot/admin/links');
    expect(store.links).toHaveLength(1);
    expect(store.links[0].provider_id).toBe('telegram');
    expect(store.links[0].external_user_id).toBe('99887766');
  });

  it('tolerates a bare-array links response', async () => {
    (api.get as any).mockResolvedValueOnce([
      { id: 'l1', provider_id: 'telegram', external_user_id: '1', vbwd_user_id: 'u1', bot_ref: null, linked_at: null },
    ]);
    const store = useBotLinkStore();
    await store.fetchLinks();
    expect(store.links).toHaveLength(1);
  });
});
