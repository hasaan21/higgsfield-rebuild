"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MEDIA } from "@/lib/media";
import { useUser } from "@/lib/hooks";
import { useLibrary } from "@/lib/stores/library";

const MIN_PHOTOS = 20;
const MAX_PHOTOS = 60;
const TIPS = ["Front, ¾ and profile angles", "Indoor and outdoor light", "A few expressions — not all smiling", "Only you in frame, no sunglasses"];

interface Photo {
  id: string;
  url: string;
}

/** Downscale to a small data URL so the thumbnail survives reloads (object URLs don't). */
async function thumbnailFrom(url: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function SoulIdTrainer({ onDone }: { onDone: () => void }) {
  const user = useUser();
  const train = useLibrary((s) => s.trainSoulId);
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);

  const add = (urls: string[]) => setPhotos((prev) => [...prev, ...urls.map((url) => ({ id: crypto.randomUUID(), url }))].slice(0, MAX_PHOTOS));

  const submit = async () => {
    if (!user || photos.length < MIN_PHOTOS) return;
    setBusy(true);
    try {
      const thumbnail = await thumbnailFrom(photos[0].url).catch(() => photos[0].url);
      train({ userId: user.id, name: name.trim() || "My Soul ID", photoCount: photos.length, thumbnail });
      toast("Training started", { description: "About 25 seconds in this demo (3–5 minutes on Higgsfield)." });
      setPhotos([]);
      setName("");
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.min(100, (photos.length / MIN_PHOTOS) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            add([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)));
          }}
          className="rounded-xl border border-dashed border-border p-4"
        >
          {photos.length === 0 ? (
            <button onClick={() => input.current?.click()} className="grid w-full place-items-center py-14 text-center">
              <ImagePlus className="size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drop {MIN_PHOTOS}+ photos of one person</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse · JPG, PNG, HEIC</p>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                    className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 opacity-0 group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => input.current?.click()} className="grid aspect-square place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground" aria-label="Add photos">
                <ImagePlus className="size-4" />
              </button>
            </div>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              add([...(e.target.files ?? [])].map((f) => URL.createObjectURL(f)));
              e.target.value = "";
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {photos.length}/{MIN_PHOTOS}
          </span>
          <button
            onClick={() => add(Array.from({ length: MIN_PHOTOS }, (_, i) => `/media/${MEDIA[i % MEDIA.length].id}.jpg`))}
            className="text-xs text-primary hover:underline"
          >
            Fill with samples
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="soul-name">
            Character name
          </label>
          <Input id="soul-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hasaan" className="mt-1" />
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" /> {t}
            </li>
          ))}
        </ul>
        <Button className="w-full" disabled={photos.length < MIN_PHOTOS || busy} onClick={submit}>
          <Sparkles /> {photos.length < MIN_PHOTOS ? `Add ${MIN_PHOTOS - photos.length} more` : "Train Soul ID"}
        </Button>
        <p className="text-[11px] text-muted-foreground">Photos stay in your browser in this demo. Only a 192px thumbnail is saved.</p>
      </div>
    </div>
  );
}
