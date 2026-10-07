import type { AuthIdentity, AuthProvider } from "@/lib/auth/provider";
import { hash } from "@/lib/id";

const ACCOUNTS_KEY = "hf.mock-accounts";
const SESSION_KEY = "hf.mock-session";

interface MockAccount {
  identity: AuthIdentity;
  passwordHash: number;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const OAUTH_DEMO = {
  google: { name: "Avery Lens", email: "avery.lens@gmail.com" },
  apple: { name: "Jordan Frame", email: "jordan.frame@icloud.com" },
  microsoft: { name: "Sam Dolly", email: "sam.dolly@outlook.com" },
} as const;

/** Browser-only stand-in for Supabase so the app works with zero setup. Not secure, by design. */
export function createMockProvider(): AuthProvider {
  const listeners = new Set<(i: AuthIdentity | null) => void>();
  const accounts = () => read<Record<string, MockAccount>>(ACCOUNTS_KEY, {});
  const setSession = (identity: AuthIdentity | null) => {
    if (identity) localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
    else localStorage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l(identity));
  };

  return {
    kind: "mock",
    oauthProviders: ["google", "apple", "microsoft"],
    async getSession() {
      return read<AuthIdentity | null>(SESSION_KEY, null);
    },
    async getAccessToken() {
      return null;
    },
    async signInWithOAuth(provider) {
      await wait(700);
      const demo = OAUTH_DEMO[provider];
      const identity: AuthIdentity = { id: `mock-${provider}-${hash(demo.email)}`, ...demo, provider };
      setSession(identity);
      return identity;
    },
    async signInWithPassword(email, password) {
      await wait(400);
      const acct = accounts()[email.toLowerCase()];
      if (!acct || acct.passwordHash !== hash(password)) throw new Error("Invalid email or password");
      setSession(acct.identity);
      return acct.identity;
    },
    async signUp(email, password, name) {
      await wait(400);
      const key = email.toLowerCase();
      const all = accounts();
      if (all[key]) throw new Error("An account with this email already exists");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      const identity: AuthIdentity = { id: `mock-email-${hash(key)}`, email: key, name: name || key.split("@")[0], provider: "email" };
      all[key] = { identity, passwordHash: hash(password) };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
      setSession(identity);
      return identity;
    },
    async resetPassword() {
      await wait(400);
    },
    async signOut() {
      setSession(null);
    },
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
