"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/explore/post-card";
import { PostDialog } from "@/components/explore/post-dialog";
import { COMMUNITY, EXPLORE_FILTERS, POST_BY_ID } from "@/lib/seed/community";
import { useStudio } from "@/lib/stores/studio";
import type { CommunityPost } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const open = POST_BY_ID[search.get("item") ?? ""] ?? null;

  const posts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return COMMUNITY.filter((p) => {
      if (filter === "video" || filter === "image") {
        if (p.media.kind !== filter) return false;
      } else if (filter !== "all" && !p.tags.includes(filter)) return false;
      if (!needle) return true;
      return [p.title, p.author, p.params.prompt, ...p.tags].some((s) => s.toLowerCase().includes(needle));
    });
  }, [filter, q]);

  const setItem = (id: string | null) => {
    const sp = new URLSearchParams(search.toString());
    if (id) sp.set("item", id);
    else sp.delete("item");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const remix = (post: CommunityPost) => {
    useStudio.getState().hydrate(post.params, { postId: post.id, author: post.author, title: post.title });
    toast("Settings loaded", { description: `Remixing “${post.title}” by @${post.author}` });
    router.push("/studio/");
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
          <p className="text-sm text-muted-foreground">Hover to play. Remix copies every setting into Studio — prompt, camera stack, lens and look.</p>
        </div>
        <div className="relative md:w-72">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts, creators, tags" className="pl-8" />
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {EXPLORE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-xs transition-colors",
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="grid place-items-center py-24 text-center">
          <p className="font-medium">Nothing matches “{q}”</p>
          <button
            className="mt-2 text-sm text-primary hover:underline"
            onClick={() => {
              setQ("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-5 columns-2 gap-3 md:columns-3 xl:columns-4 2xl:columns-5">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onOpen={() => setItem(p.id)} onRemix={() => remix(p)} />
          ))}
        </div>
      )}

      <PostDialog post={open} onClose={() => setItem(null)} onRemix={remix} />
    </main>
  );
}
