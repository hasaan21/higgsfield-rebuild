"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: React.ReactNode;
  summary: string[];
  defaultOpen?: boolean;
  touched?: boolean;
  children: React.ReactNode;
}

export function DrawerSection({ title, icon, summary, defaultOpen = false, touched, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border/60">
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground", touched && "bg-primary/15 text-primary")}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{summary.join(" · ")}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</span>
      {hint && <span className="truncate text-[11px] text-muted-foreground/70">{hint}</span>}
    </div>
  );
}
