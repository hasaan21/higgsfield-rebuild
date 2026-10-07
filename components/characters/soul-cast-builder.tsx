"use client";

import { useState } from "react";
import { Dices, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FieldLabel } from "@/components/studio/drawer-section";
import { Segmented } from "@/components/studio/option-tiles";
import { ERAS, GENRES, optionName } from "@/lib/catalog/film";
import { hash } from "@/lib/id";
import { MEDIA } from "@/lib/media";
import { useUser } from "@/lib/hooks";
import { useLibrary } from "@/lib/stores/library";
import type { SoulCastParams } from "@/lib/types";
import { cn } from "@/lib/utils";

const ARCHETYPES = ["Hero", "Villain", "Mentor", "Rebel", "Lover", "Trickster", "Everyman", "Outsider"];
const GENDERS = ["Female", "Male", "Non-binary"];
const ORIGINS = ["East Asian", "South Asian", "Black", "Latino", "Middle Eastern", "White", "Mixed"];
const BUILDS = ["Slim", "Athletic", "Average", "Muscular", "Heavy"];
const HEIGHTS = ["Short", "Average", "Tall"];
const EYES = ["Brown", "Hazel", "Green", "Blue", "Grey"];
const HAIR_STYLES = ["Buzz", "Short", "Wavy", "Long", "Curly", "Braids", "Bald"];
const HAIR_COLORS = ["Black", "Brown", "Blonde", "Red", "Grey", "Dyed"];
const FACIAL_HAIR = ["None", "Stubble", "Beard", "Moustache"];
const DETAILS = ["Freckles", "Scar", "Tattoos", "Glasses", "Piercings", "Beauty mark", "Wrinkles", "Dimples"];
const FIRST = ["Mara", "Idris", "Noa", "Kenji", "Lucia", "Theo", "Aria", "Dev", "Sena", "Rafe"];
const LAST = ["Vale", "Okafor", "Reyes", "Sato", "Marlow", "Khan", "Ivers", "Duval", "Lind", "Cross"];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function initial(): SoulCastParams {
  return {
    genre: "drama",
    budget: 50,
    era: "auto",
    archetype: "Hero",
    gender: "Female",
    race: "Mixed",
    age: 32,
    build: "Athletic",
    height: "Average",
    eyeColor: "Brown",
    hairStyle: "Wavy",
    hairColor: "Black",
    facialHair: "None",
    details: [],
    outfit: "",
  };
}

const budgetLabel = (b: number) => (b < 25 ? "Indie" : b < 60 ? "Studio" : b < 85 ? "Blockbuster" : "Tentpole");

export function SoulCastBuilder({ onDone }: { onDone: () => void }) {
  const user = useUser();
  const cast = useLibrary((s) => s.castActor);
  const [c, setC] = useState<SoulCastParams>(initial);
  const [name, setName] = useState("");
  const set = (patch: Partial<SoulCastParams>) => setC((prev) => ({ ...prev, ...patch }));

  const randomize = () => {
    setC({
      genre: pick(GENRES).id,
      budget: Math.round(Math.random() * 100),
      era: pick(ERAS).id,
      archetype: pick(ARCHETYPES),
      gender: pick(GENDERS),
      race: pick(ORIGINS),
      age: 18 + Math.floor(Math.random() * 55),
      build: pick(BUILDS),
      height: pick(HEIGHTS),
      eyeColor: pick(EYES),
      hairStyle: pick(HAIR_STYLES),
      hairColor: pick(HAIR_COLORS),
      facialHair: pick(FACIAL_HAIR),
      details: DETAILS.filter(() => Math.random() < 0.2),
      outfit: "",
    });
    setName(`${pick(FIRST)} ${pick(LAST)}`);
  };

  const submit = () => {
    if (!user) return;
    const clip = MEDIA[hash(JSON.stringify(c)) % MEDIA.length];
    const finalName = name.trim() || `${pick(FIRST)} ${pick(LAST)}`;
    cast({ userId: user.id, name: finalName, cast: c, thumbnail: `/media/${clip.id}.jpg` });
    toast(`Casting ${finalName}`, { description: `${c.archetype} · ${optionName(GENRES, c.genre)} · ${budgetLabel(c.budget)} budget` });
    setName("");
    onDone();
  };

  const summary = `${c.age}-year-old ${c.race.toLowerCase()} ${c.gender.toLowerCase()} ${c.archetype.toLowerCase()}, ${c.build.toLowerCase()} build, ${c.hairColor.toLowerCase()} ${c.hairStyle.toLowerCase()} hair, ${c.eyeColor.toLowerCase()} eyes${c.details.length ? `, ${c.details.join(", ").toLowerCase()}` : ""}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-4">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">The role</p>
          <Row label="Genre">
            <Segmented options={GENRES.map((g) => g.id)} value={c.genre} onChange={(genre) => set({ genre })} format={(id) => optionName(GENRES, id)} />
          </Row>
          <Row label="Era">
            <Segmented options={ERAS.map((e) => e.id)} value={c.era} onChange={(era) => set({ era })} format={(id) => optionName(ERAS, id)} />
          </Row>
          <Row label="Archetype">
            <Segmented options={ARCHETYPES} value={c.archetype} onChange={(archetype) => set({ archetype })} />
          </Row>
          <Row label="Budget" hint={budgetLabel(c.budget)}>
            <Slider value={[c.budget]} min={0} max={100} step={1} onValueChange={([budget]) => set({ budget })} />
            <p className="mt-1 text-[11px] text-muted-foreground">Higher budgets read more polished: skin, wardrobe, grooming.</p>
          </Row>
        </section>
        <section className="space-y-4">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">The actor</p>
          <Row label="Gender">
            <Segmented options={GENDERS} value={c.gender} onChange={(gender) => set({ gender })} />
          </Row>
          <Row label="Origin">
            <Segmented options={ORIGINS} value={c.race} onChange={(race) => set({ race })} />
          </Row>
          <Row label="Age" hint={String(c.age)}>
            <Slider value={[c.age]} min={18} max={80} step={1} onValueChange={([age]) => set({ age })} />
          </Row>
          <Row label="Build">
            <Segmented options={BUILDS} value={c.build} onChange={(build) => set({ build })} />
          </Row>
          <Row label="Height">
            <Segmented options={HEIGHTS} value={c.height} onChange={(height) => set({ height })} />
          </Row>
          <Row label="Eyes">
            <Segmented options={EYES} value={c.eyeColor} onChange={(eyeColor) => set({ eyeColor })} />
          </Row>
          <Row label="Hair">
            <Segmented options={HAIR_STYLES} value={c.hairStyle} onChange={(hairStyle) => set({ hairStyle })} />
            <div className="mt-1.5">
              <Segmented options={HAIR_COLORS} value={c.hairColor} onChange={(hairColor) => set({ hairColor })} />
            </div>
          </Row>
          <Row label="Facial hair">
            <Segmented options={FACIAL_HAIR} value={c.facialHair} onChange={(facialHair) => set({ facialHair })} />
          </Row>
          <Row label="Details">
            <div className="flex flex-wrap gap-1.5">
              {DETAILS.map((d) => {
                const on = c.details.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => set({ details: on ? c.details.filter((x) => x !== d) : [...c.details, d] })}
                    className={cn("h-7 rounded-full border px-2.5 text-xs", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="Outfit">
            <Input value={c.outfit} onChange={(e) => set({ outfit: e.target.value })} placeholder="e.g. worn leather jacket, silver chain" />
          </Row>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="cast-name">
            Actor name
          </label>
          <Input id="cast-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank to auto-name" className="mt-1" />
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Casting brief</p>
          <p className="mt-1.5 text-sm leading-relaxed">{summary}</p>
          {c.outfit && <p className="mt-1 text-xs text-muted-foreground">Wearing {c.outfit}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={randomize} aria-label="Randomize">
            <Dices />
          </Button>
          <Button className="flex-1" onClick={submit}>
            <Sparkles /> Cast actor
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {children}
    </div>
  );
}
