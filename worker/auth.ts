import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { ApiError } from "./http";

let jwks: { url: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

/** Verifies the Supabase access token from `Authorization: Bearer` and returns the user id. */
export async function requireUser(request: Request, env: Env): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError(401, "unauthenticated", "Sign in to continue");

  const issuer = `${env.SUPABASE_URL}/auth/v1`;
  let payload: JWTPayload;
  try {
    if (env.SUPABASE_JWT_SECRET) {
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(env.SUPABASE_JWT_SECRET), { issuer, audience: "authenticated" }));
    } else {
      const url = `${issuer}/.well-known/jwks.json`;
      if (jwks?.url !== url) jwks = { url, set: createRemoteJWKSet(new URL(url)) };
      ({ payload } = await jwtVerify(token, jwks.set, { issuer, audience: "authenticated" }));
    }
  } catch {
    throw new ApiError(401, "unauthenticated", "Your session expired — sign in again");
  }
  if (!payload.sub) throw new ApiError(401, "unauthenticated", "Sign in to continue");
  return payload.sub;
}
