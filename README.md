# table-forge

A self-hosted Dungeons & Dragons 5e (2014 rules) companion for an in-person table. It offers:

- A rules browser for spells, monsters, classes and conditions.
- Character sheets that players can use at any time, including between sessions.
- A live shared map with three views: a DM view on the laptop, a TV display view that shows only what the players can see, and player views on phones.

## Status

Skeleton only: a hello-world page and a `/api/health` endpoint. No features yet.

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

## Cloudflare Workers Builds settings

Set these in the Cloudflare dashboard (Workers & Pages, table-forge, Settings, Builds):

| Setting | Value |
|---|---|
| Root directory | `/` (the repo root) |
| Build command | `pnpm build` |
| Deploy command (production, `main`) | `pnpm --filter @table-forge/worker exec wrangler deploy` |
| Non-production deploy command (preview branches) | `pnpm --filter @table-forge/worker exec wrangler versions upload` |

The Worker's name in the dashboard must be `table-forge` (it matches `apps/worker/wrangler.jsonc`).

## Content and licensing

The code is released under the [MIT licence](LICENSE).

Rules data comes from the SRD 5.1 via [Open5e](https://open5e.com). No non-SRD book content is stored in this repo.

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.
