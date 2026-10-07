# Higgsfield AI — Product & Flow Audit

Research date: 2026-10-07. Target: [higgsfield.ai](https://higgsfield.ai/).

Every claim is tagged:

- `verified` — stated on a Higgsfield page, help-center article or official blog post (linked).
- `third-party` — reported by an outside source (linked), not confirmed by Higgsfield.
- `assumed` — inferred from public material; the logged-in app could not be inspected (see [Gaps](#gaps)).

The original brief made several claims that the research contradicted. Those are called out inline as **Brief correction**.

## Sources

| Ref | Source |
| --- | --- |
| S1 | [Home](https://higgsfield.ai/) |
| S2 | [AI Video Generator landing](https://higgsfield.ai/create/video) |
| S3 | [Camera Controls preset catalogue](https://higgsfield.ai/camera-controls) |
| S4 | [Meet Cinema Studio 4.0](https://higgsfield.ai/blog/cinema-studio-4-0) |
| S5 | [AI Video Credits Explained](https://higgsfield.ai/blog/ai-video-credits-explained) |
| S6 | [Soul Cast](https://higgsfield.ai/blog/soul-cast-ai-filmmaking) |
| S7 | [Soul ID — character consistency](https://higgsfield.ai/blog/Soul-ID-AI-Character-Consistency) |
| S8 | [Help: create an account and sign in](https://higgsfield.ai/creator-hub/help-center/getting-started/create-an-account-and-sign-in) |
| S9 | [Help: how do Higgsfield plans work](https://higgsfield.ai/creator-hub/help-center/plans/how-do-higgsfield-plans-work) |
| S10 | [Free unlimited trial post](https://higgsfield.ai/blog/free-unlimited-ai-video-generation-2026) |
| S11 | [Voyager — Higgsfield pricing 2026](https://voyager.so/blog/higgsfield-pricing) (third-party) |

---

## A. Authentication & workspace onboarding

### Sign-up / sign-in

- `verified` (S8): Sign up and sign in use one of four methods: **Google, Apple, Microsoft, or email + password**. You must sign in with the same method you signed up with. Email accounts have a "Forgot password" reset. Each account needs a unique email.
- **Brief correction:** there is no magic-link sign-in. The rebuild offers Google OAuth and email + password. Apple and Microsoft appear as buttons, which work only when Supabase is configured with those providers.
- `assumed`: Signing in from a "Generate" button on a public page returns you to that page. This is the usual pattern, and the rebuild does it with `?next=`.

### Credits & plans

- `verified` (S9): There are individual plans and business plans (Team, Scale, Enterprise).
  - Each plan has a **monthly credit allowance that resets at renewal**. Unused credits do not roll over.
  - You can top up with **Credit Packs** or turn on **Auto-Refill**.
  - Plans differ in which models you can use, how many credits you get per month, and how many generations can run at once.
- `verified` (S9): The free tier can generate, but only with a small set of models, and it **includes no credits**. Higgsfield's plan help page says there is no trial period.
- `verified` (S10): Higgsfield's own blog does describe a time-limited **24-hour unlimited trial**. It needs a card at checkout and automatically converts to Plus. This conflicts with S9, so treat the trial as a promotion, not a permanent feature.
- `third-party` (S11):
  - The free tier gets 0 credits and one concurrent job, and every output is watermarked.
  - The "10 free daily credits" claims that circulate online do not match the pricing table.
- **Brief correction:** there is **no daily credit reset**. Credits reset monthly, at renewal.
- `verified` (S5): A generation's cost is **model × duration × resolution**:

  | Model | 5 s · 720p | 5 s · 1080p | 10 s · 720p | 10 s · 1080p |
  | --- | --- | --- | --- | --- |
  | Seedance 2.0 | 23 | 45 | 45 | 90 |
  | Kling 3.0 | 10 | 12.5 | 20 | 25 |
  | Cinema Studio | 25 | 50 | 50 | 100 |
  | Wan 2.7 | 8 | 13 | 15 | 25 |

  - 1 credit ≈ $0.05.
  - Resolution is usually the biggest multiplier.
  - **Credits are charged when you generate, and there is no refund** for results you don't want.
- `verified` (S5), Unlimited:
  - Higher plans include a 365-day unlimited set of models.
  - "All Unlimited" is a separate 1–7-day window covering 23 flagship models.
  - During Unlimited, eligible generations cost 0 credits, but only on the web app.
  - The limit becomes **concurrency: 1 generation per format at a time**, shared across all models.
- `verified` (S5): The plan tiers mentioned are Basic (120 credits), Plus (1,000 credits) and Ultra (3,000 credits).

### Paywall triggers

- `assumed`: The paywall appears when you:
  - choose a model that isn't on your plan,
  - try to generate without enough credits,
  - go over your concurrency limit, or
  - choose a premium resolution.

  Each of these shows an upgrade modal that links to `/pricing`.
- `verified` (S2): The cost appears near the action. The public prompt bar shows the model, duration, "Auto" and "On" toggles, and the Generate button.

### Sessions & protected routes

- `verified` (S1, S2): Marketing pages, the model landing pages and Explore can be viewed while logged out.
- `assumed`: My generations, My elements, My favourites and Projects need a session. Without one, generating redirects you to sign in.

---

## B. Cinema Studio 4.0 — the creation workbench

### Navigation

- `verified` (S1 nav): Cinema Studio is one surface among many. Others are Image, Video, Audio, AI Influencer, Genjutsu, Ads Studio, Marketing Studio, Supercomputer, Canvas, Effects and Edit.
- `verified`: The sidebar shows Home, My generations, My elements, My favorites, Community, Academy and Projects.
- `verified` (S6): Inside Cinema Studio there are Image, Video, Audio and **Cast** tabs.

### Model selection

- `verified` (S2): The video models listed are Kling 3.0, Kling o1, Kling 2.6, Seedance 2.0, Wan 2.7, Sora 2 and Veo 3.1.
- `verified` (S1): Seedance 2.5 is shown as "the most advanced video model".
- `verified` (S2): Each model has a one-line positioning, for example:
  - Seedance 2.0: native audio, video and lip sync.
  - Veo 3.1: 4K.
  - Kling 2.6: fast and consistent characters.
- **Brief correction:** "Soul Cinema" is an **image** model (a cinematic still preset). It is not one of the video engines. The rebuild puts it under Photography mode.

### Camera movement

- `verified` (S3): There are **about 65 named presets**. Examples include Static, Pan, Tilt, Dolly In/Out/Left/Right, Dolly Zoom, Crane Up/Down/Over, Jib, Arc, 360 Orbit, 3D Rotation, Robo Arm, FPV Drone, Aerial Pullback, Bullet Time, Crash Zoom, Whip Pan, Snorricam, Handheld, Head Tracking, Hyperlapse, Timelapse, Object POV, Through Object, Dutch Angle, Fisheye and YoYo Zoom.
- `verified` (S2): **Up to 3 camera movements can be stacked** in one generation ("Multi-axis motion control").
- `verified` (S4): Cinema Studio 4.0 has **30+ presets**, including POV, Robot Arm, Pan Left and Helicopter Shot.

### Optical stack (4.0)

| Control | Options (`verified`, S4) |
| --- | --- |
| Camera | Auto, Modern, 35mm Film, 8mm Film, DV Camcorder |
| Lens | Auto, Clean Sharp, Anamorphic, Vintage Anamorphic, Warm Vintage, Halation Vintage |
| Aperture | Auto, f/1.4 Wide Open, f/4 Moderate, f/11 Deep Focus |
| Genre | General, Action, Epic, Drama, Comedy, Horror, Noir |
| Era | Auto, 60s, 80s, 90s, 2000s, 2020s (S4 example also uses 2010s) |
| Tempo | Auto, Chaotic, Dynamic, Calm, Single Shot |
| Colour palette | 50+ templates (Film Colors, Black Gloss, Candy Pink, Lime Jam, Nostalgic Blue, …) |
| Lighting | Auto, Silhouette, Practicals, Window, Overhead Fall, Contre-jour, Soft Cross, plus manual (colour, brightness, diffuse, angle) |
| Emotion Wheel | Hope, Anger, Joy, Trust, Fear, Surprise, Sadness, Disgust — applied with `@character Emotion` in the prompt |

- `verified` (S4): Clips can be **up to 30 s** long (3.5 allowed 15 s). Forward/Backward Extend continues an uploaded clip in either direction.
- `verified` (S2): Cinema Studio supports **21:9** as well as the standard aspect ratios.
- `assumed`: The other ratios are 16:9, 9:16, 1:1 and 4:5.
- **Brief correction:** "Spherical lens", "focal length (35mm/85mm)", "FPS" and "Motion Intensity" sliders belong to **earlier Cinema Studio versions**. The S2 preview UI still shows "Modular 8K Digital / Classic Anamorphic / 35mm". Cinema Studio 4.0 uses named presets instead of numeric sliders.
  - The rebuild follows 4.0.
  - It also keeps a numeric **Motion Intensity** control as one of its own UX additions, clearly labelled as ours.

### References

- `verified` (S2):
  - **First and last frame** references lock the start and end of a clip.
  - **Motion control** takes a reference video and copies its pacing and gestures.
  - **Edit any video** restyles uploaded footage.
- `verified` (S4): You can attach **up to 50 reference images** per generation (3.5 allowed 9). These include faces, products, styles and locations.
- `verified` (S1): Nano Banana 2.1, an image model, takes up to 14 references.

### Character systems — two separate flows

- `verified` (S7), **Soul ID**:
  1. Upload **20+ photos** of a real person.
  2. Training takes about **3–5 minutes**.
  3. Name the character.
  4. Select it from the **Character** tab when generating with the **Soul 2.0** image model. Soul 2.0 has 20+ style presets.
- `verified` (S6), **Soul Cast**: You build an AI actor in Cinema Studio's Cast tab. The parameters are:
  - Genre (14), Budget ($M), Era (from the 1900s) and Archetype (12 Jungian types)
  - Identity: gender, race, and age from 20 upward
  - Build, height, eye colour, hair (style, texture, colour) and facial hair
  - Details: scar, freckles, tattoos, eye patch, or manual text
  - Outfit: Casual, Formal, High Fashion, Military, Sporty, Workwear or Vintage
- The two flows are related but different: Soul ID trains on real photos, and Soul Cast designs a character from parameters. The rebuild has both on `/characters`.

---

## C. Asynchronous generation lifecycle

- `verified` (S5): Unlimited plans run **1 concurrent generation per format**. Regenerations "happen sequentially rather than in parallel", so a queue exists.
- `third-party` (S11): Free accounts run 1 job at a time, and paid tiers allow more in parallel.
- `verified` (S7): Soul ID training is itself an async job of about 3–5 minutes.
- `assumed` — states:
  - `queued` (with a queue position when you're at your concurrency limit), then `processing` with a progress %, then `completed` or `failed`. You can also cancel while a job is queued.
  - Each card in My generations shows a progress shimmer and updates in place.
  - Failed jobs show a retry action.
- `verified` (S5): There are **no refunds for unwanted output**.
- `assumed`: Failed jobs (moderation or infrastructure errors) are refunded. This is common practice, but S5 doesn't confirm it.
  - The rebuild refunds failed jobs and labels this as a deliberate policy.

---

## D. Explore, community & remix

- `verified` (S1):
  - The home page is a feed of large video tiles: models, features, contest films and "Explore the inside of every project".
  - That last section says you can "See all prompts, assets, and how each project was created".
  - Projects are tagged Public.
- `verified` (S1): Preset tiles such as "Floating fall" and "Burning man" have a **Recreate** action.
- `assumed`:
  - Explore is a masonry grid of mixed-ratio media that autoplays muted on hover.
  - Clicking a tile opens a detail view with the prompt, model and settings.
  - "Recreate" or remix opens the matching tool with the settings pre-filled.
  - References that belong to another user may not carry over.

---

## E. Asset management & post-production

- `verified` (S1 sidebar): There are **My generations**, **My elements** (saved reference assets) and **My favorites** pages.
- `verified`:
  - S2 lists Upscale, AI Video Upscaler, AI Video Extender, Video Background Remover, Face Swap, Recast and Mixed Media.
  - S4 lists Forward/Backward Extend.
  - S2's Seedance 2.0 description mentions lip sync, and the S6 footer mentions Higgsfield Audio (TTS, voice swap and translation).
- `assumed`:
  - Each item has quick actions: Upscale, Extend, Reframe, Lip Sync, Download and Favourite.
  - Downloads are plain MP4 or PNG files. Free-tier files keep the watermark (S11).
- **Brief correction:** I found no evidence of "download with provenance metadata" on Higgsfield. The rebuild adds it as an improvement: a JSON file saved next to each download with the full parameter snapshot.

---

## UX friction points & rebuild solutions

1. **Too many parameters at once.**
   - The problem: Cinema Studio 4.0 has 10+ controls (genre, era, tempo, camera, lens, aperture, palette, lighting, emotion, moves, references), all shown together with the prompt.
   - Rebuild: a single **Creation Drawer** with progressive sections: Film Setup, then Camera & Motion, then Optics, then Character, then References.
     - Each option is a visual preset tile.
     - Each section header shows a one-line summary chip, for example "Drama · 80s · Calm".
     - Untouched sections stay on "Auto", so they don't add noise.
2. **The cost isn't clear before you generate.**
   - The problem: cost multiplies across model, duration and resolution (S5), and nothing is refunded, so a wrong guess costs real money.
   - Rebuild: a **live credit badge inside the Generate button**. Clicking it opens a breakdown (base × duration × resolution, plus extras) and shows the balance after generating.
   - The button goes into an "Upgrade" state *before* you click when you can't afford the generation.
3. **Images and video live in separate places.**
   - Rebuild: one **Photography / Videography toggle** in the studio.
   - The prompt, references and character persist across the toggle. Only the controls that apply to the current mode change: motion and tempo are hidden in photo mode.
4. **Queueing and concurrency are opaque.**
   - The problem: limits of "1 per format" and per-plan parallelism (S5, S11) explain why jobs wait, but the UI doesn't say so.
   - Rebuild: a persistent **Queue panel** that shows concurrency slots (used / total), each job's state and queue position, progress, cost charged, and refunds.
5. **Large reference stacks are hard to read.**
   - The problem: up to 50 untyped reference images is hard to reason about.
   - Rebuild: a **typed reference tray** with labelled slots: First frame (1), Last frame (1), Motion video (1), Subjects/Products (up to 50), Character (1).
     - Each slot shows its count and limit.
     - The tray explains what each slot does.

## Gaps

These were not observable without an account. To match the logged-in app exactly, screenshots of these screens are needed:

- The exact layout of the logged-in studio, and which controls are visible by default.
- The exact progress and queue UI, and the failed-job copy.
- The library filter set and the quick-action menu.
- The Explore detail modal, and exactly what Recreate pre-fills.
- Current per-plan concurrency and model availability. The pricing page renders on the client and returned no content when fetched.
