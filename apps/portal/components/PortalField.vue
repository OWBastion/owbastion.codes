<script setup lang="ts">
defineProps<{ label?: string; hint?: string; required?: boolean }>();
</script>

<template>
  <label class="portal-field">
    <span v-if="label" class="portal-field-label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></span>
    <slot />
    <span v-if="hint" class="portal-field-hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.portal-field { display: grid; gap: 7px; color: var(--muted); font-size: .78rem; font-weight: 680; }
.portal-field-label { display: block; }
.portal-field-hint { color: var(--quiet); font-size: .74rem; font-weight: 500; }
</style>
