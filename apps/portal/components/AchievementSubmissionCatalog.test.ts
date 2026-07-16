import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AchievementSubmissionCatalog from "./AchievementSubmissionCatalog.vue";

describe("AchievementSubmissionCatalog", () => {
  it("uses its title without a redundant eyebrow", async () => {
    const wrapper = await mountSuspended(AchievementSubmissionCatalog, {
      props: { challenges: [], selectedChallengeId: "" },
    });

    expect(wrapper.get("#achievement-catalog-title").text()).toBe("选择成就目标");
    expect(wrapper.find(".catalog-heading .eyebrow").exists()).toBe(false);
  });
});
