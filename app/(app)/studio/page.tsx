"use client";

import { RotateCcw, Shuffle, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CreationDrawer } from "@/components/studio/creation-drawer";
import { ModeToggle } from "@/components/studio/mode-toggle";
import { PromptBar } from "@/components/studio/prompt-bar";
import { Stage } from "@/components/studio/stage";
import { useStudio } from "@/lib/stores/studio";

export default function StudioPage() {
  const remix = useStudio((s) => s.remix);
  const { clearRemix, reset } = useStudio.getState();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <aside className="hidden w-[22rem] shrink-0 flex-col border-r border-border/60 lg:flex">
        <DrawerHeader onReset={reset} />
        <div className="flex-1 overflow-y-auto">
          <CreationDrawer />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs lg:hidden">
                <SlidersHorizontal className="size-3.5" /> Controls
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[22rem] gap-0 p-0">
              <SheetHeader className="border-b border-border/60">
                <SheetTitle>Creation drawer</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto">
                <CreationDrawer />
              </div>
            </SheetContent>
          </Sheet>
          <ModeToggle />
          {remix && (
            <div className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pr-1 pl-3 text-xs text-primary">
              <Shuffle className="size-3.5 shrink-0" />
              <span className="truncate">
                Remixing “{remix.title}” by @{remix.author}
              </span>
              <button onClick={clearRemix} className="grid size-5 place-items-center rounded-full hover:bg-primary/20" aria-label="Clear remix">
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <Stage />
        </div>
        <PromptBar />
      </section>
    </div>
  );
}

function DrawerHeader({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">Cinema Studio</p>
        <p className="text-[11px] text-muted-foreground">Everything here is optional — Auto picks for you</p>
      </div>
      <button onClick={onReset} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
        <RotateCcw className="size-3" /> Reset
      </button>
    </div>
  );
}
