<script setup lang="ts">
import BindingInviteBatchPanel from "~/components/admin/BindingInviteBatchPanel.vue";

definePageMeta({ middleware: ["auth", "admin-client"] });
type Claim = { claimId: string; playerName: string; playerId: string; status: "pending_confirmation" | "pending_review" | "approved" | "rejected" | "expired"; createdAt: number; invitedBy: string; affectedPlayerAccountId?: string };
const api = useAdminApi();
const claims = ref<Claim[]>([]); const loading = ref(true); const errorMessage = ref(""); const actionMessage = ref("");
const columns = [{ accessorKey: "battleTag", header: "玩家" }, { accessorKey: "status", header: "状态" }, { accessorKey: "createdAt", header: "申请时间" }, { id: "actions", header: "", enableHiding: false }];
const statusLabel = (status: Claim["status"]) => ({ pending_confirmation: "等待确认", pending_review: "待处理", approved: "已批准", rejected: "已拒绝", expired: "已过期" })[status];
async function load() { loading.value = true; errorMessage.value = ""; try { claims.value = (await api<{ items: Claim[] }>("/v1/binding-claims")).items; } catch { errorMessage.value = "无法读取绑定申请，请稍后重试。"; } finally { loading.value = false; } }
async function decide(claim: Claim, decision: "approved" | "rejected") { const action = decision === "approved" ? "批准" : "拒绝"; const reason = window.prompt(`请输入${action}原因`)?.trim(); if (!reason) return; actionMessage.value = "保存中…"; try { await api(`/v1/binding-claims/${claim.claimId}/decision`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: { contractVersion: "1", decision, reason } }); actionMessage.value = `申请已${action}`; await load(); } catch { actionMessage.value = "无法处理申请"; } }
onMounted(load);
</script>

<template>
  <AdminWorkspace title="绑定管理" :count="loading ? '读取中…' : `${claims.length} 条`">
    <template #messages><UAlert v-if="errorMessage" color="error" variant="subtle" :description="errorMessage" /><UAlert v-if="actionMessage" color="primary" variant="subtle" :description="actionMessage" /></template>
    <template #toolbar><BindingInviteBatchPanel @created="load" /></template>
    <AdminDataTable :data="claims" :columns="columns" :loading="loading" empty="暂无绑定申请。" table-key="binding-claims" scroll-height="32rem">
      <template #battleTag-cell="{ row }"><strong><PlayerBattleTag :player-name="row.original.playerName" :player-id="row.original.playerId" /></strong></template>
      <template #status-cell="{ row }"><StatusBadge :label="statusLabel(row.original.status)" :tone="row.original.status === 'pending_review' ? 'warning' : row.original.status === 'approved' ? 'success' : 'default'" /></template>
      <template #createdAt-cell="{ row }"><span class="table-meta">{{ new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(row.original.createdAt) }}</span></template>
      <template #actions-cell="{ row }"><div v-if="row.original.status === 'pending_review'" class="claim-actions"><UButton label="批准" size="xs" @click="decide(row.original, 'approved')" /><UButton label="拒绝" color="error" variant="soft" size="xs" @click="decide(row.original, 'rejected')" /></div></template>
    </AdminDataTable>
  </AdminWorkspace>
</template>

<style scoped>.claim-actions { display:flex; gap:8px; }.table-meta { color:var(--quiet); font-size:.78rem; }</style>
