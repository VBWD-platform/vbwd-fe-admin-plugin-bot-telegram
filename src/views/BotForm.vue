<template>
  <div
    class="cms-view cms-form"
    data-testid="bot-telegram-bot-form"
  >
    <div class="cms-form__header">
      <h1>{{ isEdit ? $t('botTelegramAdmin.form.editTitle') : $t('botTelegramAdmin.form.newTitle') }}</h1>
      <RouterLink
        class="btn"
        :to="{ name: 'bot-telegram-bots' }"
      >
        {{ $t('botTelegramAdmin.form.back') }}
      </RouterLink>
    </div>

    <p
      v-if="store.error"
      class="cms-alert cms-alert--error"
      data-testid="bot-form-error"
    >
      {{ store.error }}
    </p>

    <form
      class="cms-form__body"
      @submit.prevent="onSubmit"
    >
      <label class="cms-form__field">
        <span>{{ $t('botTelegramAdmin.form.name') }}</span>
        <input
          v-model="form.name"
          type="text"
          required
          data-testid="field-name"
        >
      </label>

      <label class="cms-form__field">
        <span>{{ $t('botTelegramAdmin.form.username') }}</span>
        <input
          v-model="form.username"
          type="text"
          required
          placeholder="my_bot"
          data-testid="field-username"
        >
        <small>{{ $t('botTelegramAdmin.form.usernameHint') }}</small>
      </label>

      <label class="cms-form__field">
        <span>{{ $t('botTelegramAdmin.form.token') }}</span>
        <input
          v-model="form.token"
          type="password"
          autocomplete="new-password"
          :placeholder="isEdit ? maskedTokenPlaceholder : ''"
          data-testid="field-token"
        >
        <small>{{ isEdit ? $t('botTelegramAdmin.form.tokenHintEdit') : $t('botTelegramAdmin.form.tokenHintNew') }}</small>
      </label>

      <label class="cms-form__field">
        <span>{{ $t('botTelegramAdmin.form.webhookSecret') }}</span>
        <input
          v-model="form.webhook_secret"
          type="password"
          autocomplete="new-password"
          data-testid="field-webhook-secret"
        >
        <small>{{ $t('botTelegramAdmin.form.webhookSecretHint') }}</small>
      </label>

      <label class="cms-form__check">
        <input
          v-model="form.default"
          type="checkbox"
          data-testid="field-default"
        >
        <span>{{ $t('botTelegramAdmin.form.default') }}</span>
      </label>

      <label class="cms-form__check">
        <input
          v-model="form.enabled"
          type="checkbox"
          data-testid="field-enabled"
        >
        <span>{{ $t('botTelegramAdmin.form.enabled') }}</span>
      </label>

      <div class="cms-form__actions">
        <button
          type="submit"
          class="btn btn--primary"
          :disabled="store.loading"
          data-testid="btn-save-bot"
        >
          {{ $t('botTelegramAdmin.form.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBotTelegramStore, type TelegramBotInput } from '../stores/useBotTelegramStore';

const store = useBotTelegramStore();
const route = useRoute();
const router = useRouter();

const botId = computed(() => (route.params.id as string | undefined) || undefined);
const isEdit = computed(() => Boolean(botId.value));
const maskedTokenPlaceholder = computed(() => store.currentBot?.token ?? '');

// `token` and `webhook_secret` start EMPTY and are never seeded from the API —
// they are write-only. A blank value on save means "leave unchanged".
const form = reactive<TelegramBotInput>({
  name: '',
  username: '',
  token: '',
  webhook_secret: '',
  default: false,
  enabled: true,
});

async function onSubmit() {
  const saved = await store.saveBot({ ...form, id: botId.value });
  router.push({ name: 'bot-telegram-bots' });
  return saved;
}

onMounted(async () => {
  if (!botId.value) return;
  const bot = await store.fetchBot(botId.value);
  form.name = bot.name;
  form.username = bot.username;
  form.default = bot.default;
  form.enabled = bot.enabled;
  // Deliberately NOT seeding token / webhook_secret — write-only fields.
});
</script>

<style scoped>
.cms-form__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.cms-form__header h1 { margin: 0; font-size: 1.25rem; color: var(--admin-heading, #2c3e50); }
.cms-form__body { display: flex; flex-direction: column; gap: 16px; max-width: 520px; }
.cms-form__field { display: flex; flex-direction: column; gap: 4px; }
.cms-form__field > span { font-size: 14px; font-weight: 600; color: var(--admin-heading, #2c3e50); }
.cms-form__field input { padding: 8px 12px; border: 1px solid var(--admin-input-border, #ddd); border-radius: 4px; font-size: 14px; background: var(--admin-card-bg, #fff); color: var(--admin-text, #333); }
.cms-form__field input:focus { outline: none; border-color: var(--admin-focus, #3498db); }
.cms-form__field small { color: var(--admin-muted, #666); font-size: 12px; }
.cms-form__check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--admin-text, #333); }
.cms-form__actions { margin-top: 8px; }

.cms-alert { padding: 10px 14px; border-radius: 4px; font-size: 14px; margin-bottom: 16px; }
.cms-alert--error { background: var(--admin-danger-bg, #fee2e2); color: var(--admin-danger-fg, #991b1b); }

.btn { padding: 8px 16px; border: 1px solid var(--admin-border, #e0e0e0); border-radius: 4px; background: var(--admin-card-bg, #fff); color: var(--admin-text, #333); cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
.btn--primary { background: var(--admin-primary, #3b82f6); color: #fff; border-color: var(--admin-primary, #3b82f6); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
