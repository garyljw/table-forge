// Tells the Workers types what this Worker's main module exports,
// so `exports.default.fetch` is typed in tests.
declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("./index.js");
  }
}
