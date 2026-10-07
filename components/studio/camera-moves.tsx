"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MovePreview } from "@/components/studio/move-preview";
import { CAMERA_MOVES, canStack, MAX_STACKED_MOVES, MOVE_BY_ID, MOVE_GROUPS } from "@/lib/catalog/camera";
import { useStudio } from "@/lib/stores/studio";
import type { MoveGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MoveStack() {
  const moves = useStudio((s) => s.params.camera.moves);
  const removeMove = useStudio((s) => s.removeMove);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_STACKED_MOVES }).map((_, i) => {
          const id = moves[i];
          return (
            <AnimatePresence key={i} mode="popLayout">
              {id ? (
                <motion.div key={id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="group relative">
                  <MovePreview moveId={id} className="aspect-video" />
                  <span className="absolute inset-x-0 bottom-0 truncate rounded-b-md bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-3 pb-1 text-[10px] font-medium">
                    {i + 1}. {MOVE_BY_ID[id]?.name}
                  </span>
                  <button
                    className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    onClick={() => removeMove(id)}
                    aria-label={`Remove ${MOVE_BY_ID[id]?.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key={`empty-${i}`}
                  onClick={() => setOpen(true)}
                  disabled={i > moves.length}
                  className="grid aspect-video place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors enabled:hover:border-primary/60 enabled:hover:text-primary disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          );
        })}
      </div>
      <MovePicker open={open} onOpenChange={setOpen} />
    </>
  );
}

function MovePicker({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const moves = useStudio((s) => s.params.camera.moves);
  const addMove = useStudio((s) => s.addMove);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MoveGroup | "all">("all");
  const [hover, setHover] = useState<string | null>(null);

  const list = useMemo(
    () => CAMERA_MOVES.filter((m) => (group === "all" || m.group === group) && m.name.toLowerCase().includes(query.toLowerCase())),
    [group, query],
  );

  const pick = (id: string) => {
    const res = addMove(id);
    if (!res.ok) return toast.error(res.reason);
    if (moves.length + 1 >= MAX_STACKED_MOVES) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Camera moves</DialogTitle>
          <DialogDescription>
            Stack up to {MAX_STACKED_MOVES} moves — they combine into one multi-axis shot. {moves.length}/{MAX_STACKED_MOVES} used.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder={`Search ${CAMERA_MOVES.length} presets…`} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {[{ id: "all" as const, name: "All" }, ...MOVE_GROUPS].map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn("rounded-full px-3 py-1 text-xs whitespace-nowrap", group === g.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {list.map((m) => {
            const check = canStack(moves, m.id);
            const inStack = moves.includes(m.id);
            return (
              <button
                key={m.id}
                onMouseEnter={() => setHover(m.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(m.id)}
                onClick={() => pick(m.id)}
                title={check.ok ? m.name : check.reason}
                className={cn(
                  "rounded-lg border p-1 text-left transition-colors",
                  inStack ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  !check.ok && !inStack && "opacity-50",
                )}
              >
                <MovePreview moveId={m.id} active={hover === m.id || inStack} className="aspect-video" />
                <span className="mt-1 block truncate px-0.5 text-xs">{m.name}</span>
              </button>
            );
          })}
          {list.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No moves match “{query}”.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
