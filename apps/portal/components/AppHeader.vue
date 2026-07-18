<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { player, loaded, refresh, logout } = useCurrentPlayer();
const loggingOut = ref(false);
const route = useRoute();
const isAdminPage = computed(() => route.path.startsWith("/admin"));

const navigationItems = computed<NavigationMenuItem[]>(() => {
  if (isAdminPage.value) {
    return [
      { label: "概览", to: "/admin", active: route.path === "/admin" },
      { label: "玩家", to: "/admin/players", active: route.path.startsWith("/admin/players") },
      { label: "审核", to: "/admin/reviews", active: route.path.startsWith("/admin/reviews") },
      { label: "渠道", to: "/admin/channels", active: route.path.startsWith("/admin/channels") },
      { label: "成就", to: "/admin/achievements", active: route.path.startsWith("/admin/achievements") },
      { label: "地图", to: "/admin/maps", active: route.path.startsWith("/admin/maps") },
      { label: "事件", to: "/admin/events", active: route.path.startsWith("/admin/events") },
    ];
  }

  return [
    { label: "事件", to: "/events", active: route.path.startsWith("/events") },
    { label: "地图", to: "/maps", active: route.path.startsWith("/maps") },
    { label: "成就", to: "/achievements", active: route.path.startsWith("/achievements") },
    { label: "天梯排名", to: "/#rankings", active: route.path === "/" && route.hash === "#rankings" },
    { label: "轮换挑战", to: "/#rotation", active: route.path === "/" && route.hash === "#rotation" },
  ];
});

onMounted(() => { if (!loaded.value) void refresh(); });

async function signOut() {
  loggingOut.value = true;
  try {
    await logout();
    await navigateTo("/");
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="app-header-wrap">
    <UHeader
      title="躲避堡垒 3 首页"
      :ui="{
        root: 'app-header',
        container: 'app-header-container',
        left: 'app-header-left',
        center: 'app-header-center',
        right: 'app-header-right',
        title: 'app-header-title',
        toggle: 'app-header-toggle',
        body: 'app-header-body',
      }"
      :toggle="{ color: 'neutral', variant: 'outline' }"
    >
      <template #title>
        <NuxtLink to="/" class="brand" aria-label="躲避堡垒 3 首页"><span class="brand-mark" aria-hidden="true">O</span><span>躲避堡垒 3</span></NuxtLink>
      </template>

      <UNavigationMenu class="main-nav" :items="navigationItems" :aria-label="isAdminPage ? '管理导航' : '主导航'" />

      <template #right>
        <ThemeMenu />
        <AccountMenu v-if="player" :player="player.player" @logout="signOut" />
        <NuxtLink v-else to="/login" class="login-link">登录</NuxtLink>
      </template>

      <template #body>
        <UNavigationMenu :items="navigationItems" orientation="vertical" class="mobile-nav" :aria-label="isAdminPage ? '移动端管理导航' : '移动端主导航'" />
      </template>
    </UHeader>
  </div>
</template>

<style scoped>
.app-header-wrap { position: sticky; z-index: 10; top: 14px; width: min(100% - 28px, 1480px); margin: 0 auto; }
.app-header { border: 1px solid var(--line); border-radius: 12px; background: var(--header-surface); box-shadow: 0 3px 10px -6px var(--shadow); }
.app-header-container { min-height: 54px; padding: 0 16px 0 12px; }
.app-header-left { min-width: 0; gap: 28px; }
.app-header-center { flex: 1; justify-content: flex-start; }
.app-header-right { flex: 0 0 auto; gap: 14px; font-size: .78rem; font-weight: 650; }
.brand { display: inline-flex; min-width: 0; align-items: center; gap: 9px; color: var(--text); font-size: .9rem; font-weight: 650; letter-spacing: -.025em; text-decoration: none; white-space: nowrap; }
.brand > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.brand-mark { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: var(--on-accent); background: var(--accent); font-size: .92rem; font-weight: 760; }
.main-nav { color: var(--muted); font-size: .78rem; }
.main-nav :deep(a) { text-decoration: none; }
.login-link { min-height: 34px; padding: 8px 11px; border: 1px solid var(--line); border-radius: 9px; color: var(--text); background: var(--surface-raised); text-decoration: none; transition: transform 100ms ease-out, background 160ms ease; }
.login-link:active { transform: scale(.97); }
.mobile-nav { padding: 8px 0; }

@media (max-width: 1023px) {
  .app-header-center { display: flex !important; }
}

@media (max-width: 760px) {
  .app-header-wrap { top: max(8px, env(safe-area-inset-top)); }
  .app-header-container { min-height: 52px; padding: 6px 8px 6px 10px; }
  .app-header-left { gap: 10px; }
  .app-header-center { display: none !important; }
  .app-header-right { margin-left: auto; gap: 8px; }
  .app-header-toggle { width: 40px; height: 40px; }
}

@media (max-width: 380px) {
  .app-header-left { gap: 6px; }
  .brand { gap: 7px; font-size: .82rem; }
  .brand-mark { width: 26px; height: 26px; }
}
</style>
