<script setup lang="ts">
import { submissionStatusText } from "~/utils/submissionStatus";
import type { AdminSubmission } from "~/composables/useAdminApi";

definePageMeta({ middleware: ["auth", "admin-client"] });
useSeoMeta({ title: "审核管理 · 躲避堡垒 3" });
const api = useAdminApi();
const submissions = ref<AdminSubmission[]>([]);
const selected = ref<AdminSubmission | null>(null);
const loading = ref(true);
const errorMessage = ref("");
const trigger = ref<HTMLElement | null>(null);
const panelOpen = computed({ get: () => selected.value !== null, set: (value) => { if (!value) selected.value = null; } });
const formatStatus = (value: string) => submissionStatusText[value] ?? value;
async function load() {
  loading.value = true; errorMessage.value = "";
  try { submissions.value = (await api<{ items: AdminSubmission[] }>("/v1/submissions?status=ready_for_review")).items; }
  catch (error: any) { errorMessage.value = error?.data?.error?.message ?? "无法读取待核对截图，请确认当前账号有管理员权限。"; }
  finally { loading.value = false; }
}
async function open(submission: AdminSubmission, event: EventTarget | null) { trigger.value = event instanceof HTMLElement ? event : null; selected.value = await api<AdminSubmission>(`/v1/submissions/${submission.submissionId}`); }
async function review(decision: "approved" | "rejected" | "resubmission_required") {
  if (!selected.value) return;
  const reason = window.prompt("请输入处理说明")?.trim();
  if (!reason) return;
  await api(`/v1/submissions/${selected.value.submissionId}/review`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: { contractVersion: "1", decision, reason } });
  close(); await load();
}
function close() { selected.value = null; }
onMounted(() => { void load(); });
</script>

<template>
  <main class="admin-page page-shell"><h1 class="sr-only">审核管理</h1>
    <p v-if="errorMessage" class="alert" role="alert">{{ errorMessage }}</p>
    <section aria-labelledby="reviews-title"><div class="heading"><h2 id="reviews-title">待核对</h2><span>{{ loading ? "读取中…" : `${submissions.length} 条` }}</span></div>
      <div class="list" aria-live="polite"><button v-for="submission in submissions" :key="submission.submissionId" class="row surface-card" type="button" @click="open(submission, $event.currentTarget)"><strong>{{ submission.mapName }} · {{ submission.difficulty }}</strong><small>{{ submission.playerName }} · {{ formatStatus(submission.status) }}</small></button><p v-if="!loading && !submissions.length" class="empty surface-card">暂无待核对截图。</p></div>
    </section>
    <PortalSidePanel v-model:open="panelOpen" :title="selected ? `${selected.mapName} · ${selected.difficulty}` : ''" :return-focus="trigger"><section v-if="selected" class="detail"><h2>{{ selected.mapName }} · {{ selected.difficulty }}</h2><img class="evidence" :src="`/api/admin/evidence/${selected.submissionId}`" alt="玩家提交的挑战截图" /><pre v-if="selected.ocr" class="ocr">{{ JSON.stringify(selected.ocr, null, 2) }}</pre><div class="actions"><PortalButton type="button" @click="review('approved')">通过</PortalButton><PortalButton tone="secondary" type="button" @click="review('resubmission_required')">要求重传</PortalButton><PortalButton tone="danger" type="button" @click="review('rejected')">驳回</PortalButton></div></section></PortalSidePanel>
  </main>
</template>

<style scoped>
.admin-page { padding-block:clamp(46px,7vh,72px); max-width:920px; }.heading { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:14px; }.heading h2 { margin:0; font-size:clamp(1.5rem,3vw,2.1rem); letter-spacing:-.045em; }.heading span,.row small { color:var(--quiet); font-size:.78rem; }.list { display:grid; gap:9px; }.row { display:block; width:100%; padding:17px 18px; color:var(--text); text-align:left; transition:transform 160ms ease,border-color 160ms ease; }.row:hover,.row:focus-visible { transform:translateY(-1px); border-color:var(--line-strong); }.row strong,.row small { display:block; }.row small { margin-top:5px; }.empty { margin:0; padding:28px; color:var(--quiet); text-align:center; }.alert { margin:0 0 18px; padding:12px 14px; border-radius:11px; color:color-mix(in oklch,var(--danger) 82%,var(--text)); background:color-mix(in oklch,var(--danger) 16%,var(--surface)); font-size:.82rem; }.detail h2 { margin:0; font-size:2.25rem; letter-spacing:-.05em; overflow-wrap:anywhere; }.evidence { display:block; width:100%; margin:22px 0; border:1px solid var(--line); border-radius:10px; }.ocr { max-height:240px; overflow:auto; padding:12px; color:var(--muted); background:var(--surface); font-size:.72rem; white-space:pre-wrap; }.actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }
</style>
