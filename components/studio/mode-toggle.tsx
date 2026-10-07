"use client";

import { motion } from "framer-motion";
import { Camera, Video } from "lucide-react";
import { useStudio } from "@/lib/stores/studio";
import type { Mode } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "image", label: "Photography", icon: <Camera className="size-3.5" /> },
  { id: "video", label: "Videography", icon: <Video className="size-3.5" /> },
];

/** Switching keeps prompt, references and character; only mode-specific controls change. */
export function ModeToggle() {
  const mode = useStudio((s) => s.params.mode);
  const setMode = useStudio((s) => s.setMode);
  return (
    <div className="relative flex rounded-full border border-border bg-secondary/50 p-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          className={cn("relative z-10 flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors", mode === m.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {mode === m.id && <motion.span layoutId="mode-pill" className="absolute inset-0 -z-10 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}
