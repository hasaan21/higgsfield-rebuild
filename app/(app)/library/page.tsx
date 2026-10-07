"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GenerationCard } from "@/components/generation-card";
import { GenerationActions } from "@/components/library/generation-actions";
import { GenerationDialog } from "@/components/library/generation-dialog";
import { queuePositions } from "@/lib/engine";
import { useUser } from "@/lib/hooks";
import { formatCredits } from "@/lib/pricing";
import { isActive, useQueue } from "@/lib/stores/queue";
import type { Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: string; name: string; test: (g: Generation) => boolean }[] = [
  { id: "all", name: "All", test: () => true },
  { id: "video", name: "Video", test: (g) => g.params.mode === "video" },
  { id: "image", name: "Image", test: (g) => g.params.mode === "image" },
  { id: "favorites", name: "Favourites", test: (g) => g.favorite },
  { id: "active", name: "In progress", test: isActive },
  { id: "failed", name: "Failed", test: (g) => g.status === "failed" || g.status === "cancelled" },
];

export default function LibraryPage() {
  return (
    <Suspense>
      <Library />
    </Suspense>
  );
}

function Library() {
  const user = useUser();
  const all = useQueue((s) => s.generations);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const mine = useMemo(() => all.filter((g) => g.userId === user?.id), [all, user?.id]);
  const positions = queuePositions(mine);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, mine.filter(f.test).length])), [mine]);
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const needle = q.trim().toLowerCase();
    return mine.filter((g) => f.test(g) && (!needle || g.params.prompt.toLowerCase().includes(needle)));
  }, [mine, filter, q]);
  const spent = mine.reduce((sum, g) => sum + (g.refunded ? 0 : g.cost), 0);
  const open = mine.find((g) => g.id === search.get("item")) ?? null;

  const setItem = (id: string | null) => {
    router.replace(id ? `${pathname}?item=${id}` : pathname, { scroll: false });
  };

  return (
    <main className="px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            {mine.length} generation{mine.length === 1 ? "" : "s"} · {formatCredits(spent)} credits spent · refunds already netted out
          </p>
        </div>
        <div className="relative md:w-72">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your prompts" className="pl-8" />
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs transition-colors",
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.name}
            <span className={cn("tabular-nums", filter === f.id ? "opacity-70" : "opacity-60")}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {mine.length === 0 ? (
        <Empty />
      ) : shown.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">Nothing in this view.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((g) => (
            <GenerationCard key={g.id} gen={g} position={positions.get(g.id)} onOpen={() => setItem(g.id)} actions={<GenerationActions gen={g} />} />
          ))}
        </div>
      )}

      <GenerationDialog gen={open} all={mine} onClose={() => setItem(null)} onSelect={setItem} />
    </main>
  );
}

function Empty() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <FolderOpen className="size-6" />
      </div>
      <p className="mt-4 font-medium">No generations yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Everything you make lands here, with the exact settings to reproduce it.</p>
      <div className="mt-4 flex gap-2">
        <Link href="/studio/" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Open Studio
        </Link>
        <Link href="/explore/" className="rounded-md border border-border px-3 py-1.5 text-sm">
          Browse Explore
        </Link>
      </div>
    </div>
  );
}
