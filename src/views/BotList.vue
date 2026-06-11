<template>
  <div
    class="cms-view cms-list"
    data-testid="bot-telegram-bots"
  >
    <div class="cms-list__header">
      <h1>{{ $t('botTelegramAdmin.bots.title') }}</h1>
      <div class="cms-list__actions">
        <RouterLink
          class="btn btn--primary"
          data-testid="btn-new-bot"
          :to="{ name: 'bot-telegram-bot-new' }"
        >
          {{ $t('botTelegramAdmin.bots.new') }}
        </RouterLink>
      </div>
    </div>

    <p
      v-if="store.error"
      class="cms-alert cms-alert--error"
      data-testid="bots-error"
    >
      {{ store.error }}
    </p>

    <table class="cms-table">
      <thead>
        <tr>
          <th>{{ $t('botTelegramAdmin.bots.col.name') }}</th>
          <th>{{ $t('botTelegramAdmin.bots.col.username') }}</th>
          <th>{{ $t('botTelegramAdmin.bots.col.token') }}</th>
          <th>{{ $t('botTelegramAdmin.bots.col.default') }}</th>
          <th>{{ $t('botTelegramAdmin.bots.col.status') }}</th>
          <th>{{ $t('botTelegramAdmin.bots.col.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="bot in store.bots"
          :key="bot.id"
          data-testid="bot-row"
        >
          <td>
            <RouterLink :to="{ name: 'bot-telegram-bot-edit', params: { id: bot.id } }">
              {{ bot.name }}
            </RouterLink>
          </td>
          <td>@{{ bot.username }}</td>
          <td
            class="cms-table__mono"
            data-testid="bot-token-masked"
          >
            {{ bot.token }}
          </td>
          <td>
            <span
              v-if="bot.default"
              class="badge"
            >{{ $t('botTelegramAdmin.bots.default') }}</span>
          </td>
          <td>
            <span
              v-if="bot.enabled"
              class="badge"
            >{{ $t('botTelegramAdmin.bots.enabled') }}</span>
            <span
              v-else
              class="badge badge--muted"
            >{{ $t('botTelegramAdmin.bots.disabled') }}</span>
          </td>
          <td class="cms-table__actions">
            <button
              type="button"
              class="btn btn--sm"
              data-testid="btn-set-webhook"
              @click="onSetWebhook(bot)"
            >
              {{ $t('botTelegramAdmin.bots.setWebhook') }}
            </button>
            <button
              type="button"
              class="btn btn--sm"
              data-testid="btn-send-test"
              @click="onSendTest(bot)"
            >
              {{ $t('botTelegramAdmin.bots.sendTest') }}
            </button>
            <button
              type="button"
              class="btn btn--sm btn--danger"
              data-testid="btn-delete-bot"
              @click="onDelete(bot)"
            >
              {{ $t('botTelegramAdmin.bots.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="!store.bots.length && !store.loading">
          <td
            colspan="6"
            class="cms-table__empty"
          >
            {{ $t('botTelegramAdmin.bots.empty') }}
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="actionMessage"
      :class="['cms-alert', actionVariant === 'error' ? 'cms-alert--error' : 'cms-alert--success']"
      data-testid="bot-action-result"
    >
      {{ actionMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBotTelegramStore, type TelegramBot } from '../stores/useBotTelegramStore';

const store = useBotTelegramStore();
const { t } = useI18n();

const actionMessage = ref('');
const actionVariant = ref<'success' | 'error'>('success');

function report(message: string, variant: 'success' | 'error' = 'success') {
  actionMessage.value = message;
  actionVariant.value = variant;
}

async function onSetWebhook(bot: TelegramBot) {
  try {
    await store.setWebhook(bot.id);
    report(t('botTelegramAdmin.bots.webhookOk', { name: bot.name }));
  } catch (caught) {
    report((caught as Error)?.message ?? t('botTelegramAdmin.bots.webhookError'), 'error');
  }
}

async function onSendTest(bot: TelegramBot) {
  const chatId = window.prompt(t('botTelegramAdmin.bots.testChatPrompt'));
  if (!chatId) return;
  const result = await store.sendTest(bot.id, chatId);
  if (result.status === 'ok') {
    report(t('botTelegramAdmin.bots.testOk'));
  } else if (result.status === 'rate_limited') {
    report(t('botTelegramAdmin.bots.testRateLimited'), 'error');
  } else {
    report(result.message ?? t('botTelegramAdmin.bots.testError'), 'error');
  }
}

async function onDelete(bot: TelegramBot) {
  if (!window.confirm(t('botTelegramAdmin.bots.deleteConfirm', { name: bot.name }))) return;
  await store.deleteBot(bot.id);
}

onMounted(() => store.fetchBots());
</script>

<style scoped>
.cms-list__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 0.75rem; }
.cms-list__header h1 { margin: 0; font-size: 1.25rem; color: var(--admin-heading, #2c3e50); }
.cms-list__actions { display: flex; gap: 8px; align-items: center; }

.cms-table { width: 100%; border-collapse: collapse; }
.cms-table th, .cms-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--admin-border-light, #eee); font-size: 14px; color: var(--admin-text, #333); }
.cms-table th { background: var(--admin-th-bg, #f8f9fa); font-weight: 600; color: var(--admin-heading, #2c3e50); }
.cms-table__empty { text-align: center; color: var(--admin-muted, #666); padding: 40px; }
.cms-table__mono { font-family: 'SF Mono', ui-monospace, monospace; font-size: 0.8rem; color: var(--admin-text-muted, #666); }
.cms-table__actions { display: flex; gap: 6px; flex-wrap: wrap; }

.badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; background: var(--admin-success-bg, #dcfce7); color: var(--admin-success-fg, #166534); }
.badge--muted { background: var(--admin-card-bg, #f3f4f6); color: var(--admin-text-muted, #666); }

.cms-alert { padding: 10px 14px; border-radius: 4px; font-size: 14px; margin-top: 16px; }
.cms-alert--success { background: var(--admin-success-bg, #dcfce7); color: var(--admin-success-fg, #166534); }
.cms-alert--error { background: var(--admin-danger-bg, #fee2e2); color: var(--admin-danger-fg, #991b1b); }

.btn { padding: 8px 16px; border: 1px solid var(--admin-border, #e0e0e0); border-radius: 4px; background: var(--admin-card-bg, #fff); color: var(--admin-text, #333); cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
.btn--sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
.btn--primary { background: var(--admin-primary, #3b82f6); color: #fff; border-color: var(--admin-primary, #3b82f6); }
.btn--danger { background: var(--admin-danger, #ef4444); color: #fff; border-color: var(--admin-danger, #ef4444); }
</style>
