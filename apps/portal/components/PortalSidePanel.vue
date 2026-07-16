<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted } from "vue";

const open = defineModel<boolean>("open", { default: false });
const props = defineProps<{ title: string; returnFocus?: HTMLElement | null }>();
function handleOpen(value: boolean) {
  const wasOpen = open.value;
  open.value = value;
  if (!value && wasOpen) {
    void nextTick(() => {
      if (props.returnFocus?.isConnected) props.returnFocus.focus();
    });
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) handleOpen(false);
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <USlideover
    :open="open"
    :title="props.title"
    :close="true"
    :ui="{ content: 'portal-side-panel', header: 'portal-side-panel-header', body: 'portal-side-panel-body', title: 'sr-only', close: 'portal-side-panel-close' }"
    @update:open="handleOpen"
  >
    <template #body><slot /></template>
  </USlideover>
</template>

<style>
.portal-side-panel { width: min(100%, 500px); padding: 0; border-left: 1px solid color-mix(in oklch, var(--on-accent) 35%, var(--line)); border-radius: 22px 0 0 22px; color: var(--text); background: color-mix(in oklch, var(--surface-raised) 88%, var(--page)); box-shadow: -20px 0 60px var(--shadow); backdrop-filter: blur(24px) saturate(150%); }
.portal-side-panel-header { justify-content: end; min-height: 0; padding: 16px 20px 0; }
.portal-side-panel-body { padding: 18px 28px 36px; }
.portal-side-panel-close { width: 40px; height: 40px; border-radius: 50%; color: var(--muted); background: var(--surface); }
@media (prefers-reduced-transparency: reduce) { .portal-side-panel { background: var(--surface-raised); backdrop-filter: none; } }
@media (max-width: 560px) { .portal-side-panel { width: 100%; border-radius: 18px 0 0 18px; }.portal-side-panel-body { padding-inline: 20px; } }
</style>
