// Separation fence 4: lint boundaries.
// Dependency table (CLAUDE.md):
//   web    -> shared, core
//   worker -> shared, core
//   shared -> external libraries only
//   core   -> shared + external libraries only
import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";
import tseslint from "typescript-eslint";

const SERVER_ONLY_EXTERNALS = [
  { group: ["hono", "hono/*"], message: "Hono is server-only." },
  { group: ["cloudflare:*", "@cloudflare/*", "wrangler"], message: "Cloudflare APIs are server-only." },
];
const UI_ONLY_EXTERNALS = [
  { group: ["react", "react/*", "react-dom", "react-dom/*"], message: "React is UI-only." },
];
const WORKER_PATHS = [
  { group: ["@table-forge/worker", "@table-forge/worker/*", "**/apps/worker/**", "**/worker/src/**"], message: "web must never import worker." },
];
const WEB_PATHS = [
  { group: ["@table-forge/web", "@table-forge/web/*", "**/apps/web/**", "**/web/src/**"], message: "worker must never import web." },
];
const APP_PATHS = [
  { group: ["@table-forge/web", "@table-forge/web/*", "@table-forge/worker", "@table-forge/worker/*", "**/apps/**"], message: "packages must not import apps." },
];

// One base list for the pure packages (shared and core) so the rules cannot drift.
const PURE_PACKAGE_RESTRICTIONS = [
  APP_PATHS,
  UI_ONLY_EXTERNALS,
  SERVER_ONLY_EXTERNALS,
  [{ group: ["node:*"], message: "packages must be platform independent." }],
].flat();

const restrict = (...groups) => ({ "no-restricted-imports": ["error", { patterns: groups.flat() }] });

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/.wrangler/**", "**/worker-configuration.d.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: ["apps/*/tsconfig.json", "packages/*/tsconfig.json"], noWarnOnMultipleProjects: true } },
      "boundaries/elements": [
        { type: "web", pattern: "apps/web" },
        { type: "worker", pattern: "apps/worker" },
        { type: "shared", pattern: "packages/shared" },
        { type: "core", pattern: "packages/core" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            { from: { element: { type: "web" } }, allow: { to: { element: { types: ["web", "shared", "core"] } } } },
            { from: { element: { type: "worker" } }, allow: { to: { element: { types: ["worker", "shared", "core"] } } } },
            { from: { element: { type: "shared" } }, allow: { to: { element: { type: "shared" } } } },
            { from: { element: { type: "core" } }, allow: { to: { element: { types: ["core", "shared"] } } } },
          ],
        },
      ],
    },
  },
  // web: browser only
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    rules: restrict(WORKER_PATHS, SERVER_ONLY_EXTERNALS),
  },
  // worker: server only
  {
    files: ["apps/worker/**/*.ts"],
    rules: restrict(WEB_PATHS, UI_ONLY_EXTERNALS),
  },
  // shared and core: pure, no UI, no server, no apps
  {
    files: ["packages/shared/**/*.ts", "packages/core/**/*.ts"],
    rules: restrict(PURE_PACKAGE_RESTRICTIONS),
  },
  // shared must not reach into core
  {
    files: ["packages/shared/**/*.ts"],
    rules: restrict(PURE_PACKAGE_RESTRICTIONS, [
      { group: ["@table-forge/core", "@table-forge/core/*", "**/packages/core/**"], message: "shared may use external libraries only." },
    ]),
  },
  // tooling and scripts run in Node
  {
    files: ["scripts/**/*.mjs", "*.mjs", "**/vite.config.ts", "**/vitest.config.ts"],
    languageOptions: { globals: globals.node },
  },
);
