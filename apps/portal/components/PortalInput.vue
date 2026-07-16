<script setup lang="ts">
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

const model = defineModel<string | null>();
const inputValue = computed<string>({
  get: () => model.value ?? "",
  set: (value) => { model.value = value; },
});
</script>

<template><UInput v-model="inputValue" v-bind="$attrs" class="portal-control" color="neutral" variant="outline" /></template>

<style scoped>
.portal-control { width: 100%; min-height: 44px; }
</style>
