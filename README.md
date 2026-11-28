# table-forge

A self-hosted Dungeons & Dragons 5e (2014 rules) companion for an in-person table. It offers:

- A rules browser for spells, monsters, classes and conditions.
- Character sheets that players can use at any time, including between sessions.
- A live shared map with three views: a DM view on the laptop, a TV display view that shows only what the players can see, and player views on phones.

## Status

Rules browser (spells, monsters, classes, conditions) behind Cloudflare Access. No maps or characters yet.

## Layout

- `apps/web`: React front end (browser only).
- `apps/worker`: Hono API on Cloudflare Workers (server only). It also serves the built front end.
- `packages/shared`: the contract (Zod schemas and types) shared by both sides.
- `packages/core`: pure game logic, no browser or Cloudflare code.

`web` and `worker` never import each other. Typecheck, lint and the build-output scan enforce this.

## Development prerequisites

- Node 22 or newer, and [pnpm](https://pnpm.io) 10 (the version is pinned in `package.json`).
- [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks` on macOS). A pre-commit hook scans staged changes for secrets and blocks the commit if gitleaks is missing.
- `pnpm install` turns on the git hooks automatically (it sets `core.hooksPath` to `.githooks`).

Never bypass the hook with `--no-verify`.

## Running locally

```sh
pnpm install
pnpm dev        # page at http://localhost:5173, API at http://localhost:8787
```

To try the production-style build (one Worker serving the page and the API):

```sh
pnpm preview    # builds, then serves everything at http://localhost:8787
```

## Root scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Starts the front end (port 5173) and the Worker (port 8787) |
| `pnpm build` | Builds the front end, then checks the Worker bundles |
| `pnpm preview` | Build, then serve the whole app locally on port 8787 |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm lint` | ESLint, including the import-boundary rules |
| `pnpm test` | All tests (core and shared unit tests, Worker integration test) |
| `pnpm check:canary` | After `pnpm build`: fails if server-only code leaked into the front-end bundle |

## Local dev and `.dev.vars`

`wrangler dev` has no Cloudflare Access in front of it, so `/api/*` would return 401. One-time step:

```sh
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
```

This sets `ACCESS_DEV_IDENTITY=dev@example.com`, a bypass that is honoured only for requests to `localhost` or `127.0.0.1` that did not come through Cloudflare's edge (no `cf-ray` header). `.dev.vars` is gitignored and never deployed; no wrangler config contains this variable. **Warning:** the bypass trusts the request's host name, which a LAN client can fake. Never expose the dev servers beyond localhost (no `vite --host`, no `wrangler dev --ip 0.0.0.0`, no tunnels) while `.dev.vars` contains `ACCESS_DEV_IDENTITY`, and never set `ACCESS_DEV_IDENTITY` as a Cloudflare dashboard variable or secret. Local dev is for the laptop only; test on phones and the TV through the Access-protected preview URL.

Local D1 state is keyed by `database_id`. `pnpm dev` applies any pending migrations to the local database before it starts. After a fresh clone, or if the id in `wrangler.jsonc` changes, run `pnpm dev` once (or `pnpm --filter @table-forge/worker exec wrangler d1 migrations apply DB --local`) and then `pnpm import:open5e`.

`.dev.vars.example` also sets `ADMIN_EMAILS=dev@example.com`, so the local dev identity is the admin and can open **Book owners** (`/admin/books`).

### Book ownership

Private book data is shown only to people the admin has ticked as owning that book on the **Book owners** page. Everyone else sees public (SRD/Open5e) content only.

**Whole-book rule.** Owning a book hides the SRD's records (document `srd-2014`) for the tables that book covers, for that user only. There are no per-record links and no name matching. The map is `BOOK_REPLACES_SRD` in `packages/shared/src/rules/common.ts`, and it currently holds `"mm-2014": ["monsters"]` and `"phb-2014": ["spells"]`: ticking the Monster Manual hides the SRD monsters, and ticking the Player's Handbook hides the SRD spells (its feats, backgrounds, races and subclasses are not transcribed yet, so they are not switched on). The DMG is not in the map yet. A book/table is added only once that part of the book is fully transcribed, otherwise SRD content would vanish for owners before the book version exists. Lists, search, counts and children follow the rule (`maskingClause` in `apps/worker/src/rules/db.ts`); opening an SRD record by its id still works, so old links keep working. Third-party Open5e documents and `core` are never hidden. A tick only counts for a `private` document.

**Database note.** The `supersedes_id` column and its indexes (migration 0007) are unused: nothing writes or reads them, and they stay NULL. They are kept so the currently deployed Worker keeps working during a deploy, and can be dropped in a later migration.

The admin is whoever is listed in the `ADMIN_EMAILS` secret (comma-separated, case-insensitive). If it is missing, nobody is admin and nobody can be granted books. It is a secret, not a `wrangler.jsonc` var, so no email is in the public repo. Set it with `pnpm --filter @table-forge/worker exec wrangler secret put ADMIN_EMAILS` (production) and again with `--config wrangler.staging.jsonc` or in the dashboard for previews. The admin does not own any book automatically, so tick yourself too.

Without the file, `pnpm dev` runs but every `/api` route except `/api/health` returns 401.

## Deploying

Cloudflare Workers Builds (Git integration) deploys; GitHub Actions only checks and holds no Cloudflare tokens. Merging to `main` is the production deploy.

- **Access** protects the whole site (production and previews) with an email allow-list. The Worker also verifies the Access JWT on every `/api` route except `/api/health` (config in `vars`: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`; not secrets). Missing config makes the Worker refuse everything.
- **Two databases.** Production uses D1 `table-forge` (`apps/worker/wrangler.jsonc`). Preview branches use D1 `table-forge-staging`, declared in the `previews` block of the same `wrangler.jsonc` (Worker Previews take their bindings only from that block, never from the production bindings). Preview URLs look like `<branch>-table-forge.garyljw.workers.dev`, which stays under the Access-protected `*-table-forge.garyljw.workers.dev` hostname. `apps/worker/wrangler.staging.jsonc` exists only so `d1 migrations apply` can reach staging (it reads top-level `d1_databases` only). A test fails if the previews database is not staging, if production ids leak into previews, or if the vars drift.

Dashboard settings (Workers & Pages, table-forge, Settings, Builds):

| Setting | Value |
|---|---|
| Root directory | `/` (the repo root) |
| Build command | `pnpm install --frozen-lockfile && pnpm build` (the only place the web app is built) |
| Deploy command (production, `main`) | `pnpm deploy:prod` |
| Non-production branch deploy command | `pnpm deploy:preview` |
| Previews (open beta) tab, Preview command | `pnpm deploy:preview` |

`deploy:prod` and `deploy:preview` are for Workers Builds only, and run after the Build command (they do not build). Each applies the D1 migrations to the right database (`wrangler d1 migrations apply DB --remote`) and then deploys (`wrangler deploy`) or creates or updates the branch's Preview (`wrangler preview --ignore-base-config`, which ignores any dashboard Preview base config so only the `previews` block applies). The build token needs D1 edit permission as well as Workers edit.

Things to know:

- Migrations run before the new code goes live, so each one must be backward-compatible with the previous Worker version.
- All previews share the one staging database. It may carry schema from an unmerged branch. It may hold the owner's private book data, because previews sit behind the same Access allow-list as production. If previews ever become reachable without Access, remove the private data from staging first.

Loading rules data into a remote database (run by Claude, deliberately explicit):

```sh
pnpm import:open5e --remote --target=staging
pnpm import:open5e --remote --target=production --confirm-production
```

Local runs (`pnpm import:open5e`) keep using the local database.

## Content and licensing

The code is released under the [MIT licence](LICENSE).

Rules data comes from the SRD 5.1 via [Open5e](https://open5e.com). No non-SRD book content is stored in this repo.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.
