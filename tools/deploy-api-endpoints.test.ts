import { describe, expect, it, vi } from "vitest";
import { deployOperations, operationsFromOpenApi } from "./deploy-api-endpoints.ts";

describe("API endpoint deployment", () => {
  it("extracts sorted Cloudflare operations from OpenAPI paths", () => {
    expect(operationsFromOpenApi({ servers: [{ url: "https://api.example.com" }], paths: { "/v1/z": { post: {}, parameters: [] }, "/health": { get: {} } } })).toEqual([
      { endpoint: "/health", host: "api.example.com", method: "GET" },
      { endpoint: "/v1/z", host: "api.example.com", method: "POST" },
    ]);
  });

  it("posts the complete operation list to Cloudflare", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await deployOperations("zone-id", "token", [{ endpoint: "/health", host: "api.example.com", method: "GET" }], fetcher);
    expect(fetcher).toHaveBeenCalledWith("https://api.cloudflare.com/client/v4/zones/zone-id/api_gateway/operations", expect.objectContaining({ method: "POST", body: JSON.stringify([{ endpoint: "/health", host: "api.example.com", method: "GET" }]) }));
  });

  it("fails when Cloudflare rejects the request", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, errors: [{ message: "invalid token" }] }), { status: 403 }));
    await expect(deployOperations("zone-id", "token", [], fetcher)).rejects.toThrow("invalid token");
  });
});
