"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthProvider, isSupabaseConfigured } from "@/lib/auth/provider";
import { useSession } from "@/lib/stores/session";
import type { AuthProviderId } from "@/lib/types";

const OAUTH: { id: Exclude<AuthProviderId, "email">; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
      </svg>
    ),
  },
  {
    id: "microsoft",
    label: "Continue with Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
        <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
        <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
        <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
      </svg>
    ),
  },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio/";
  const status = useSession((s) => s.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState(params.get("mode") === "signup" ? "signup" : "signin");

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const oauth = (id: Exclude<AuthProviderId, "email">) =>
    run(id, async () => {
      const provider = await getAuthProvider();
      await provider.signInWithOAuth(id, `${location.origin}/login/?next=${encodeURIComponent(next)}`);
    });

  function onEmail(e: React.FormEvent<HTMLFormElement>, mode: "signin" | "signup") {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    run(mode, async () => {
      const provider = await getAuthProvider();
      if (mode === "signin") await provider.signInWithPassword(email, password);
      else {
        const identity = await provider.signUp(email, password, name);
        if (!identity) toast.success("Check your inbox to confirm your email.");
      }
    });
  }

  async function onForgot() {
    const email = (document.getElementById("signin-email") as HTMLInputElement | null)?.value.trim();
    if (!email) return toast.error("Enter your email first");
    await run("reset", async () => {
      await (await getAuthProvider()).resetPassword(email);
      toast.success("If an account exists, a reset link is on its way.");
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to the studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to generate, save and remix.</p>
      </div>

      <div className="grid gap-2">
        {OAUTH.map((o) => (
          <Button key={o.id} variant="outline" className="h-10 justify-center gap-2" disabled={!!busy} onClick={() => oauth(o.id)}>
            {busy === o.id ? <Loader2 className="size-4 animate-spin" /> : o.icon}
            {o.label}
          </Button>
        ))}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form className="mt-3 grid gap-3" onSubmit={(e) => onEmail(e, "signin")}>
            <div className="grid gap-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onForgot}>
                  Forgot password?
                </button>
              </div>
              <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="h-10" disabled={!!busy}>
              {busy === "signin" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Sign in
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form className="mt-3 grid gap-3" onSubmit={(e) => onEmail(e, "signup")}>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-name">Name</Label>
              <Input id="signup-name" name="name" autoComplete="name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" minLength={8} autoComplete="new-password" required />
            </div>
            <Button type="submit" className="h-10" disabled={!!busy}>
              {busy === "signup" && <Loader2 className="size-4 animate-spin" />}
              Create account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {!isSupabaseConfigured && (
        <p className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-primary">Demo mode.</span> Supabase isn&apos;t configured, so accounts live in this
          browser only. Social buttons sign you in as a demo user.
        </p>
      )}
    </div>
  );
}
