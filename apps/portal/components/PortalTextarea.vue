<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const model = defineModel<string>();
</script>

<template><UTextarea v-model="model" v-bind="$attrs" class="portal-control" color="neutral" variant="outline" /></template>

<style scoped>
.portal-control { width: 100%; min-height: 104px; }
</style>
