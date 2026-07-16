import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import MePage from "./me.vue";

const player = ref({ player: { playerId: "1", playerName: "Player", bindingStatus: "bound" as const, isAdmin: false }, recentSubmissions: [] });
const titles = ref(Array.from({ length: 4 }, (_, index) => ({ grantId: `grant-${index}`, titleKey: `TITLE-${index}`, label: `称号${index}`, category: "测试", condition: "完成挑战", scope: "global" as const, grantedAt: 4 - index })));
mockNuxtImport("useCurrentPlayer", () => () => ({ player, refresh: vi.fn(async () => player.value) }));
mockNuxtImport("usePlayerTitles", () => () => ({ items: titles, refresh: vi.fn(async () => titles.value) }));

describe("me page", () => {
  it("shows only the three most recently granted titles and links to achievements", async () => {
    const wrapper = await mountSuspended(MePage, {
      global: {
        stubs: {
          PlayerIdentityCard: true,
          StatusBadge: true,
          PlayerRecentSubmissions: true,
          PageSectionHeader: { props: ["title"], template: "<header><h2>{{ title }}</h2><slot name=\"actions\" /></header>" },
          TitleCollection: { props: ["titles"], template: "<div class=\"title-count\">{{ titles.length }}</div>" },
          UButton: { props: ["to", "label"], template: "<a :href=\"to\">{{ label }}</a>" },
        },
      },
    });
    await flushPromises();
    expect(wrapper.find(".title-count").text()).toBe("3");
    expect(wrapper.find('a[href="/achievements"]').text()).toContain("查看全部成就");
  });
});
