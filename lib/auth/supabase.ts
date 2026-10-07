import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { AuthIdentity, AuthProvider } from "@/lib/auth/provider";
import type { AuthProviderId } from "@/lib/types";

const OAUTH_NAME: Record<Exclude<AuthProviderId, "email">, "google" | "apple" | "azure"> = {
  google: "google",
  apple: "apple",
  microsoft: "azure",
};

function toIdentity(u: SupabaseUser | null | undefined): AuthIdentity | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  const raw = (u.app_metadata?.provider as string | undefined) ?? "email";
  const provider: AuthIdentity["provider"] = raw === "azure" ? "microsoft" : (["google", "apple", "email"].includes(raw) ? raw : "email") as AuthProviderId;
  return {
    id: u.id,
    email: u.email ?? "",
    name: meta.full_name ?? meta.name ?? u.email?.split("@")[0] ?? "Creator",
    avatarUrl: meta.avatar_url,
    provider,
  };
}

export function createSupabaseProvider(url: string, key: string): AuthProvider {
  const supabase = createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } });

  return {
    kind: "supabase",
    oauthProviders: ["google", "apple", "microsoft"],
    async getSession() {
      const { data } = await supabase.auth.getSession();
      return toIdentity(data.session?.user);
    },
    async signInWithOAuth(provider, redirectTo) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: OAUTH_NAME[provider], options: { redirectTo } });
      if (error) throw error;
      return null;
    },
    async signInWithPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return toIdentity(data.user)!;
    },
    async signUp(email, password, name) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
      return toIdentity(data.session?.user ?? null);
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login/` });
      if (error) throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    onChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(toIdentity(session?.user)));
      return () => data.subscription.unsubscribe();
    },
  };
}
