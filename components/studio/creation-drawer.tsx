"use client";

import { Aperture, Clapperboard, Images, Move3d, Palette, UserRound } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MoveStack } from "@/components/studio/camera-moves";
import { CharacterPicker } from "@/components/studio/character-picker";
import { DrawerSection, FieldLabel } from "@/components/studio/drawer-section";
import { OptionTiles, Segmented } from "@/components/studio/option-tiles";
import { ReferenceTray } from "@/components/studio/reference-tray";
import { APERTURES, CAMERA_BODIES, LENSES, MOVE_BY_ID } from "@/lib/catalog/camera";
import { ASPECT_LABEL, EMOTIONS, ERAS, GENRES, LIGHTING, optionName, PALETTES, RESOLUTION_LABEL, TEMPOS } from "@/lib/catalog/film";
import { durationsFor, getModel } from "@/lib/catalog/models";
import { useUser } from "@/lib/hooks";
import { useLibrary } from "@/lib/stores/library";
import { useStudio } from "@/lib/stores/studio";

export function CreationDrawer() {
  const p = useStudio((s) => s.params);
  const { setFilm, setCamera, setLook, update } = useStudio.getState();
  const model = getModel(p.modelId);
  const isVideo = p.mode === "video";
  const user = useUser();
  const character = useLibrary((s) => s.characters.find((c) => c.id === p.characterId && c.userId === user?.id));

  const filmTouched = p.film.genre !== "general" || p.film.era !== "auto" || p.film.tempo !== "auto";
  const opticsTouched = p.camera.body !== "auto" || p.camera.lens !== "auto" || p.camera.aperture !== "auto";
  const lookTouched = p.look.palette !== "auto" || p.look.lighting !== "auto";

  return (
    <div className="pb-6">
      {!model.supports.cinema && (
        <p className="mx-4 mt-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Cinema controls are native on Cinema Studio. On {model.name} they&apos;re sent as structured prompt guidance.
        </p>
      )}

      <DrawerSection
        title="Film setup"
        icon={<Clapperboard className="size-3.5" />}
        touched={filmTouched}
        defaultOpen
        summary={[optionName(GENRES, p.film.genre), p.film.era === "auto" ? "Any era" : p.film.era, ...(isVideo ? [optionName(TEMPOS, p.film.tempo)] : [])]}
      >
        <div>
          <FieldLabel hint={GENRES.find((g) => g.id === p.film.genre)?.hint}>Genre</FieldLabel>
          <OptionTiles options={GENRES} value={p.film.genre} onChange={(genre) => setFilm({ genre })} columns={4} />
        </div>
        <div>
          <FieldLabel hint="Grain, grade and lens style follow the decade">Era</FieldLabel>
          <OptionTiles options={ERAS} value={p.film.era} onChange={(era) => setFilm({ era })} columns={4} />
        </div>
        {isVideo && (
          <div>
            <FieldLabel hint={TEMPOS.find((t) => t.id === p.film.tempo)?.hint}>Tempo</FieldLabel>
            <OptionTiles options={TEMPOS} value={p.film.tempo} onChange={(tempo) => setFilm({ tempo })} columns={3} />
          </div>
        )}
      </DrawerSection>

      {isVideo && (
        <DrawerSection
          title="Camera & motion"
          icon={<Move3d className="size-3.5" />}
          touched={p.camera.moves.length > 0}
          defaultOpen
          summary={p.camera.moves.length ? p.camera.moves.map((m) => MOVE_BY_ID[m]?.name ?? m) : ["Auto camera"]}
        >
          <div>
            <FieldLabel hint="Stack up to 3 moves">Move stack</FieldLabel>
            <MoveStack />
          </div>
          <div>
            <FieldLabel hint={`${p.camera.motionIntensity}%`}>Motion intensity</FieldLabel>
            <Slider value={[p.camera.motionIntensity]} min={0} max={100} step={5} onValueChange={([v]) => setCamera({ motionIntensity: v })} />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Our addition: scales how far each stacked move travels.</p>
          </div>
        </DrawerSection>
      )}

      <DrawerSection
        title="Optics & format"
        icon={<Aperture className="size-3.5" />}
        touched={opticsTouched}
        summary={[optionName(CAMERA_BODIES, p.camera.body), optionName(LENSES, p.camera.lens), p.aspectRatio, ...(isVideo ? [`${p.duration}s`] : []), RESOLUTION_LABEL[p.resolution]]}
      >
        <div>
          <FieldLabel hint={CAMERA_BODIES.find((o) => o.id === p.camera.body)?.hint}>Camera</FieldLabel>
          <OptionTiles options={CAMERA_BODIES} value={p.camera.body} onChange={(body) => setCamera({ body })} columns={3} />
        </div>
        <div>
          <FieldLabel hint={LENSES.find((o) => o.id === p.camera.lens)?.hint}>Lens</FieldLabel>
          <OptionTiles options={LENSES} value={p.camera.lens} onChange={(lens) => setCamera({ lens })} columns={2} />
        </div>
        <div>
          <FieldLabel hint={APERTURES.find((o) => o.id === p.camera.aperture)?.hint}>Aperture</FieldLabel>
          <Segmented options={APERTURES.map((a) => a.id)} value={p.camera.aperture} onChange={(aperture) => setCamera({ aperture })} format={(id) => optionName(APERTURES, id)} />
        </div>
        <div>
          <FieldLabel hint={ASPECT_LABEL[p.aspectRatio]}>Aspect ratio</FieldLabel>
          <Segmented options={model.aspectRatios} value={p.aspectRatio} onChange={(aspectRatio) => update({ aspectRatio })} />
        </div>
        {isVideo && (
          <div>
            <FieldLabel hint={`${model.name} supports up to ${Math.max(...model.durations)}s`}>Duration</FieldLabel>
            <Segmented options={durationsFor(model, p.resolution)} value={p.duration} onChange={(duration) => update({ duration })} format={(d) => `${d}s`} />
            {model.durationsByResolution?.[p.resolution] && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {model.name} renders {RESOLUTION_LABEL[p.resolution]} at {durationsFor(model, p.resolution).join("/")}s only.
              </p>
            )}
          </div>
        )}
        <div>
          <FieldLabel hint="Biggest cost multiplier">Resolution</FieldLabel>
          <Segmented
            options={model.resolutions}
            value={p.resolution}
            onChange={(resolution) => {
              const allowed = durationsFor(model, resolution);
              update({ resolution, duration: allowed.includes(p.duration) ? p.duration : allowed[allowed.length - 1] });
            }}
            format={(r) => RESOLUTION_LABEL[r]}
          />
        </div>
        {isVideo && model.supports.audio && (
          <label className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            Native audio & SFX
            <Switch checked={p.audio} onCheckedChange={(audio) => update({ audio })} />
          </label>
        )}
      </DrawerSection>

      <DrawerSection
        title="Look"
        icon={<Palette className="size-3.5" />}
        touched={lookTouched}
        summary={[optionName(PALETTES, p.look.palette), `${optionName(LIGHTING, p.look.lighting)} light`]}
      >
        <div>
          <FieldLabel>Colour palette</FieldLabel>
          <OptionTiles options={PALETTES} value={p.look.palette} onChange={(palette) => setLook({ palette })} columns={2} />
        </div>
        <div>
          <FieldLabel hint={LIGHTING.find((o) => o.id === p.look.lighting)?.hint}>Lighting</FieldLabel>
          <OptionTiles options={LIGHTING} value={p.look.lighting} onChange={(lighting) => setLook({ lighting })} columns={2} />
        </div>
      </DrawerSection>

      <DrawerSection
        title="Character"
        icon={<UserRound className="size-3.5" />}
        touched={!!character}
        summary={character ? [character.name, ...(p.emotion ? [optionName(EMOTIONS, p.emotion)] : [])] : ["No character lock"]}
      >
        <CharacterPicker />
      </DrawerSection>

      <DrawerSection
        title="References"
        icon={<Images className="size-3.5" />}
        touched={p.references.length > 0}
        summary={p.references.length ? [`${p.references.length} attached`] : ["None"]}
      >
        <ReferenceTray />
      </DrawerSection>
    </div>
  );
}
