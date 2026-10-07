"use client";

import { useRef } from "react";
import { Film, ImageIcon, ImagePlus, Lock, Move, Shapes, X } from "lucide-react";
import { toast } from "sonner";
import { getModel } from "@/lib/catalog/models";
import { MEDIA } from "@/lib/media";
import { SLOT_LIMITS, useStudio } from "@/lib/stores/studio";
import type { Reference, ReferenceSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLOTS: { slot: ReferenceSlot; title: string; hint: string; accept: string; icon: React.ReactNode }[] = [
  { slot: "first", title: "First frame", hint: "Locks where the shot starts", accept: "image/*", icon: <ImageIcon className="size-3.5" /> },
  { slot: "last", title: "Last frame", hint: "Locks where the shot lands", accept: "image/*", icon: <ImageIcon className="size-3.5" /> },
  { slot: "motion", title: "Motion reference", hint: "Copies pacing & gestures from footage", accept: "video/*", icon: <Move className="size-3.5" /> },
  { slot: "subject", title: "Subjects & products", hint: "Faces, products, styles, locations", accept: "image/*", icon: <Shapes className="size-3.5" /> },
];

export function ReferenceTray() {
  const params = useStudio((s) => s.params);
  const addReference = useStudio((s) => s.addReference);
  const removeReference = useStudio((s) => s.removeReference);
  const model = getModel(params.modelId);
  const inputs = useRef<Partial<Record<ReferenceSlot, HTMLInputElement | null>>>({});

  const supported = (slot: ReferenceSlot) =>
    slot === "subject" ? model.maxReferences > 0 : slot === "motion" ? model.supports.motionRef : model.supports.firstLast;
  const limit = (slot: ReferenceSlot) => (slot === "subject" ? Math.min(SLOT_LIMITS.subject, model.maxReferences) : SLOT_LIMITS[slot]);

  function onFiles(slot: ReferenceSlot, files: FileList | null) {
    for (const file of Array.from(files ?? [])) {
      const res = addReference({ slot, kind: file.type.startsWith("video") ? "video" : "image", name: file.name, url: URL.createObjectURL(file) });
      if (!res.ok) {
        toast.error(res.reason);
        break;
      }
    }
  }

  function addSample(slot: ReferenceSlot) {
    const clip = MEDIA[Math.floor(Math.random() * MEDIA.length)];
    const ref: Omit<Reference, "id"> =
      slot === "motion"
        ? { slot, kind: "video", name: `${clip.title}.mp4`, url: `/media/${clip.id}.mp4` }
        : { slot, kind: "image", name: `${clip.title}.jpg`, url: `/media/${clip.id}.jpg` };
    const res = addReference(ref);
    if (!res.ok) toast.error(res.reason);
  }

  return (
    <div className="space-y-3">
      {SLOTS.map(({ slot, title, hint, accept, icon }) => {
        const refs = params.references.filter((r) => r.slot === slot);
        const ok = supported(slot);
        const max = limit(slot);
        return (
          <div key={slot} className={cn("rounded-lg border border-border bg-secondary/20 p-2.5", !ok && "opacity-50")}>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{icon}</span>
              <span className="text-xs font-medium">{title}</span>
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {ok ? `${refs.length}/${max}` : <Lock className="size-3" />}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{ok ? hint : `Not supported by ${model.name}`}</p>
            {ok && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {refs.map((r) => (
                  <div key={r.id} className="group relative size-12 overflow-hidden rounded-md border border-border bg-black">
                    {r.missing ? (
                      <div className="grid size-full place-items-center text-center text-[9px] leading-tight text-muted-foreground">re-upload</div>
                    ) : r.kind === "video" ? (
                      <video src={r.url} muted className="size-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.url} alt={r.name} className="size-full object-cover" />
                    )}
                    {r.kind === "video" && <Film className="absolute bottom-0.5 left-0.5 size-3 text-white/80" />}
                    <button
                      onClick={() => removeReference(r.id)}
                      className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-black/80 opacity-0 group-hover:opacity-100"
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
                {refs.length < max && (
                  <>
                    <button
                      onClick={() => inputs.current[slot]?.click()}
                      className="grid size-12 place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
                      aria-label={`Upload ${title}`}
                    >
                      <ImagePlus className="size-4" />
                    </button>
                    <button onClick={() => addSample(slot)} className="h-12 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground">
                      + sample
                    </button>
                  </>
                )}
                <input
                  ref={(el) => {
                    inputs.current[slot] = el;
                  }}
                  type="file"
                  accept={accept}
                  multiple={slot === "subject"}
                  className="hidden"
                  onChange={(e) => {
                    onFiles(slot, e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
