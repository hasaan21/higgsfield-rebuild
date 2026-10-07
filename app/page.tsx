import Link from "next/link";
import { ArrowRight, Coins, Move3d, UserRound } from "lucide-react";
import { Hero } from "@/components/landing/hero";
import { MODELS } from "@/lib/catalog/models";
import { COMMUNITY } from "@/lib/seed/community";

const FEATURES = [
  {
    icon: Move3d,
    title: "A camera you can actually direct",
    body: "68 named moves with live previews. Stack up to three — dolly in, tilt up, orbit — and set how hard they push.",
  },
  {
    icon: UserRound,
    title: "Same face, every shot",
    body: "Train a Soul ID from 20 photos or cast an actor from scratch. Pick them in Studio and identity holds across scenes.",
  },
  {
    icon: Coins,
    title: "Credits you can read",
    body: "Live cost on the Generate button with a full breakdown. Failed jobs and cancelled queue items refund automatically.",
  },
];

export default function Home() {
  const teaser = COMMUNITY.filter((p) => p.media.kind === "video").slice(0, 8);
  return (
    <main>
      <Hero />

      <section className="border-y border-border/60 bg-card/40 py-4">
        <div className="flex gap-8 overflow-x-auto px-4 text-sm whitespace-nowrap text-muted-foreground scrollbar-none md:justify-center">
          {MODELS.map((m) => (
            <span key={m.id} className="shrink-0">
              {m.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1600px] px-4 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Made in the Studio</h2>
            <p className="text-sm text-muted-foreground">Open any of these and remix it — every setting comes with it.</p>
          </div>
          <Link href="/explore/" className="hidden items-center gap-1 text-sm text-primary hover:underline sm:flex">
            Explore all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {teaser.map((p) => (
            <Link key={p.id} href={`/explore/?item=${p.id}`} className="group relative aspect-video overflow-hidden rounded-xl border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.media.poster} alt={p.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <p className="text-sm font-medium text-white">{p.title}</p>
                <p className="text-[11px] text-white/70">@{p.author}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Your first three are free.</h2>
          <p className="mt-2 text-muted-foreground">No card. Sign up and generate in under a minute.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/login/?mode=signup" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Create free account
            </Link>
            <Link href="/pricing/" className="rounded-md border border-border px-5 py-2.5 text-sm hover:bg-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
        Demo rebuild for study purposes · Not affiliated with Higgsfield AI · Media is procedurally generated
      </footer>
    </main>
  );
}
