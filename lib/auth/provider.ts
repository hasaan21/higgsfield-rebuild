import type { AuthProviderId } from "@/lib/types";

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProviderId | "mock";
}

export interface AuthProvider {
  kind: "supabase" | "mock";
  oauthProviders: AuthProviderId[];
  getSession(): Promise<AuthIdentity | null>;
  /** Bearer token for the Worker API; the mock has none. */
  getAccessToken(): Promise<string | null>;
  /** Supabase redirects away and resolves never; the mock resolves with the identity. */
  signInWithOAuth(provider: Exclude<AuthProviderId, "email">, redirectTo: string): Promise<AuthIdentity | null>;
  signInWithPassword(email: string, password: string): Promise<AuthIdentity>;
  signUp(email: string, password: string, name: string): Promise<AuthIdentity | null>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  onChange(cb: (identity: AuthIdentity | null) => void): () => void;
}

let instance: AuthProvider | null = null;

export async function getAuthProvider(): Promise<AuthProvider> {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const { createSupabaseProvider } = await import("@/lib/auth/supabase");
    instance = createSupabaseProvider(url, key);
  } else {
    const { createMockProvider } = await import("@/lib/auth/mock");
    instance = createMockProvider();
  }
  return instance;
}

export const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
