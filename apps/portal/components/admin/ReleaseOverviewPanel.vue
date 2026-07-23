<script setup lang="ts">
import type { ReleaseOverview } from "~/composables/useReleasePlane";

defineProps<{ overview: ReleaseOverview | null; loading: boolean }>();
const emit = defineEmits<{ refresh: [] }>();
const formatTime = (value: number | null | undefined) => value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
</script>

<template>
  <section class="release-overview" aria-labelledby="release-overview-title">
    <div class="section-heading"><div><p class="eyebrow">发布控制</p><h2 id="release-overview-title">当前版本与候选版本</h2></div><UButton label="刷新" color="neutral" variant="outline" :loading="loading" @click="emit('refresh')" /></div>
    <div class="release-state-grid">
      <article class="state-block"><span class="state-label">Current</span><strong>{{ overview?.current?.sourceVersion ?? "尚未初始化" }}</strong><small v-if="overview?.current">Bastion {{ overview.current.bastionCommitSha ?? "未记录" }} · {{ formatTime(overview.current.activatedAt) }}</small><small v-else>请先执行首个正式快照 bootstrap。</small></article>
      <article class="state-block next"><span class="state-label">Next</span><strong>{{ overview?.next?.sourceVersion ?? "暂无候选" }}</strong><small v-if="overview?.next">{{ overview.next.status }} · {{ overview.next.snapshotHash }}</small><small v-else>候选版本会在构建前保持可追踪。</small></article>
    </div>
    <div v-if="overview?.releases.length" class="release-history">
      <h3>历史 Release</h3>
      <div v-for="release in overview.releases" :key="release.releaseId" class="history-row"><span>{{ release.sourceVersion }}</span><StatusBadge :label="release.status" :tone="release.status === 'active' ? 'success' : 'default'" /><code>{{ release.bastionCommitSha ?? "待构建" }}</code><time>{{ formatTime(release.activatedAt ?? release.createdAt) }}</time></div>
    </div>
  </section>
</template>

<style scoped>
.release-overview { display:grid; gap:20px; }.section-heading { display:flex; justify-content:space-between; align-items:end; gap:16px; }.section-heading h2 { margin:4px 0 0; font-size:clamp(1.35rem,3vw,1.85rem); letter-spacing:-.04em; }.eyebrow { margin:0; color:var(--accent); font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; }.release-state-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-block:1px solid var(--line); }.state-block { display:grid; gap:8px; min-height:150px; padding:24px 0; }.state-block + .state-block { padding-left:24px; border-left:1px solid var(--line); }.state-block strong { font-size:clamp(1.4rem,4vw,2.4rem); letter-spacing:-.05em; overflow-wrap:anywhere; }.state-label { color:var(--quiet); font-size:.8rem; letter-spacing:.12em; text-transform:uppercase; }.state-block small { color:var(--quiet); line-height:1.5; }.next strong { color:var(--accent); }.release-history { display:grid; gap:10px; }.release-history h3 { margin:0; font-size:1rem; }.history-row { display:grid; grid-template-columns:minmax(110px,1fr) auto minmax(110px,1fr) auto; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid var(--line); }.history-row code { overflow:hidden; text-overflow:ellipsis; color:var(--quiet); }.history-row time { color:var(--quiet); font-size:.8rem; text-align:right; }
@media (max-width:640px) { .release-state-grid { grid-template-columns:1fr; }.state-block + .state-block { padding-left:0; border-left:0; border-top:1px solid var(--line); }.history-row { grid-template-columns:1fr auto; }.history-row code,.history-row time { grid-column:1 / -1; text-align:left; } }
</style>
