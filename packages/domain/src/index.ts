import type {
  QqBindingRequest,
  QqBindingResponse,
  SubmissionRequest,
  SubmissionResponse,
  SubmissionStatusResponse,
  QqLoginAttemptRequest,
  QqLoginAttemptResponse,
  QqLoginStatusResponse,
  QqLoginVerifyRequest,
  QqLoginVerifyResponse,
  QqGroupAccessRequest,
  QqGroupAccessResponse,
  AdminPlayerDetail,
  AdminPlayerListResponse,
  AdminPlayerStatusRequest,
  CurrentPlayerResponse,
} from "@owbastion/contracts";

export type AuthContext = {
  actorType: "service" | "user";
  subject: string;
  roles: readonly string[];
  provider: string;
};

export type PlatformServices = {
  createBinding(input: QqBindingRequest, auth: AuthContext, idempotencyKey: string): Promise<QqBindingResponse>;
  createSubmission(input: SubmissionRequest, auth: AuthContext, idempotencyKey: string): Promise<SubmissionResponse>;
  getSubmission(input: { submissionId: string }, auth: AuthContext): Promise<SubmissionStatusResponse>;
  createQqLoginAttempt(input: QqLoginAttemptRequest): Promise<QqLoginAttemptResponse>;
  getQqLoginStatus(input: { attemptId: string; attemptToken: string }): Promise<QqLoginStatusResponse>;
  verifyQqLogin(input: QqLoginVerifyRequest, auth: AuthContext, idempotencyKey: string): Promise<QqLoginVerifyResponse>;
  upsertQqGroupAccess(input: QqGroupAccessRequest, auth: AuthContext): Promise<void>;
  listQqGroupAccess(auth: AuthContext): Promise<QqGroupAccessResponse[]>;
  listAdminPlayers(input: { query?: string; status?: "active" | "banned"; page: number; pageSize: number }, auth: AuthContext): Promise<AdminPlayerListResponse>;
  getAdminPlayer(input: { playerAccountId: string }, auth: AuthContext): Promise<AdminPlayerDetail>;
  setAdminPlayerStatus(input: { playerAccountId: string; status: "active" | "banned"; reason?: string }, auth: AuthContext, idempotencyKey: string): Promise<void>;
  removeAdminBinding(input: { bindingId: string }, auth: AuthContext, idempotencyKey: string): Promise<void>;
  getCurrentPlayer(input: { sessionToken: string }): Promise<CurrentPlayerResponse | null>;
  logoutPortalSession(input: { sessionToken: string }): Promise<void>;
};

export type Authenticator<Env> = (request: Request, env: Env) => Promise<AuthContext | null>;
