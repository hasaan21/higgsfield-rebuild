"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      <nav className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">
            H
          </span>
          <span className="hidden sm:inline">Higgsfield</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
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
      </nav>
    </header>
  );
}
