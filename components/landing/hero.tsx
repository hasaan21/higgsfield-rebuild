"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-end overflow-hidden">
      <video src="/media/dune.mp4" poster="/media/dune.jpg" autoPlay muted loop playsInline className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-background/10" />
      <div className="absolute inset-0 -z-10 bg-grain opacity-40" />
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 md:pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="size-3" /> Cinema Studio 4.0 · 68 camera moves, stack three
          </span>
          <h1 className="mt-5 text-5xl leading-[0.95] font-semibold tracking-tight md:text-7xl">
            Direct the shot.
            <br />
            <span className="text-primary">Not the prompt.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Pick genre, era, lens and camera moves like a director. Lock a character across every scene. See the exact credit cost before you hit generate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/studio/">
                Start creating <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/explore/">See what people make</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
