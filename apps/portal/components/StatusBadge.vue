<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ label: string; tone?: "default" | "success" | "warning" }>();
const color = computed(() => ({ default: "neutral", success: "primary", warning: "warning" })[props.tone ?? "default"] as "neutral" | "primary" | "warning");
</script>

<template><UBadge :label="props.label" :color="color" variant="subtle" size="sm" class="status-badge" /></template>

<style scoped>
.status-badge { min-height: 24px; border: 1px solid var(--line); font-size: .72rem; font-weight: 680; }
</style>
