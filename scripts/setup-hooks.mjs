// Runs from the root "prepare" script on every install. Activates the repo's
// git hooks (gitleaks pre-commit). In a normal clone a failure here is loud;
// it is skipped only when there is no git work tree at all (e.g. a tarball),
// or downgraded to a warning when the CI env var is set.
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

function isInsideWorkTree() {
  try {
    return git(["rev-parse", "--is-inside-work-tree"]) === "true";
  } catch {
    return false;
  }
}

if (!isInsideWorkTree()) {
  console.log("setup-hooks: not inside a git work tree, skipping core.hooksPath.");
} else {
  try {
    git(["config", "core.hooksPath", ".githooks"]);
    console.log("setup-hooks: core.hooksPath set to .githooks");
  } catch (err) {
    // CI and deploy builds (GitHub Actions, Cloudflare Workers Builds) set CI
    // and never commit, so a failure there must not break the install.
    if (!process.env.CI) throw err;
    console.warn(`setup-hooks: warning: could not set core.hooksPath in CI (${err.message.trim()}); continuing.`);
  }
}
