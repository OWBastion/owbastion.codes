import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./index.vue";

const adminApi = vi.fn((path: string) => {
  if (path.startsWith("/v1/player-accounts?")) return Promise.resolve({ items: [{ playerAccountId: "player-1", playerName: "他又", playerId: "51705", bindingCount: 1, status: "active" }], hasMore: false });
  if (path === "/v1/qq/groups") return Promise.resolve({ items: [] });
  if (path === "/v1/submissions?status=ready_for_review") return Promise.resolve({ items: [{ submissionId: "submission-1", mapName: "帕拉伊苏", difficulty: "困难", playerName: "他又", status: "ready_for_review" }] });
  if (path === "/v1/player-accounts/player-1") return Promise.resolve({ playerAccountId: "player-1", playerName: "他又", playerId: "51705", status: "active", updatedAt: 0, bindings: [], recentSubmissions: [] });
  if (path === "/v1/submissions/submission-1") return Promise.resolve({ submissionId: "submission-1", mapName: "帕拉伊苏", difficulty: "困难", playerName: "他又", status: "ready_for_review" });
  throw new Error(`Unexpected request: ${path}`);
});

mockNuxtImport("useAdminApi", () => () => adminApi);

async function mountPage(): Promise<VueWrapper> {
  adminApi.mockClear();
  const wrapper = await mountSuspended(AdminPage, {
    attachTo: document.body,
    global: { stubs: { NuxtLink: { template: "<a><slot /></a>" }, StatusBadge: { props: ["label"], template: "<span>{{ label }}</span>" } }, },
  });
  await flushPromises();
  return wrapper;
}

describe("admin page details", () => {
  it("names the player dialog and returns focus after Escape", async () => {
    const wrapper = await mountPage();
    const trigger = wrapper.get(".admin-row");
    (trigger.element as HTMLButtonElement).focus();
    await trigger.trigger("click");
    await flushPromises();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-labelledby")).toBe("detail-title");
    expect(document.activeElement).toBe(wrapper.get(".sheet-close").element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(document.activeElement).toBe(trigger.element);
  });

  it("names the submission dialog and closes it with Escape", async () => {
    const wrapper = await mountPage();
    const trigger = wrapper.get(".review-row");
    (trigger.element as HTMLButtonElement).focus();
    await trigger.trigger("click");
    await flushPromises();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-labelledby")).toBe("submission-detail-title");
    expect(wrapper.get("#submission-detail-title").text()).toContain("帕拉伊苏");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(document.activeElement).toBe(trigger.element);
  });
});
