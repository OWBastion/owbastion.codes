<script setup lang="ts">
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  tone?: "primary" | "secondary" | "danger" | "text";
  loading?: boolean;
}>(), { tone: "primary" });

const presentation = computed(() => ({
  primary: { color: "primary" as const, variant: "solid" as const },
  secondary: { color: "neutral" as const, variant: "outline" as const },
  danger: { color: "error" as const, variant: "solid" as const },
  text: { color: "neutral" as const, variant: "link" as const },
})[props.tone]);
</script>

<template>
  <UButton
    v-bind="$attrs"
    :color="presentation.color"
    :variant="presentation.variant"
    :loading="props.loading"
    :class="['portal-button', `portal-button--${props.tone}`, `${props.tone}-button`]"
  >
    <slot />
  </UButton>
</template>

<style scoped>
.portal-button { min-height: 44px; border-radius: 11px; font-size: .88rem; font-weight: 680; }
.portal-button--primary { color: var(--on-accent); background: var(--accent); }
.portal-button--secondary { color: var(--text); border-color: var(--line-strong); background: var(--surface-raised); }
.portal-button--danger { color: var(--on-accent); background: var(--danger); }
.portal-button--text { color: var(--muted); }
</style>
