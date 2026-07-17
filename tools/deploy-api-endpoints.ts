import fs from "node:fs/promises";
import path from "node:path";

type OpenApiDocument = { servers?: Array<{ url?: string }>; paths?: Record<string, Record<string, unknown>> };

export type CloudflareOperation = { endpoint: string; host: string; method: string };

const supportedMethods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "connect", "trace"]);

export const operationsFromOpenApi = (document: OpenApiDocument, hostOverride?: string): CloudflareOperation[] => {
  const host = hostOverride ?? (document.servers?.[0]?.url ? new URL(document.servers[0].url).hostname : undefined);
  if (!host) throw new Error("OpenAPI document must define servers[0].url or --host");
  const operations = Object.entries(document.paths ?? {}).flatMap(([endpoint, pathItem]) => Object.keys(pathItem)
    .filter((method) => supportedMethods.has(method.toLowerCase()))
    .map((method) => ({ endpoint, host, method: method.toUpperCase() })));
  if (operations.length === 0) throw new Error("OpenAPI document does not contain any operations");
  return operations.sort((left, right) => `${left.host}${left.endpoint}${left.method}`.localeCompare(`${right.host}${right.endpoint}${right.method}`));
};

export const deployOperations = async (zoneId: string, token: string, operations: CloudflareOperation[], fetcher = fetch) => {
  const response = await fetcher(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/api_gateway/operations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(operations),
  });
  const body = await response.json() as { success?: boolean; errors?: Array<{ message?: string }> };
  if (!response.ok || body.success !== true) {
    const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API endpoint deployment failed: ${detail}`);
  }
  return body;
};

const argumentValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("Usage: pnpm deploy:api-endpoints [--spec <path>] [--host <hostname>]");
    return;
  }
  const specPath = path.resolve(argumentValue(args, "--spec") ?? "docs/api/openapi.json");
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId) throw new Error("CLOUDFLARE_ZONE_ID is required");
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is required");
  const document = JSON.parse(await fs.readFile(specPath, "utf8")) as OpenApiDocument;
  const operations = operationsFromOpenApi(document, argumentValue(args, "--host"));
  await deployOperations(zoneId, token, operations);
  console.log(`Deployed ${operations.length} API Shield endpoint operations from ${path.relative(process.cwd(), specPath)}.`);
};

if (import.meta.main) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
