"use client";

import { Dices, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GenerateButton } from "@/components/studio/generate-button";
import { ModelPicker } from "@/components/studio/model-picker";
import { EMOTIONS, optionName } from "@/lib/catalog/film";
import { MOVE_BY_ID } from "@/lib/catalog/camera";
import { useUser } from "@/lib/hooks";
import { useLibrary } from "@/lib/stores/library";
import { useStudio } from "@/lib/stores/studio";

const IDEAS = [
  "A lone astronaut walks through a field of glowing wheat at dusk, wind rippling the stalks",
  "Rain-soaked neon alley, a detective lights a cigarette under a flickering sign",
  "Macro shot of honey dripping over a golden honeycomb, warm morning light",
  "A dancer spins in an empty theatre, dust floating in a single spotlight",
  "Product hero shot: matte black headphones rotating on wet obsidian, rim light",
  "Surfer carving a glassy wave at sunrise, spray catching the light",
];

export function PromptBar() {
  const p = useStudio((s) => s.params);
  const update = useStudio((s) => s.update);
  const user = useUser();
  const character = useLibrary((s) => s.characters.find((c) => c.id === p.characterId && c.userId === user?.id));

  const chips = [
    ...(character ? [{ key: "char", label: `@${character.name}${p.emotion ? ` ${optionName(EMOTIONS, p.emotion)}` : ""}`, clear: () => update({ characterId: null, emotion: null }) }] : []),
    ...(p.mode === "video" ? p.camera.moves.map((m) => ({ key: m, label: MOVE_BY_ID[m]?.name ?? m, clear: () => useStudio.getState().removeMove(m) })) : []),
  ];

  return (
    <div className="border-t border-border/60 bg-background/90 p-3 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-2 focus-within:border-primary/50">
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1 pb-1.5">
            {chips.map((c) => (
              <span key={c.key} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                {c.label}
                <button onClick={c.clear} aria-label={`Remove ${c.label}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Textarea
          value={p.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder={p.mode === "video" ? "Describe the scene — the drawer handles camera, lens and look…" : "Describe the still — subject, setting, mood…"}
          className="max-h-40 min-h-16 resize-none border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          aria-label="Prompt"
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ModelPicker />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => update({ prompt: IDEAS[Math.floor(Math.random() * IDEAS.length)] })}
                className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Surprise me"
              >
                <Dices className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Surprise me</TooltipContent>
          </Tooltip>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {p.aspectRatio} · {p.mode === "video" ? `${p.duration}s · ` : ""}
            {p.resolution}
          </span>
          <div className="ml-auto">
            <GenerateButton />
          </div>
        </div>
      </div>
    </div>
  );
}
