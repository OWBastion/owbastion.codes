import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("API", () => {
  it("reports health without external services", async () => {
    const response = await app.request("http://localhost/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "api",
      status: "ok",
    });
  });
});
