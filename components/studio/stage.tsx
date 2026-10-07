"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { GenerationCard } from "@/components/generation-card";
import { GenerationActions } from "@/components/library/generation-actions";
import { queuePositions } from "@/lib/engine";
import { useUser } from "@/lib/hooks";
import { useQueue } from "@/lib/stores/queue";
import { useStudio } from "@/lib/stores/studio";

export function Stage() {
  const user = useUser();
  const all = useQueue((s) => s.generations);
  const mode = useStudio((s) => s.params.mode);
  const mine = useMemo(() => (user ? all.filter((g) => g.userId === user.id) : []), [all, user]);
  const shown = useMemo(
    () => mine.filter((g) => (mode === "video" ? g.output?.kind !== "image" && g.params.mode === "video" : g.params.mode === "image")).slice(0, 12),
    [mine, mode],
  );
  const positions = queuePositions(mine);

  if (shown.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clapperboard className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Your set is ready</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a genre and stack a camera move in the drawer, describe the scene below, then generate. Or{" "}
            <Link href="/explore/" className="text-primary hover:underline">
              remix something from Explore
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
      {shown.map((g) => (
        <GenerationCard key={g.id} gen={g} position={positions.get(g.id)} actions={<GenerationActions gen={g} />} />
      ))}
    </div>
  );
}
