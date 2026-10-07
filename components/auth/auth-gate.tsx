"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/stores/session";

/** Client-side route guard: static export has no middleware, so protected pages check the session here. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useSession((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login/?next=${encodeURIComponent(pathname ?? "/studio/")}`);
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return (
      <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {status === "loading" ? "Restoring your session…" : "Redirecting to sign in…"}
        </span>
      </div>
    );
  }
  return <>{children}</>;
}
