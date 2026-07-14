import type { CurrentPlayer, PortalApiError } from "./usePortalApi";

export function useCurrentPlayer() {
  const player = useState<CurrentPlayer | null>("current-player", () => null);
  const loaded = useState("current-player-loaded", () => false);
  const api = usePortalApi();

  const refresh = async () => {
    if (import.meta.server) return player.value;
    try {
      player.value = await api<CurrentPlayer>("/v1/me");
    } catch (error) {
      if ((error as PortalApiError).statusCode !== 401) throw error;
      player.value = null;
    } finally {
      loaded.value = true;
    }
    return player.value;
  };

  const logout = async () => {
    await api("/v1/auth/logout", { method: "POST" });
    player.value = null;
    loaded.value = true;
  };

  return { player, loaded, refresh, logout };
}
