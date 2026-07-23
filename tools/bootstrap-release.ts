import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { releaseSnapshotSchema } from "@owbastion/contracts";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index === -1 ? undefined : args[index + 1]; };
const snapshotPath = valueAfter("--snapshot");
const database = valueAfter("--database") ?? "DB";
const remote = args.includes("--remote");
const dryRun = args.includes("--dry-run");
if (!snapshotPath || args.includes("--help")) {
  console.log("Usage: pnpm db:release:bootstrap --snapshot <path> [--database <name>] [--remote] [--dry-run]");
  process.exit(snapshotPath ? 0 : 1);
}

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");

const normalizeSnapshot = (raw: any) => {
  if (raw?.schemaVersion === 1 && Array.isArray(raw.items)) return releaseSnapshotSchema.parse(raw);
  const sourceVersion = String(raw?.sourceVersion ?? raw?.gameVersion ?? raw?.meta?.sourceVersion ?? "bootstrap");
  const candidateId = `bootstrap-${sourceVersion.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const items = [
    ...(Array.isArray(raw?.titles) ? raw.titles.map((data: any) => ({ contentType: "title", contentId: `title.${data.key}`, operation: "upsert", data: { titleKey: data.key, label: data.label, icon: data.icon ?? "trophy", iconUrl: data.iconUrl ?? null, category: data.category, condition: data.condition, availability: data.availability ?? "active", scope: data.scope ?? "global", displayKind: data.displayKind ?? "fixed", gameVersion: data.gameVersion ?? sourceVersion } })) : []),
    ...(Array.isArray(raw?.maps) ? raw.maps.map((data: any) => ({ contentType: "map", contentId: data.mapId ?? `map.${data.mapKey}`, operation: "upsert", data: { mapId: data.mapId ?? `map.${data.mapKey}`, mapName: data.mapName ?? data.mapLabel ?? data.name, gameVersion: data.gameVersion ?? sourceVersion, difficultyRating: data.difficultyRating ?? null, mechanics: data.mechanics ?? [], coverUrl: data.coverUrl ?? null, backgroundUrl: data.backgroundUrl ?? null } })) : []),
  ];
  const withoutHash = { schemaVersion: 1 as const, candidateId, baseReleaseId: null, sourceVersion, generatedAt: Date.now(), items };
  return { ...withoutHash, snapshotHash: hash(withoutHash) };
};

const buildSql = (snapshot: ReturnType<typeof normalizeSnapshot>) => {
  const candidateId = snapshot.candidateId;
  const releaseId = `release-${candidateId}`;
  const timestamp = snapshot.generatedAt;
  const lines = [
    "BEGIN;",
    `INSERT OR IGNORE INTO content_candidates (id, change_set_id, base_release_id, source_version, snapshot_json, snapshot_hash, status, created_by, created_at) VALUES (${quote(candidateId)}, ${quote(`bootstrap-${candidateId}`)}, NULL, ${quote(snapshot.sourceVersion)}, ${quote(JSON.stringify(snapshot))}, ${quote(snapshot.snapshotHash)}, 'succeeded', 'bootstrap', ${timestamp});`,
    `INSERT OR IGNORE INTO content_releases (id, candidate_id, source_version, status, bastion_commit_sha, artifact_refs_json, diagnostics_json, created_at, activated_at) VALUES (${quote(releaseId)}, ${quote(candidateId)}, ${quote(snapshot.sourceVersion)}, 'active', NULL, '[]', '{"warnings":[],"errors":[]}', ${timestamp}, ${timestamp});`,
    `INSERT INTO content_release_state (id, current_release_id, next_candidate_id, updated_at) VALUES ('singleton', ${quote(releaseId)}, NULL, ${timestamp}) ON CONFLICT(id) DO UPDATE SET current_release_id = excluded.current_release_id, next_candidate_id = NULL, updated_at = excluded.updated_at;`,
    "COMMIT;",
  ];
  return lines.join("\n") + "\n";
};

const main = async () => {
  const raw = JSON.parse(await fs.readFile(path.resolve(snapshotPath!), "utf8"));
  const snapshot = normalizeSnapshot(raw);
  const sql = buildSql(snapshot);
  if (dryRun) {
    console.log(JSON.stringify({ mode: "dry-run", candidateId: snapshot.candidateId, sourceVersion: snapshot.sourceVersion, snapshotHash: snapshot.snapshotHash, itemCount: snapshot.items.length, sqlBytes: Buffer.byteLength(sql) }, null, 2));
    return;
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "owbastion-release-bootstrap-"));
  const sqlPath = path.join(tempDir, "bootstrap.sql");
  try {
    await fs.writeFile(sqlPath, sql);
    const flags = remote ? ["--remote"] : ["--local"];
    await execFileAsync("pnpm", ["exec", "wrangler", "d1", "execute", database, ...flags, "--file", sqlPath], { maxBuffer: 20 * 1024 * 1024 });
    console.log(`Bootstrapped Current release ${snapshot.sourceVersion} (${snapshot.snapshotHash})`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
