export type OwnedTitle = { grantId: string; titleKey: string; label: string; category: string; scope: "global" | "map"; mapName?: string; slot?: "pioneer" | "conqueror" | "dominator"; grantedAt: number };

export function usePlayerTitles() {
  const items = useState<OwnedTitle[]>("player-titles", () => []);
  const api = usePortalApi();
  const refresh = async () => { items.value = (await api<{ items: OwnedTitle[] }>("/v1/me/titles")).items; return items.value; };
  return { items, refresh };
}
