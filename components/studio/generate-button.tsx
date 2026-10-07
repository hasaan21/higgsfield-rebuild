"use client";

import { useEffect } from "react";
import { ChevronUp, Coins, Infinity as InfinityIcon, Lock, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { startGeneration } from "@/lib/generate";
import { useUser } from "@/lib/hooks";
import { formatCredits, quote } from "@/lib/pricing";
import { useStudio } from "@/lib/stores/studio";
import { cn } from "@/lib/utils";

export function GenerateButton() {
  const params = useStudio((s) => s.params);
  const remix = useStudio((s) => s.remix);
  const user = useUser();
  const q = quote(params, user);

  const go = () => {
    const gen = startGeneration(params, { remixOf: remix?.postId });
    if (gen) useStudio.getState().reseed();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const s = useStudio.getState();
        if (startGeneration(s.params, { remixOf: s.remix?.postId })) s.reseed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const blocked = q.blocked?.kind;
  const label = blocked === "auth" ? "Sign in" : blocked === "plan" ? "Upgrade" : blocked === "credits" ? "Top up" : "Generate";

  return (
    <div className="flex h-11 shrink-0 items-stretch overflow-hidden rounded-lg shadow-[0_0_30px_-8px] shadow-primary/40">
      <button
        onClick={go}
        className={cn(
          "flex items-center gap-2 pr-3 pl-4 text-sm font-semibold transition-colors",
          blocked && blocked !== "invalid" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        title="⌘/Ctrl + Enter"
      >
        {blocked === "plan" ? <Lock className="size-4" /> : <Sparkles className="size-4" />}
        {label}
        <span className="flex items-center gap-1 rounded-md bg-black/15 px-1.5 py-0.5 text-xs tabular-nums">
          {q.unlimited ? (
            <>
              <InfinityIcon className="size-3" /> 0
            </>
          ) : q.freeTier ? (
            "Free"
          ) : (
            <>
              <Coins className="size-3" /> {formatCredits(q.cost)}
            </>
          )}
        </span>
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "border-l border-black/15 px-2",
              blocked && blocked !== "invalid" ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            aria-label="Cost breakdown"
          >
            <ChevronUp className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-72">
          <p className="text-sm font-medium">Cost breakdown</p>
          <div className="mt-2 space-y-1">
            {q.lines.map((l) => (
              <div key={l.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {l.label}
                  {l.ours && <span className="ml-1 text-[10px] text-primary/80">(rebuild rule)</span>}
                </span>
                <span className="tabular-nums">{l.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-medium">
            <span>Total</span>
            <span className="tabular-nums">{q.unlimited || q.freeTier ? "0" : formatCredits(q.cost)} cr</span>
          </div>
          {user && q.balanceAfter !== null && (
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Balance after</span>
              <span className={cn("tabular-nums", q.balanceAfter < 0 && "text-destructive")}>{formatCredits(q.balanceAfter)} cr</span>
            </div>
          )}
          {q.blocked && <p className="mt-2 text-xs text-amber-400">{q.blocked.message}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">Charged at submit. Failed jobs and cancels before start are refunded.</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
