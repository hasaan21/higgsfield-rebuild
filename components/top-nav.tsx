"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coins, CreditCard, LogOut, Sparkles, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAuthProvider } from "@/lib/auth/provider";
import { manageBilling } from "@/lib/billing";
import { PLAN_BY_ID } from "@/lib/catalog/plans";
import { useHydrated, useUser } from "@/lib/hooks";
import { timeAgo } from "@/lib/id";
import { formatCredits } from "@/lib/pricing";
import { selectLedger, useSession } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

const links = [
  { href: "/explore/", label: "Explore" },
  { href: "/studio/", label: "Cinema Studio" },
  { href: "/library/", label: "Library" },
  { href: "/characters/", label: "Characters" },
  { href: "/pricing/", label: "Pricing" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">H</span>
          <span className="hidden sm:inline">Higgsfield</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                pathname?.startsWith(l.href.slice(0, -1)) && "bg-secondary text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <AccountArea />
      </nav>
    </header>
  );
}

function AccountArea() {
  const hydrated = useHydrated();
  const status = useSession((s) => s.status);
  const user = useUser();
  const ledger = useSession(selectLedger);
  const subscribed = useSession((s) => s.live && (s.server?.subscribed ?? false));
  const router = useRouter();

  if (!hydrated || status === "loading") return <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />;

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login/">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/login/?mode=signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  const plan = PLAN_BY_ID[user.planId];
  const signOut = async () => {
    await (await getAuthProvider()).signOut();
    router.push("/");
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex h-8 items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 text-sm transition-colors hover:bg-secondary">
            <Coins className="size-3.5 text-primary" />
            <span className="font-medium tabular-nums">{formatCredits(user.credits)}</span>
            <span className="hidden rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase md:inline">
              {plan.name}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Credits</p>
            <p className="text-2xl font-semibold tabular-nums">{formatCredits(user.credits)}</p>
          </div>
          {user.planId === "free" && (
            <p className="mt-1 text-xs text-muted-foreground">{user.freeGenerations} free generations left on starter models</p>
          )}
          <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
            {ledger.length === 0 && <p className="text-xs text-muted-foreground">No credit activity yet.</p>}
            {ledger.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{e.note}</span>
                <span className={cn("shrink-0 tabular-nums", e.delta > 0 ? "text-primary" : "text-foreground")}>
                  {e.delta > 0 ? "+" : ""}
                  {formatCredits(e.delta)} · {timeAgo(Date.parse(e.at))}
                </span>
              </div>
            ))}
          </div>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link href="/pricing/">
              <Sparkles className="size-3.5" /> Upgrade or top up
            </Link>
          </Button>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="grid size-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/80 to-emerald-500 text-xs font-bold text-primary-foreground">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              user.name.slice(0, 1).toUpperCase()
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate text-sm">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/library/">
              <UserIcon className="size-4" /> My generations
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/pricing/">
              <Sparkles className="size-4" /> Plan: {plan.name}
            </Link>
          </DropdownMenuItem>
          {subscribed && (
            <DropdownMenuItem onClick={manageBilling}>
              <CreditCard className="size-4" /> Manage billing
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
