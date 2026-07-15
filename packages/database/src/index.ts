import { desc, eq, and, gt, like, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { AuthContext, PlatformServices } from "@owbastion/domain";
import type { QqBindingRequest, QqGroupAccessRequest, QqLoginAttemptRequest, QqLoginVerifyRequest, SubmissionRequest } from "@owbastion/contracts";
import { attachments, auditEvents, bindings, identities, idempotencyKeys, playerAccounts, qqGroupAccess, qqLoginAttempts, qqSessions, submissions } from "./schema";

const now = () => Date.now();
const loginTtlMs = 2 * 60 * 1000;
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomToken = (bytes = 32) => {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const randomCode = () => {
  const value = new Uint8Array(6);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => codeAlphabet[byte % codeAlphabet.length]).join("");
};

const hashRequest = async (value: unknown) => {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const replayOrConflict = async <T>(db: ReturnType<typeof drizzle>, actorId: string, operation: string, key: string, input: unknown) => {
  const existing = await db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.id, `${actorId}:${operation}:${key}`))).get();
  if (!existing) return null;
  const requestHash = await hashRequest(input);
  if (existing.requestHash !== requestHash) throw new Error("IDEMPOTENCY_CONFLICT");
  return JSON.parse(existing.responseJson) as T;
};

const recordIdempotency = async (db: ReturnType<typeof drizzle>, actorId: string, operation: string, key: string, input: unknown, response: unknown) => {
  await db.insert(idempotencyKeys).values({
    id: `${actorId}:${operation}:${key}`,
    actorId,
    operation,
    requestHash: await hashRequest(input),
    responseJson: JSON.stringify(response),
    createdAt: now(),
  });
};

const recordAudit = async (db: ReturnType<typeof drizzle>, auth: AuthContext, operation: string, entityType: string, entityId: string, payload: unknown) => {
  await db.insert(auditEvents).values({
    id: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
    actorType: auth.actorType,
    actorId: auth.subject,
    operation,
    entityType,
    entityId,
    payloadJson: JSON.stringify(payload),
    createdAt: now(),
  });
};

const normalizePlayerName = (name: string) => name.trim().toLocaleLowerCase();

const digestHex = async (value: ArrayBuffer) => {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const validateSourceUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:" || /^(localhost|127\.|0\.0\.0\.0$|::1$|169\.254\.)/i.test(url.hostname)) throw new Error("SOURCE_ATTACHMENT_UNAVAILABLE");
};

const persistEvidence = async (db: ReturnType<typeof drizzle>, bucket: R2Bucket, submissionId: string, attachmentId: string, sourceUrl: string, contentType: string) => {
  validateSourceUrl(sourceUrl);
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("SOURCE_ATTACHMENT_UNAVAILABLE");
  const responseType = response.headers.get("content-type")?.split(";", 1)[0] ?? contentType;
  if (!responseType.startsWith("image/")) throw new Error("UNSUPPORTED_ATTACHMENT_TYPE");
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 10 * 1024 * 1024) throw new Error("ATTACHMENT_SIZE_INVALID");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) throw new Error("ATTACHMENT_SIZE_INVALID");
  const sha256 = await digestHex(bytes);
  const extension = responseType === "image/jpeg" ? "jpg" : responseType.split("/")[1] ?? "bin";
  const objectKey = `evidence/submissions/${submissionId}/${sha256}.${extension}`;
  await bucket.put(objectKey, bytes, { httpMetadata: { contentType: responseType } });
  await db.update(attachments).set({ objectKey, sha256, byteSize: bytes.byteLength, uploadStatus: "stored" }).where(eq(attachments.id, attachmentId));
  return objectKey;
};

export const createPlatformServices = (database: D1Database, evidenceBucket?: R2Bucket): PlatformServices => {
  const db = drizzle(database);

  return {
    async listQqGroupAccess() {
      const groups = await db.select().from(qqGroupAccess).orderBy(desc(qqGroupAccess.updatedAt));
      return groups.map((group) => ({ contractVersion: "1" as const, groupOpenId: group.groupOpenId, environment: group.environment as "production" | "test", enabled: group.enabled === 1, updatedAt: group.updatedAt }));
    },

    async listAdminPlayers(input) {
      const conditions = [];
      if (input.status) conditions.push(eq(playerAccounts.status, input.status));
      if (input.query) {
        const query = `%${input.query}%`;
        const matchingBindings = await db.select({ playerAccountId: bindings.playerAccountId }).from(bindings).where(or(like(bindings.groupOpenId, query), like(bindings.memberOpenId, query)));
        conditions.push(or(like(playerAccounts.playerId, query), like(playerAccounts.playerName, query), like(playerAccounts.normalizedPlayerName, query), ...(matchingBindings.length ? [inArray(playerAccounts.id, matchingBindings.map((binding) => binding.playerAccountId))] : []))!);
      }
      const accounts = await db.select().from(playerAccounts).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(playerAccounts.updatedAt)).limit(input.pageSize + 1).offset((input.page - 1) * input.pageSize);
      const hasMore = accounts.length > input.pageSize;
      const items = accounts.slice(0, input.pageSize);
      return {
        contractVersion: "1" as const,
        items: await Promise.all(items.map(async (account) => ({
          playerAccountId: account.id,
          playerId: account.playerId,
          playerName: account.playerName,
          status: account.status as "active" | "banned",
          bindingCount: (await db.select().from(bindings).where(eq(bindings.playerAccountId, account.id))).length,
          updatedAt: account.updatedAt,
        }))),
        page: input.page,
        pageSize: input.pageSize,
        hasMore,
      };
    },

    async getAdminPlayer(input) {
      const account = await db.select().from(playerAccounts).where(eq(playerAccounts.id, input.playerAccountId)).get();
      if (!account) throw new Error("PLAYER_NOT_FOUND");
      const playerBindings = await db.select().from(bindings).where(eq(bindings.playerAccountId, account.id)).orderBy(desc(bindings.createdAt));
      const recentSubmissions = playerBindings.length
        ? await db.select({ submissionId: submissions.id, status: submissions.status, mapName: submissions.mapName, createdAt: submissions.createdAt, updatedAt: submissions.updatedAt })
          .from(submissions).where(or(...playerBindings.map((binding) => eq(submissions.bindingId, binding.id)))).orderBy(desc(submissions.createdAt)).limit(10)
        : [];
      return {
        contractVersion: "1" as const,
        playerAccountId: account.id,
        playerId: account.playerId,
        playerName: account.playerName,
        status: account.status as "active" | "banned",
        bindingCount: playerBindings.length,
        updatedAt: account.updatedAt,
        bindings: playerBindings.map((binding) => ({ bindingId: binding.id, provider: "qq" as const, groupOpenId: binding.groupOpenId, memberOpenId: binding.memberOpenId, createdAt: binding.createdAt })),
        recentSubmissions: recentSubmissions.map((submission) => ({ ...submission, status: submission.status as "received" | "evidence_pending" | "evidence_stored" | "ocr_pending" | "resubmission_required" })),
      };
    },

    async setAdminPlayerStatus(input, auth, idempotencyKey) {
      const replay = await replayOrConflict<Record<string, never>>(db, auth.subject, "admin.player.status", idempotencyKey, input);
      if (replay) return;
      const account = await db.select().from(playerAccounts).where(eq(playerAccounts.id, input.playerAccountId)).get();
      if (!account) throw new Error("PLAYER_NOT_FOUND");
      const timestamp = now();
      await db.update(playerAccounts).set({ status: input.status, bannedAt: input.status === "banned" ? timestamp : null, bannedBy: input.status === "banned" ? auth.subject : null, banReason: input.status === "banned" ? input.reason ?? null : null, updatedAt: timestamp }).where(eq(playerAccounts.id, input.playerAccountId));
      if (input.status === "banned") {
        const accountBindings = await db.select({ groupOpenId: bindings.groupOpenId, memberOpenId: bindings.memberOpenId }).from(bindings).where(eq(bindings.playerAccountId, input.playerAccountId));
        if (accountBindings.length) await db.delete(qqSessions).where(or(...accountBindings.map((binding) => and(eq(qqSessions.groupOpenId, binding.groupOpenId), eq(qqSessions.memberOpenId, binding.memberOpenId)))));
      }
      await recordIdempotency(db, auth.subject, "admin.player.status", idempotencyKey, input, {});
      await recordAudit(db, auth, `admin.player.${input.status}`, "player_account", input.playerAccountId, { status: input.status, reason: input.reason ?? null });
    },

    async removeAdminBinding(input, auth, idempotencyKey) {
      const replay = await replayOrConflict<Record<string, never>>(db, auth.subject, "admin.binding.remove", idempotencyKey, input);
      if (replay) return;
      const binding = await db.select().from(bindings).where(eq(bindings.id, input.bindingId)).get();
      if (!binding) throw new Error("BINDING_NOT_FOUND");
      await db.delete(qqSessions).where(and(eq(qqSessions.groupOpenId, binding.groupOpenId), eq(qqSessions.memberOpenId, binding.memberOpenId)));
      await db.delete(bindings).where(eq(bindings.id, input.bindingId));
      await recordIdempotency(db, auth.subject, "admin.binding.remove", idempotencyKey, input, {});
      await recordAudit(db, auth, "admin.binding.remove", "binding", input.bindingId, { playerAccountId: binding.playerAccountId });
    },

    async upsertQqGroupAccess(input: QqGroupAccessRequest, auth) {
      const timestamp = now();
      const existing = await db.select().from(qqGroupAccess).where(eq(qqGroupAccess.groupOpenId, input.groupOpenId)).get();
      if (existing) {
        await db.update(qqGroupAccess).set({ environment: input.environment, enabled: input.enabled ? 1 : 0, updatedAt: timestamp }).where(eq(qqGroupAccess.groupOpenId, input.groupOpenId));
      } else {
        await db.insert(qqGroupAccess).values({ groupOpenId: input.groupOpenId, environment: input.environment, enabled: input.enabled ? 1 : 0, createdAt: timestamp, updatedAt: timestamp });
      }
      await recordAudit(db, auth, "qq.group_access.update", "qq_group_access", input.groupOpenId, { environment: input.environment, enabled: input.enabled });
    },

    async createQqLoginAttempt(input: QqLoginAttemptRequest) {
      const timestamp = now();
      const attemptId = crypto.randomUUID();
      const attemptToken = randomToken();
      const code = randomCode();
      await db.insert(qqLoginAttempts).values({ id: attemptId, tokenHash: await hashRequest(attemptToken), codeHash: await hashRequest(code), status: "pending", expiresAt: timestamp + loginTtlMs, createdAt: timestamp });
      return { contractVersion: "1" as const, attemptId, attemptToken, code, expiresAt: timestamp + loginTtlMs };
    },

    async getQqLoginStatus(input) {
      const attempt = await db.select().from(qqLoginAttempts).where(eq(qqLoginAttempts.id, input.attemptId)).get();
      if (!attempt) throw new Error("LOGIN_ATTEMPT_NOT_FOUND");
      if (attempt.tokenHash !== await hashRequest(input.attemptToken)) throw new Error("LOGIN_ATTEMPT_FORBIDDEN");
      if (attempt.status === "pending" && attempt.expiresAt <= now()) {
        await db.update(qqLoginAttempts).set({ status: "expired" }).where(eq(qqLoginAttempts.id, attempt.id));
        return { contractVersion: "1" as const, status: "expired" as const };
      }
      if (attempt.status !== "verified") return { contractVersion: "1" as const, status: attempt.status as "pending" | "expired" };
      if (!attempt.groupOpenId || !attempt.memberOpenId || !attempt.environment) return { contractVersion: "1" as const, status: "expired" as const };
      if (attempt.sessionIssuedAt) return { contractVersion: "1" as const, status: "verified" as const, environment: attempt.environment as "production" | "test" };
      const sessionToken = randomToken();
      const timestamp = now();
      await db.insert(qqSessions).values({ id: crypto.randomUUID(), attemptId: attempt.id, groupOpenId: attempt.groupOpenId, memberOpenId: attempt.memberOpenId, environment: attempt.environment, tokenHash: await hashRequest(sessionToken), expiresAt: timestamp + sessionTtlMs, createdAt: timestamp });
      await db.update(qqLoginAttempts).set({ sessionTokenHash: await hashRequest(sessionToken), sessionIssuedAt: timestamp }).where(eq(qqLoginAttempts.id, attempt.id));
      return { contractVersion: "1" as const, status: "verified" as const, environment: attempt.environment as "production" | "test", sessionToken };
    },

    async verifyQqLogin(input: QqLoginVerifyRequest, auth, idempotencyKey) {
      const replay = await replayOrConflict<ReturnType<PlatformServices["verifyQqLogin"]> extends Promise<infer T> ? T : never>(db, auth.subject, "qq.login.verify", idempotencyKey, input);
      if (replay) return replay;
      const group = await db.select().from(qqGroupAccess).where(and(eq(qqGroupAccess.groupOpenId, input.groupOpenId), eq(qqGroupAccess.enabled, 1))).get();
      if (!group) throw new Error("LOGIN_GROUP_NOT_ALLOWED");
      const binding = await db.select().from(bindings).where(and(eq(bindings.provider, input.provider), eq(bindings.groupOpenId, input.groupOpenId), eq(bindings.memberOpenId, input.memberOpenId))).get();
      if (!binding) throw new Error("LOGIN_BINDING_REQUIRED");
      const account = await db.select().from(playerAccounts).where(eq(playerAccounts.id, binding.playerAccountId)).get();
      if (!account || account.status === "banned") throw new Error("PLAYER_BANNED");
      const attempt = await db.select().from(qqLoginAttempts).where(and(eq(qqLoginAttempts.codeHash, await hashRequest(input.code)), eq(qqLoginAttempts.status, "pending"))).get();
      if (!attempt) throw new Error("LOGIN_CODE_INVALID");
      if (attempt.expiresAt <= now()) {
        await db.update(qqLoginAttempts).set({ status: "expired" }).where(eq(qqLoginAttempts.id, attempt.id));
        throw new Error("LOGIN_CODE_EXPIRED");
      }
      await db.update(qqLoginAttempts).set({ status: "verified", groupOpenId: input.groupOpenId, memberOpenId: input.memberOpenId, environment: group.environment, messageId: input.messageId, verifiedAt: now() }).where(eq(qqLoginAttempts.id, attempt.id));
      const response = { contractVersion: "1" as const, status: "verified" as const, environment: group.environment as "production" | "test" };
      await recordIdempotency(db, auth.subject, "qq.login.verify", idempotencyKey, input, response);
      await recordAudit(db, auth, "qq.login.verify", "qq_login_attempt", attempt.id, { environment: group.environment });
      return response;
    },

    async getCurrentPlayer(input) {
      const session = await db.select().from(qqSessions).where(and(eq(qqSessions.tokenHash, await hashRequest(input.sessionToken)), gt(qqSessions.expiresAt, now()))).get();
      if (!session) return null;
      const binding = await db.select().from(bindings).where(and(eq(bindings.provider, "qq"), eq(bindings.groupOpenId, session.groupOpenId), eq(bindings.memberOpenId, session.memberOpenId))).get();
      if (!binding) return null;
      const player = await db.select().from(playerAccounts).where(eq(playerAccounts.id, binding.playerAccountId)).get();
      if (!player || player.status === "banned") return null;
      const recentSubmissions = await db.select({ submissionId: submissions.id, status: submissions.status, mapName: submissions.mapName, createdAt: submissions.createdAt, updatedAt: submissions.updatedAt })
        .from(submissions)
        .where(eq(submissions.bindingId, binding.id))
        .orderBy(desc(submissions.createdAt))
        .limit(5);
      return {
        contractVersion: "1" as const,
        player: { playerId: player.playerId, playerName: player.playerName, bindingStatus: "bound" as const },
        recentSubmissions: recentSubmissions.map((submission) => ({ ...submission, status: submission.status as "received" | "evidence_pending" | "evidence_stored" | "ocr_pending" | "resubmission_required" })),
      };
    },

    async logoutPortalSession(input) {
      await db.delete(qqSessions).where(eq(qqSessions.tokenHash, await hashRequest(input.sessionToken)));
    },

    async createBinding(input: QqBindingRequest, auth, idempotencyKey) {
      const replay = await replayOrConflict<ReturnType<PlatformServices["createBinding"]> extends Promise<infer T> ? T : never>(db, auth.subject, "qq.binding.create", idempotencyKey, input);
      if (replay) return replay;

      const existing = await db.select().from(bindings).where(and(eq(bindings.provider, input.provider), eq(bindings.groupOpenId, input.groupOpenId), eq(bindings.memberOpenId, input.memberOpenId))).get();
      let account = existing
        ? await db.select().from(playerAccounts).where(eq(playerAccounts.id, existing.playerAccountId)).get()
        : await db.select().from(playerAccounts).where(eq(playerAccounts.playerId, input.playerId)).get();
      if (existing && account?.playerId !== input.playerId) throw new Error("BINDING_CONFLICT");
      if (account?.status === "banned") throw new Error("PLAYER_BANNED");
      if (!account) {
        const timestamp = now();
        account = { id: crypto.randomUUID(), playerId: input.playerId, playerName: input.playerName, normalizedPlayerName: normalizePlayerName(input.playerName), status: "active", bannedAt: null, bannedBy: null, banReason: null, createdAt: timestamp, updatedAt: timestamp };
        await db.insert(playerAccounts).values(account);
      } else if (account.playerName !== input.playerName) {
        await db.update(playerAccounts).set({ playerName: input.playerName, normalizedPlayerName: normalizePlayerName(input.playerName), updatedAt: now() }).where(eq(playerAccounts.id, account.id));
        account = { ...account, playerName: input.playerName, normalizedPlayerName: normalizePlayerName(input.playerName), updatedAt: now() };
      }
      if (!account) throw new Error("PLAYER_NOT_FOUND");

      if (existing) {
        if (existing.playerAccountId !== account.id) throw new Error("BINDING_CONFLICT");
        const response = { contractVersion: "1" as const, bindingId: existing.id, identityId: existing.identityId, provider: "qq" as const, groupOpenId: existing.groupOpenId, memberOpenId: existing.memberOpenId, playerName: account.playerName, playerId: account.playerId };
        await recordIdempotency(db, auth.subject, "qq.binding.create", idempotencyKey, input, response);
        return response;
      }

      const identityId = crypto.randomUUID();
      const bindingId = crypto.randomUUID();
      const timestamp = now();
      await db.insert(identities).values({ id: identityId, createdAt: timestamp, updatedAt: timestamp });
      await db.insert(bindings).values({ id: bindingId, identityId, playerAccountId: account.id, provider: input.provider, groupOpenId: input.groupOpenId, memberOpenId: input.memberOpenId, createdAt: timestamp });
      const response = { contractVersion: "1" as const, bindingId, identityId, provider: "qq" as const, groupOpenId: input.groupOpenId, memberOpenId: input.memberOpenId, playerName: account.playerName, playerId: account.playerId };
      await recordIdempotency(db, auth.subject, "qq.binding.create", idempotencyKey, input, response);
      await recordAudit(db, auth, "qq.binding.create", "binding", bindingId, { provider: input.provider });
      return response;
    },

    async createSubmission(input: SubmissionRequest, auth, idempotencyKey) {
      const replay = await replayOrConflict<ReturnType<PlatformServices["createSubmission"]> extends Promise<infer T> ? T : never>(db, auth.subject, "submission.create", idempotencyKey, input);
      if (replay) return replay;
      const binding = await db.select().from(bindings).where(and(eq(bindings.provider, input.actor.provider), eq(bindings.groupOpenId, input.actor.groupOpenId), eq(bindings.memberOpenId, input.actor.memberOpenId))).get();
      if (!binding) throw new Error("BINDING_NOT_FOUND");
      const account = await db.select().from(playerAccounts).where(eq(playerAccounts.id, binding.playerAccountId)).get();
      if (!account || account.status === "banned") throw new Error("PLAYER_BANNED");

      const submissionId = crypto.randomUUID();
      const timestamp = now();
      await db.insert(submissions).values({ id: submissionId, bindingId: binding.id, status: evidenceBucket ? "evidence_pending" : "received", challengeType: input.challenge.type, mapName: input.challenge.mapName, sourceProvider: input.source.provider, sourceConversationId: input.source.conversationId, sourceMessageId: input.source.messageId, createdAt: timestamp, updatedAt: timestamp });
      const attachmentIds: string[] = [];
      for (const attachment of input.attachments) {
        const id = crypto.randomUUID();
        attachmentIds.push(id);
        await db.insert(attachments).values({ id, submissionId, provider: input.source.provider, externalAttachmentId: attachment.externalAttachmentId, contentType: attachment.contentType, byteSize: attachment.byteSize, sha256: attachment.sha256, uploadStatus: evidenceBucket ? "pending" : "not_configured", createdAt: timestamp });
      }
      let status: "evidence_pending" | "evidence_stored" | "ocr_pending" | "resubmission_required" = evidenceBucket ? "evidence_pending" : "evidence_pending";
      if (evidenceBucket) {
        try {
          for (const [index, attachment] of input.attachments.entries()) await persistEvidence(db, evidenceBucket, submissionId, attachmentIds[index], attachment.sourceUrl, attachment.contentType);
          status = "ocr_pending";
          await db.update(submissions).set({ status, updatedAt: now() }).where(eq(submissions.id, submissionId));
        } catch (error) {
          status = error instanceof Error && ["SOURCE_ATTACHMENT_UNAVAILABLE", "UNSUPPORTED_ATTACHMENT_TYPE", "ATTACHMENT_SIZE_INVALID"].includes(error.message) ? "resubmission_required" : "evidence_pending";
          await db.update(submissions).set({ status, updatedAt: now() }).where(eq(submissions.id, submissionId));
        }
      }
      const response = { contractVersion: "1" as const, submissionId, status, mapName: input.challenge.mapName, attachmentIds };
      await recordIdempotency(db, auth.subject, "submission.create", idempotencyKey, input, response);
      await recordAudit(db, auth, "submission.create", "submission", submissionId, { bindingId: binding.id, attachmentCount: attachmentIds.length, mapName: input.challenge.mapName, status });
      return response;
    },

    async getSubmission(input, _auth) {
      const submission = await db.select().from(submissions).where(eq(submissions.id, input.submissionId)).get();
      if (!submission) throw new Error("SUBMISSION_NOT_FOUND");
      return { contractVersion: "1" as const, submissionId: submission.id, status: submission.status as "received" | "evidence_pending" | "evidence_stored" | "ocr_pending" | "resubmission_required", mapName: submission.mapName, createdAt: submission.createdAt, updatedAt: submission.updatedAt };
    },
  };
};

export * from "./schema";
