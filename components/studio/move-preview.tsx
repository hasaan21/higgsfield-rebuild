"use client";

import { motion, type TargetAndTransition } from "framer-motion";
import { MOVE_BY_ID } from "@/lib/catalog/camera";
import { hash } from "@/lib/id";
import { MEDIA } from "@/lib/media";
import { cn } from "@/lib/utils";

/** A tiny looping animation that shows what each camera move does to the frame. */
function keyframesFor(id: string): TargetAndTransition {
  const group = MOVE_BY_ID[id]?.group;
  const has = (s: string) => id.includes(s);
  if (id === "static") return {};
  if (has("yoyo")) return { scale: [1, 1.35, 1] };
  if (has("whip")) return { x: ["-30%", "30%"] };
  if (has("dutch")) return { rotate: [0, -12] };
  if (has("dolly-zoom")) return { scale: has("in") ? [1, 1.3] : [1.3, 1], filter: ["blur(0px)", "blur(1px)"] };
  if (group === "zoom" || has("dolly-in") || has("dolly-out") || has("eyes-in") || has("mouth-in") || has("through-object")) {
    const fast = has("crash") || has("rapid") || has("super");
    return { scale: has("out") ? [fast ? 1.6 : 1.35, 1] : [1, fast ? 1.6 : 1.35] };
  }
  if (has("left")) return { x: ["8%", "-8%"] };
  if (has("right")) return { x: ["-8%", "8%"] };
  if (has("tilt-up") || has("crane-up") || has("jib-up")) return { y: ["10%", "-10%"], scale: has("crane") ? [1, 1.1] : 1.1 };
  if (has("tilt-down") || has("crane-down") || has("jib-down") || has("pedestal")) return { y: ["-10%", "10%"], scale: 1.1 };
  if (group === "orbit") return { rotateY: has("360") || has("lazy") ? [0, 360] : [-25, 25], scale: 1.15 };
  if (group === "drone") return { scale: has("pullback") ? [1.5, 1] : [1, 1.4], y: ["6%", "-6%"] };
  if (group === "handheld") return { x: ["0%", "2%", "-1%", "1.5%", "0%"], y: ["0%", "-1.5%", "1%", "-1%", "0%"], rotate: [0, 0.8, -0.6, 0.4, 0] };
  if (has("focus") || has("shutter")) return { filter: ["blur(4px)", "blur(0px)"] };
  if (has("lapse")) return { filter: ["brightness(0.7)", "brightness(1.3)", "brightness(0.8)"], scale: [1, 1.08] };
  if (has("fisheye")) return { scale: [1, 1.25], borderRadius: ["0%", "40%"] };
  if (group === "crane") return { y: ["10%", "-10%"], rotate: [-3, 3], scale: 1.15 };
  return { scale: [1, 1.15] };
}

export function MovePreview({ moveId, active = true, className }: { moveId: string; active?: boolean; className?: string }) {
  const poster = MEDIA[hash(moveId) % MEDIA.length];
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-black [perspective:400px]", className)}>
      <motion.img
        src={`/media/${poster.id}.jpg`}
        alt=""
        className="size-full object-cover"
        animate={active ? keyframesFor(moveId) : {}}
        transition={{ duration: moveId.includes("whip") || moveId.includes("crash") ? 0.9 : 2.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-2 rounded-sm border border-white/30" />
    </div>
  );
}
