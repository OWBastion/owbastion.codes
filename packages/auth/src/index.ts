import type { AuthContext, Authenticator } from "@owbastion/domain";

export type ServiceAuthEnv = {
  QQBOT_API_TOKEN?: string;
  ADMIN_EMAILS?: string;
};

export const authenticateQqBot: Authenticator<ServiceAuthEnv> = async (request, env): Promise<AuthContext | null> => {
  const token = env.QQBOT_API_TOKEN;
  const authorization = request.headers.get("authorization");

  if (!token || !authorization || authorization !== `Bearer ${token}`) {
    return null;
  }

  return {
    actorType: "service",
    subject: "qqbot",
    roles: ["channel:write", "channel:read"],
    provider: "cloudflare-service-token",
  };
};

export const authenticateAccessAdmin: Authenticator<ServiceAuthEnv> = async (request, env): Promise<AuthContext | null> => {
  const email = request.headers.get("cf-access-authenticated-user-email")?.trim().toLowerCase();
  const allowed = env.ADMIN_EMAILS?.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean) ?? [];
  if (!email || !allowed.includes(email)) return null;
  return { actorType: "user", subject: email, roles: ["maintainer"], provider: "cloudflare-access" };
};

export const authenticatePlatformActor: Authenticator<ServiceAuthEnv> = async (request, env) =>
  await authenticateQqBot(request, env) ?? await authenticateAccessAdmin(request, env);
