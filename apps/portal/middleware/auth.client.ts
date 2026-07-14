export default defineNuxtRouteMiddleware(async (to) => {
  const { player, refresh } = useCurrentPlayer();
  if (!player.value) await refresh();
  if (!player.value) return navigateTo({ path: "/login", query: { returnTo: to.fullPath } });
});
