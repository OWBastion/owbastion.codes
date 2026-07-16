import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PortalButton from "./PortalButton.vue";
import PortalInput from "./PortalInput.vue";

describe("Portal UI wrappers", () => {
  it("maps danger loading actions to a disabled Nuxt UI button", async () => {
    const wrapper = await mountSuspended(PortalButton, { props: { tone: "danger", loading: true }, slots: { default: "删除" } });
    expect(wrapper.classes()).toContain("portal-button--danger");
    expect(wrapper.attributes("disabled")).toBeDefined();
  });

  it("forwards input values through its v-model contract", async () => {
    const wrapper = await mountSuspended(PortalInput, { props: { modelValue: "初始值" } });
    await wrapper.get("input").setValue("新值");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["新值"]);
  });
});
