export type AdminPlayer = {
  playerAccountId: string;
  playerId: string;
  playerName: string;
  status: "active" | "banned";
  bindingCount: number;
  updatedAt: number;
};

export type AdminPlayerDetail = AdminPlayer & {
  bindings: Array<{ bindingId: string; provider: "qq"; groupOpenId: string; memberOpenId: string; createdAt: number }>;
  recentSubmissions: Array<{ submissionId: string; status: string; mapName: string; createdAt: number; updatedAt: number }>;
};

export type AdminGroup = { groupOpenId: string; environment: "production" | "test"; enabled: boolean; updatedAt: number };

export function useAdminApi() {
  return async <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) =>
    await $fetch<T>(`/api/admin${path}`, { ...options, credentials: "same-origin", retry: 0, timeout: 8_000 });
}
