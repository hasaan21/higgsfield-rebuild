"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Option } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 4;
  size?: "sm" | "md";
}

const COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function OptionTiles({ options, value, onChange, columns = 3, size = "sm" }: Props) {
  return (
    <div className={cn("grid gap-1.5", COLS[columns])} role="radiogroup">
      {options.map((o) => {
        const active = o.id === value;
        const tile = (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative flex min-w-0 items-center gap-2 rounded-md border px-2 text-left transition-all",
              size === "sm" ? "h-8 text-xs" : "h-10 text-sm",
              active ? "border-primary/70 bg-primary/10 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
            )}
          >
            {o.swatch && <span className="size-3.5 shrink-0 rounded-full ring-1 ring-white/10" style={{ background: o.swatch }} />}
            <span className="truncate">{o.name}</span>
          </button>
        );
        return o.hint ? (
          <Tooltip key={o.id}>
            <TooltipTrigger asChild>{tile}</TooltipTrigger>
            <TooltipContent side="top">{o.hint}</TooltipContent>
          </Tooltip>
        ) : (
          tile
        );
      })}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  format = (v) => String(v),
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex rounded-md border border-border bg-secondary/40 p-0.5">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className={cn(
            "h-7 flex-1 rounded px-2 text-xs whitespace-nowrap transition-colors",
            o === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}
