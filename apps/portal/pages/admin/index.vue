<script setup lang="ts">
import type { AdminGroup, AdminSubmission } from "~/composables/useAdminApi";
import { submissionStatusText } from "~/utils/submissionStatus";

definePageMeta({ middleware: ["auth", "admin-client"] });
useSeoMeta({ title: "管理后台 · 躲避堡垒 3" });

const api = useAdminApi();
const groups = ref<AdminGroup[]>([]);
const submissions = ref<AdminSubmission[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const activeProductionGroups = computed(() => groups.value.filter((group) => group.environment === "production" && group.enabled).length);
const reviewTotal = ref(0);
const processingTotal = ref(0);
const activePlayerTotal = ref(0);
const formatTime = (value: number) => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value);
const metrics = computed(() => {
  const value = (count: number) => loading.value ? "读取中…" : `${count}`;
  return [
    { label: "待核对", value: value(reviewTotal.value), detail: "等待人工处理", tone: "accent" as const },
    { label: "识别处理中", value: value(processingTotal.value), detail: "等待识别结果", tone: "accent" as const },
    { label: "正常玩家", value: value(activePlayerTotal.value), detail: "账号状态正常", tone: "quiet" as const },
    { label: "正式群组", value: value(activeProductionGroups.value), detail: "已开放接收提交", tone: "quiet" as const },
  ];
});
const reviewQueue = computed(() => submissions.value.map((submission) => ({
  submissionId: submission.submissionId,
  mapName: submission.mapName,
  difficulty: submission.difficulty,
  playerName: submission.playerName,
  status: submissionStatusText[submission.status] ?? submission.status,
  updatedAt: formatTime(submission.updatedAt),
})));

onMounted(async () => {
  try {
	    const [groupResponse, reviewResponse, processingResponse, playerResponse] = await Promise.all([
	      api<{ items: AdminGroup[] }>("/v1/qq/groups"),
	      api<{ items: AdminSubmission[]; total: number }>("/v1/submissions?status=ready_for_review,ocr_review_required&page=1&pageSize=5"),
	      api<{ total: number }>("/v1/submissions?status=upload_pending,ocr_pending&page=1&pageSize=1"),
	      api<{ total: number }>("/v1/player-accounts?status=active&page=1&pageSize=1"),
	    ]);
	    groups.value = groupResponse.items;
	    submissions.value = reviewResponse.items;
	    reviewTotal.value = reviewResponse.total;
	    processingTotal.value = processingResponse.total;
	    activePlayerTotal.value = playerResponse.total;
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message ?? "无法读取管理概览，请确认当前账号有管理员权限。";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <AdminWorkspace title="管理概览">
    <template #messages><p v-if="errorMessage" class="admin-alert" role="alert">{{ errorMessage }}</p></template>
    <AdminDashboardMetrics :metrics="metrics" />
    <AdminReviewQueue class="dashboard-queue" :loading="loading" :reviews="reviewQueue" />
    <AdminManagementLinks class="dashboard-tools" />
  </AdminWorkspace>
</template>

<style scoped>
.dashboard-tools { margin-top:clamp(12px,2vw,24px); }
</style>
