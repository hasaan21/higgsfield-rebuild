"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterGrid } from "@/components/characters/character-grid";
import { SoulCastBuilder } from "@/components/characters/soul-cast-builder";
import { SoulIdTrainer } from "@/components/characters/soul-id-trainer";
import { useUser } from "@/lib/hooks";
import { useLibrary } from "@/lib/stores/library";

export default function CharactersPage() {
  const user = useUser();
  const all = useLibrary((s) => s.characters);
  const characters = useMemo(() => all.filter((c) => c.userId === user?.id), [all, user?.id]);
  const [tab, setTab] = useState(characters.length ? "mine" : "soul-id");

  return (
    <main className="px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Characters</h1>
      <p className="text-sm text-muted-foreground">Lock a face once, then pick it in Studio for consistent identity across every shot.</p>
      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="mine">My characters ({characters.length})</TabsTrigger>
          <TabsTrigger value="soul-id">Soul ID</TabsTrigger>
          <TabsTrigger value="soul-cast">Soul Cast</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          <CharacterGrid characters={characters} />
        </TabsContent>
        <TabsContent value="soul-id" className="mt-4">
          <p className="mb-4 text-sm text-muted-foreground">Train a personal identity model from 20+ photos of one person.</p>
          <SoulIdTrainer onDone={() => setTab("mine")} />
        </TabsContent>
        <TabsContent value="soul-cast" className="mt-4">
          <p className="mb-4 text-sm text-muted-foreground">Design an actor who doesn&apos;t exist — from the role down to the freckles.</p>
          <SoulCastBuilder onDone={() => setTab("mine")} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
