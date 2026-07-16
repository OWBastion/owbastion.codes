import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AchievementAdminPage from "./achievements.vue";

const title = { challengeId: "title-1", family: "achievement", type: "title_achievement", titleName: "守望先锋", category: "战绩", categoryOverride: null, condition: "完成挑战", evidenceRule: "完整截图", submissionMode: "manual", status: "active", gameVersion: "3.1.0", introducedVersion: "3.1.0", retiredVersion: null };
const map = { challengeId: "map-1", family: "map", type: "map_completion", name: "国王大道挑战", mapName: "国王大道", difficulty: "困难", status: "active", gameVersion: "3.0.0", introducedVersion: "3.0.0", retiredVersion: null };
const adminApi = vi.fn((path: string, options?: { method?: string; body?: Record<string, unknown> }) => {
  if (path === "/v1/achievements") return Promise.resolve({ items: [title, map] });
  if (path === "/v1/achievements?type=achievement") return Promise.resolve({ items: [title] });
  if (path === "/v1/achievements/title-1" && options?.method === "PUT") return Promise.resolve();
  if (path === "/v1/achievements/map-1" && options?.method === "PUT") return Promise.resolve();
  throw new Error(`Unexpected request: ${path}`);
});
mockNuxtImport("useAdminApi", () => () => adminApi);

async function mountPage(): Promise<VueWrapper> {
  adminApi.mockClear();
  const wrapper = await mountSuspended(AchievementAdminPage, { attachTo: document.body, global: { stubs: { NuxtLink: { template: "<a><slot /></a>" }, StatusBadge: { props: ["label"], template: "<span>{{ label }}</span>" }, PortalSelect: { props: ["modelValue", "items"], emits: ["update:modelValue"], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>' } } } });
  await flushPromises();
  return wrapper;
}

describe("achievement admin page", () => {
  it("opens a title editor, saves it, and returns focus on close", async () => {
    const wrapper = await mountPage();
    const trigger = wrapper.get(".achievement-row");
    (trigger.element as HTMLButtonElement).focus();
    await trigger.trigger("click");
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    await document.body.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(adminApi).toHaveBeenCalledWith("/v1/achievements/title-1", expect.objectContaining({ method: "PUT" }));
    (document.body.querySelector('[role="dialog"] button') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(document.activeElement).toBe(trigger.element);
  });

  it("filters the catalog by challenge type", async () => {
    const wrapper = await mountPage();
    await wrapper.get('select[aria-label="筛选成就类型"]').setValue("achievement");
    await flushPromises();
    expect(wrapper.findAll(".achievement-row")).toHaveLength(1);
    expect(wrapper.text()).toContain("守望先锋");
  });

  it("sets a map challenge to sunsetting with its planned release version", async () => {
    const wrapper = await mountPage();
    await wrapper.findAll(".achievement-row")[1].trigger("click");
    const retireVersion = document.body.querySelector('input[placeholder="例如 26.0713.1"]') as HTMLInputElement;
    retireVersion.value = "26.0713.1";
    retireVersion.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    (document.body.querySelector(".status-action .portal-button--secondary") as HTMLButtonElement).click();
    await flushPromises();
    expect(adminApi).toHaveBeenCalledWith("/v1/achievements/map-1", expect.objectContaining({
      method: "PUT",
      body: expect.objectContaining({ family: "map", status: "sunsetting", retiredVersion: "26.0713.1" }),
    }));
  });
});
