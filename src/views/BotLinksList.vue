<template>
  <div
    class="cms-view cms-list"
    data-testid="bot-telegram-links"
  >
    <div class="cms-list__header">
      <h1>{{ $t('botTelegramAdmin.links.title') }}</h1>
    </div>

    <p class="cms-list__hint">
      {{ $t('botTelegramAdmin.links.hint') }}
    </p>

    <p
      v-if="store.error"
      class="cms-alert cms-alert--error"
      data-testid="links-error"
    >
      {{ store.error }}
    </p>

    <table class="cms-table">
      <thead>
        <tr>
          <th>{{ $t('botTelegramAdmin.links.col.provider') }}</th>
          <th>{{ $t('botTelegramAdmin.links.col.externalId') }}</th>
          <th>{{ $t('botTelegramAdmin.links.col.user') }}</th>
          <th>{{ $t('botTelegramAdmin.links.col.linkedAt') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="link in store.links"
          :key="link.id"
          data-testid="link-row"
        >
          <td>{{ link.provider_id }}</td>
          <td class="cms-table__mono">
            {{ link.external_user_id }}
          </td>
          <td class="cms-table__mono">
            {{ link.vbwd_user_id }}
          </td>
          <td>{{ formatDate(link.linked_at) }}</td>
        </tr>
        <tr v-if="!store.links.length && !store.loading">
          <td
            colspan="4"
            class="cms-table__empty"
          >
            {{ $t('botTelegramAdmin.links.empty') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBotLinkStore } from '../stores/useBotLinkStore';

const store = useBotLinkStore();

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '';
}

onMounted(() => store.fetchLinks());
</script>

<style scoped>
.cms-list__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.cms-list__header h1 { margin: 0; font-size: 1.25rem; color: var(--admin-heading, #2c3e50); }
.cms-list__hint { color: var(--admin-muted, #666); font-size: 13px; margin: 0 0 16px; }

.cms-table { width: 100%; border-collapse: collapse; }
.cms-table th, .cms-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--admin-border-light, #eee); font-size: 14px; color: var(--admin-text, #333); }
.cms-table th { background: var(--admin-th-bg, #f8f9fa); font-weight: 600; color: var(--admin-heading, #2c3e50); }
.cms-table__empty { text-align: center; color: var(--admin-muted, #666); padding: 40px; }
.cms-table__mono { font-family: 'SF Mono', ui-monospace, monospace; font-size: 0.8rem; color: var(--admin-text-muted, #666); }

.cms-alert { padding: 10px 14px; border-radius: 4px; font-size: 14px; margin-bottom: 16px; }
.cms-alert--error { background: var(--admin-danger-bg, #fee2e2); color: var(--admin-danger-fg, #991b1b); }
</style>
