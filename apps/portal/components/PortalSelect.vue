<script setup lang="ts">
type Item = string | { label: string; value: string; disabled?: boolean };

defineOptions({ inheritAttrs: false });

defineProps<{ items: Item[] }>();
const model = defineModel<string>();
</script>

<template><USelect v-model="model" v-bind="$attrs" :items="items" class="portal-control" color="neutral" variant="outline" /></template>

<style scoped>
.portal-control { width: 100%; min-height: 44px; }
</style>
