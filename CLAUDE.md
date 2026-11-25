# table-forge

A self-hosted D&D 5e (2014 rules) companion for an in-person table:

- **Rules browser**: spells, monsters, classes and conditions.
- **Character sheets**: players can use them at any time, including between sessions.
- **Live shared map**:
  - The DM view on the laptop shows everything.
  - A Display view on the TV shows only what the players can see.
  - Player views on phones let players move their own tokens.

The owner does not write code. Claude does all planning and coding. The owner reviews by *using* the app, through local runs and preview deployments.

---

## Working rules (mandatory)

### Models and roles
- **Planning: Opus at medium effort, in the main session.** Opus plans, breaks the work into tasks, delegates, reviews the results and talks to the owner. **Opus never writes or edits application code itself.** Opus may edit documentation such as this file, `README.md` and plans.
- **Coding is delegated to subagents** with the Agent tool's `model` parameter:
  - **Sonnet** (`model: "sonnet"`) for:
    - any change to more than one file
    - any large change to a single file
    - any change in a **high-security area** (listed below), whatever its size
  - **Haiku** (`model: "haiku"`) only for very small changes to a single file outside the high-security areas. Typical examples: a typo, a constant, a CSS tweak, a one-line fix.
  - When unsure, use Sonnet.
- Every delegation brief must include:
  - the relevant sections of this file
  - the exact files in scope
  - the acceptance criteria
  - the tests to add or run

### High-security areas
Any change touching these needs Sonnet and a `/security-review`:
- **Visibility filtering**: the code that decides what Display and Player connections receive. Hidden tokens, fog and DM notes must never reach them.
- **Auth and identity**: Cloudflare Access integration, reading the Access JWT, role resolution (DM, Display, Player) and character ownership checks.
- **Display access**: the way the TV gets in without a personal login. This must be specified before it is built:
  - Prefer an Access service token, or a short-lived token the DM issues for one session only.
  - Tokens must be scoped to the Display role, revocable and expiring.
  - Never put a token in a URL query string.
  - Display access gets player-visible state only.
- **Private book data**: any route, query or import path that serves or loads owner-transcribed content.
- **Uploads**: map and token image upload, validation, size limits and R2 keys.
- **Secrets and config**: `wrangler.jsonc` bindings, `.dev.vars`, `.gitignore`, CI workflows.
- **Separation fences**: pnpm workspace config, tsconfigs, lint boundary rules and the client-bundle canary check. See "Code structure" below.
- **Durable Object message handling**: validating client messages and checking each action against the sender's permissions.

### Reviews
- Run **`/code-review`** on every change before reporting it as done.
- Run **`/security-review`** on every change that touches a high-security area. Run it on the whole branch before any PR is proposed.
- Fix findings, or explain to the owner why a finding doesn't apply, before saying the work is finished.

### Git, PRs and deploys
- **Never open a pull request without the owner's explicit instruction.** Finishing a feature is not an instruction. Wait to be told.
- Work on feature branches, never directly on `main`.
  - `main` is protected, so **every change, including documentation, reaches `main` only through a PR** with passing checks. Nobody pushes directly to `main` or bypasses the protection.
  - **Documentation-only changes** (this file, `README.md`, plans) are lightweight. Use a short-lived `docs/...` branch. The owner's request to make the edit counts as the instruction to push and open the PR, and no `/code-review` or `/security-review` is needed. The owner still merges.
  - Anything touching code, config, CI or the separation fences follows the full workflow above.
- Don't push to GitHub or deploy to production Cloudflare without explicit instruction either. Local `wrangler dev` runs are fine at any time.

### CI and deployment
- **GitHub Actions does the checking.** On every push and PR it runs:
  - gitleaks
  - typecheck
  - lint (including the boundary rules)
  - tests
  - the client-bundle canary scan

  All of these are **required status checks** on `main`, enforced by branch protection, so nothing merges unless every one passes.
- **Cloudflare Workers Builds does the deploying.** It uses Cloudflare's Git integration, connected in the Cloudflare dashboard. **No Cloudflare API tokens are stored in GitHub.**
  - Non-`main` branches get a **preview version** with its own URL, posted on the PR.
  - `main` deploys to production automatically.
- **Merging a PR into `main` is the production deploy.** The owner merges, or explicitly tells Claude to.
- **Rollback:** use Cloudflare's dashboard rollback to the previous version, then fix forward on a branch.
- **Owner's flow:**
  1. Claude builds on a branch.
  2. The owner instructs a push and PR.
  3. CI runs and Cloudflare posts a preview link.
  4. The owner tests it on laptop, TV and phone.
  5. The owner merges, and the change goes live.
- **Must be done before any private book data or real campaign data goes in:**
  - **Protect preview URLs with Cloudflare Access.** They are public by default.
  - **Give previews a separate staging D1 database and R2 bucket.** By default, preview versions share production bindings.

### Secret scanning: gitleaks
- gitleaks runs as a **pre-commit hook** (`gitleaks git --pre-commit --staged`) and in **CI** on every push.
- The hook lives in `.githooks/` and is activated with `git config core.hooksPath .githooks`. Once `package.json` exists, a `prepare` script must set this automatically on install, so no clone can silently skip it.
- Never name source directories `scans/` or `private/`. `.gitignore` deliberately ignores them at any depth, as a guard for private data.
- A gitleaks finding blocks the commit. Never bypass it with `--no-verify`. Remove the secret, and if it was ever committed, tell the owner so it can be rotated.
- Secrets live in `wrangler secret` (production) and `.dev.vars` (local, gitignored). They never go in code or `wrangler.jsonc`.

---

## Repositories and data
| Location | Visibility | Contents |
|---|---|---|
| `~/code/table-forge` (GitHub `table-forge`) | **Public** | App code, the Open5e import, schemas. **No book content and no owner maps.** |
| `~/code/table-forge-data` (GitHub `table-forge-data`) | **Private** | JSON transcribed from the owner's books, plus homebrew. The book-data scripts (page extraction, inventory, validation, private import), which link to `@table-forge/shared` and `@table-forge/core` from `../table-forge` so they use the same schemas. Code changes here follow the same review rules as the public repo, and the import path is a high-security area. |
| Private R2 bucket, or the owner's cloud drive | Private | Book scan images. These are **never stored in git.** |

- **Copyright rule:** non-SRD book content must never be committed to the public repo, and must never be served to anyone who isn't an authenticated, invited user.
- Licence for the public repo: MIT. SRD content is CC-BY-4.0, so the app must show an attribution line.
- Open5e also serves third-party content (Kobold Press and others) under the OGL 1.0a or CC licences. Each source document needs its own attribution or licence notice, taken from Open5e's document metadata. Show it wherever that content appears, and on an app credits page.

### Rules data sources (2014 / SRD 5.1 only; not the 2024 rules)
1. **Open5e** (open5e.com API): SRD 5.1 plus OGL/CC third-party content (Kobold Press and others). This is the primary source. Filter by document/source.
2. **Owner's private data**: transcribed from scans, stored in D1, DM- and player-only routes behind Access.
3. **Homebrew**: entered in the app.

All three must be normalised into **one internal schema**, modelled on Open5e's format, so that stat blocks, spells and tokens all work the same way whatever the source.

### Book transcription workflow
1. The owner scans pages into `table-forge-data/scans/<book>/`. That folder is gitignored, and the scans are backed up elsewhere.
2. Claude transcribes the pages to JSON in `table-forge-data/data/`, using the internal schema.
3. A validation script checks:
   - HP dice average against the listed HP
   - ability modifiers against the scores
   - proficiency bonus against CR
   - attack and save DCs against the stats

   Anything inconsistent is flagged for the owner to check against the book.
4. An import script loads the data into D1: local first, then staging, then production. Private book data may go into staging, because previews are behind the same Access allow-list as production. If previews ever become reachable without Access, remove it from staging first.

Transcribe **everything** from the owner's 2014 PHB, DMG and Monster Manual that Open5e's SRD 5.1 lacks. Where an entry is in the SRD, the SRD version is used and the book entry is skipped. Order: Monster Manual monsters; PHB spells, feats, backgrounds, subclasses and races; DMG magic items; then the rest of the DMG (tables and optional rules), which needs new record types first.

### Backups
- Transcribed JSON is kept in the private git repo.
- D1 has built-in Time Travel restore for the last 30 days. Add a **scheduled export of D1 to R2** for long-term snapshots.
- Map and token images live in R2. The owner keeps originals locally.

---

## Architecture

**Stack:**
- TypeScript throughout
- React + Vite for the front end
- **Hono** on **Cloudflare Workers** (with static assets) for the API
- **Durable Objects** (SQLite-backed) for live sessions
- **D1** for the database
- **R2** for images
- **Cloudflare Access** (email one-time PIN) for auth
- Map rendering on canvas with **Konva** (react-konva). Switch to PixiJS only if performance requires it.

**Portability:** keep the game logic in a platform-independent package with no Cloudflare APIs. That covers rules maths, visibility filtering, the event log, undo and the ruler. The Workers and Durable Object code is a thin adapter around it.

### Code structure and front-end/back-end separation
This is a monorepo using pnpm workspaces. It deploys as **one Worker**, which serves both the built front end (static assets) and the API from the same origin: no CORS, and one Access-protected site. Do not split it into separate deployments or repos.

```
apps/web/         React front end (Vite). UI only. Browser APIs only.
apps/worker/      Hono API + Durable Objects. Server only. Cloudflare APIs only.
packages/shared/  The contract: Zod schemas + TS types for every API request/response and WebSocket message
packages/core/    Pure game logic: rules maths, ruler, visibility filter, event log, undo. No Cloudflare, no React, no DOM.
```

**Dependency rules:**
| Package | May depend on |
|---|---|
| `web` | `shared` and `core` only |
| `worker` | `shared` and `core` only |
| `shared` | external libraries only |
| `core` | `shared` and external libraries only |

- `web` and `worker` must never import each other. They communicate only through the `shared` contract.
- Both sides validate data against the `shared` schemas. The worker must validate every incoming request and WebSocket message before acting on it.
- `core` is used in the browser for previews (such as the live ruler) and on the server for the authoritative result. **The server's result always wins.**

**Why this is safe:** a bad import could at worst bundle server *logic* into the browser, and that logic is already public. Secrets exist only as runtime bindings and `wrangler secret`. Private data exists only in D1 and R2. Neither is ever in code. The real security boundary is at runtime: what the server sends to each connection.

**Separation fences.** All are mandatory, and each must fail independently:
1. **Strict workspace dependencies.** pnpm is configured strictly (no hoisting of workspace packages). `web` does not declare `worker` as a dependency, and vice versa, so a cross-import does not resolve and the build fails.
2. **Separate TypeScript environments.** `apps/web` uses `lib: ["DOM", ...]` and no Workers types. `apps/worker` uses the Workers runtime types and no DOM. `packages/core` and `packages/shared` use neither. Code from the wrong side fails type-checking. Use TypeScript project references.
3. **Built-output canary check (CI).** The worker code contains a unique canary string, e.g. `__TABLE_FORGE_SERVER_ONLY__`. After the build, a CI step scans the client bundle (`apps/web/dist`). If the canary or any server-only identifier is present, the build fails.
4. **Lint boundaries.** ESLint import-boundary rules (e.g. `eslint-plugin-boundaries` or `no-restricted-imports`) enforce the dependency table above.
5. **Required CI checks.** Typecheck, lint, tests, the canary scan and gitleaks are all required checks on `main`. Nothing merges with any of them failing.

Changes to these fences (pnpm, tsconfig or lint configuration, the canary check, CI workflows) are a high-security area.

### Roles
| Role | Device | Can |
|---|---|---|
| **DM** | Laptop | See everything; control maps, fog, tokens and all characters; undo any action |
| **Display** | TV, over HDMI as a second monitor or via a spare laptop | View only. Fullscreen, no controls or cursor, follows the DM's camera, sees player-visible state only |
| **Player** | Phones and laptops | Own characters only: edit the sheet, move their own token, use the ruler. Player-visible map state only |

- Players are invited by email through Cloudflare Access, and Access handles login. No password system is built.
- The app maps each Access identity to a role and the characters that player owns.
- The Display view gets its own access path (a DM-issued display token or an Access service token) so the TV needs no personal login.

### Live sessions (Durable Objects)
- **One Durable Object per game session.** It holds the true state and the WebSocket connections from every client.
- **The server is authoritative, and visibility is enforced on the server.** Before sending state or events, the Durable Object filters them for each connection's role. Display and Player connections must *never receive* hidden tokens, unrevealed fog regions, DM notes or hidden monster stats. Hiding them in CSS or on the client is not acceptable. This filter is the most security-critical code in the project and must have thorough tests.
- **Event log.** Every change is an event: move, HP change, reveal fog, add or remove token, and so on. The event log enables:
  - **DM undo**: player moves apply immediately, and the DM can revert them
  - session history and replay
  - clean resync when a phone reconnects
- Every client message is validated, and checked against the sender's role and ownership, before it is applied.
- Use WebSocket hibernation.

### Map features
- Upload a map image, then set the grid size and offset.
- Tokens for PCs and monsters. Monster tokens can be linked to a stat block (visible to the DM only).
- **Fog of war**: the DM manually reveals or hides areas with a brush or shapes. Line of sight from walls comes in Phase 8.
- **Ruler and movement**:
  - Distances in **feet**, on a 5 ft grid.
  - The diagonal rule is a campaign setting: PHB (every square 5 ft) or DMG variant (5/10/5).
  - A player's drag path and distance show on every screen, e.g. "25 / 30 ft".
  - The move applies straight away, and the DM can undo it.
- Outside a live session, players see characters and rules but no maps.

### Lighting and effects
- **Light sources** are map objects with:
  - bright and dim radii in feet (torch 20/40, lantern 30/60, *Light* 20/40, *Daylight* 60/120)
  - colour and flicker style
  - an anchor: attached to a token, or placed on the map
  - on/off and hidden flags
- Every lighting change is an event, so the DM can undo it. Examples: knocking over a brazier, dropping a torch, short-lived spell effects such as a *Fireball* flash or *Faerie Fire*.
- **Vision rules:** the map has an ambient light level (bright, dim or dark). Darkvision is per character. Magical darkness cancels normal light.
- **Rendering:** a darkness overlay with soft coloured light cut-outs. Flicker is animated on each device, with no network traffic.
- **Stage A, atmosphere only (Phase 4b):** lighting is visual only. The DM's manual fog and hidden tokens still decide what players receive.
- **Stage B, lighting decides visibility (Phase 8):**
  - Walls and doors block light and sight.
  - The server computes what each character can see, and sends only that.
  - The TV shows the party's combined view. Each phone shows that character's own view.
  - This is part of the visibility filter, so it is a **high-security area**.
  - The geometry lives in `packages/core`, with thorough tests.
  - Use `polyclip-ts` (MIT) for polygon union and intersection. Write the visibility-polygon algorithm ourselves, so the security-critical code is fully owned and tested.

### Scene editor and map generation
- **Walls, doors and lights are data layered over the map image. They are never painted into it.** That is what lets a light be knocked over or a door opened.
- **Scene editor (Phase 8):**
  - Wall and door tools that snap to the grid, with click-to-place polylines.
  - Light presets: torch, brazier, candle, hearth, magical glow. Each can be on/off and hidden.
  - A live lighting preview while editing.
  - Import and export of **Universal VTT (`.dd2vtt`)**, the format Dungeondraft, Dungeon Alchemist and DungeonFog export.
  - An importer for **Watabou's One Page Dungeon** JSON, for free generated dungeons with walls already defined.
- **Procedural generator (Phase 9):**
  - Generates rooms, corridors and caves, producing walls, doors and lights natively and rendering the floor from tiles.
  - An optional text description ("ruined chapel, crypt below") can be turned into a room layout.
  - **Tile art must be licensed for our use.** Assets that cannot be redistributed live in R2, never in the public repo.
- **AI help at prep time:** the owner asks Claude in a coding session to produce scene data, in the same way as book transcription. AI tracing of walls from a PNG is only a rough draft and needs correcting by hand.

### Character sheets
- **Phase 1: a sheet that does the maths.**
  - Players enter core values: ability scores, class and level, HP, AC, proficiencies, spells and inventory.
  - The app calculates modifiers, saves, skills, spell DCs and attack bonuses.
  - Players track HP, spell slots and conditions live, and the changes appear on the DM view and their token.
- **Then: guided level-up.** Ability score increase or feat, new spells, HP by roll or average, class features.
- **Drafts ("try alternatives"):** a player can copy a character into a draft, experiment with it, then discard it or promote it to the live version.

---

## Phases
1. **Rules browser**: Open5e, then the owner's private data. First deploy to `workers.dev`.
2. **Map basics**: upload, grid, tokens, ruler, in a single view.
3. **Live sync**: DM and Display roles, Durable Object session, event log and undo.
4. **Fog of war and hidden tokens**, with server-side filtering and tests.
   - **4b. Lighting and effects, stage A**: lights on tokens and on the map, a darkness overlay, flicker, spell effects. Atmosphere only.
5. **Character sheets**: the sheet that does the maths, then level-up and drafts.
6. **Players**: Access logins, player phone view, moving own tokens.
7. **Combat**: initiative, turn tracking, movement remaining, monster stat blocks on tokens.
8. **Walls, line of sight and dynamic lighting (stage B)**: the scene editor (walls, doors, lights), `.dd2vtt` import/export, the Watabou importer, and server-computed vision for each character. Requires `/security-review`.
9. **Procedural map generator**: rooms, corridors and caves, with walls, doors and lights generated natively.

**Blocking before real or private data:** Access on preview URLs; a staging D1 database and R2 bucket for previews. See "CI and deployment".

**Backlog:** dice roller, DM pings on the TV, sound effects, session notes, an in-app "describe a dungeon" AI button (needs a Claude API key as a secret, so it is a high-security area, and it sends map descriptions to an outside service), scheduled D1 to R2 backups (do this before real campaign data exists), custom domain.

## Testing
- Unit tests (Vitest) for the game-logic package. Visibility filtering, the ruler and diagonal rules, the event log and undo, and the character maths are mandatory.
- Integration tests for Workers and Durable Objects using `@cloudflare/vitest-pool-workers`.
- Every feature needs a short "how to try it" note for the owner, covering laptop, TV and phone where relevant.
