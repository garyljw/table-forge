import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env.js";

/**
 * The verified Cloudflare Access identity of the caller.
 * TODO: Access service tokens carry no email claim. Display access (the TV) will be specified
 * separately before it is built; until then every caller must be a person with an email.
 */
export type Identity = { email: string; sub: string };

const HEADER = "cf-access-jwt-assertion";
const TOLERANCE_SECONDS = 30;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// One cached remote key set per team domain. jose caches the keys, honours the cache headers
// and re-fetches when it sees an unknown `kid` (key rotation), with a cooldown.
const keySets = new Map<string, JWTVerifyGetKey>();
function keySetFor(teamDomain: string): JWTVerifyGetKey {
  let keys = keySets.get(teamDomain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    keySets.set(teamDomain, keys);
  }
  return keys;
}

function isKeySetFailure(err: unknown): boolean {
  if (err instanceof errors.JWKSTimeout || err instanceof errors.JWKSInvalid) return true;
  if (err instanceof TypeError) return true; // fetch itself failed
  // jose throws a generic JOSEError ("Expected 200 OK from the JSON Web Key Set HTTP response") on non-200.
  return err instanceof errors.JOSEError && err.code === "ERR_JOSE_GENERIC";
}

function deny(c: { json: (b: unknown, s: 401) => Response }, reason: string, log: (r: string) => void): Response {
  log(reason);
  return c.json({ error: "Unauthorised" }, 401);
}

/**
 * Local-dev bypass. ALL of these must hold:
 *  1. `ACCESS_DEV_IDENTITY` is set. It exists only in `.dev.vars` (gitignored; `wrangler deploy`
 *     never uploads it) and is not in any wrangler config.
 *  2. The request URL's host is exactly `localhost` or `127.0.0.1`. On Cloudflare the host is the
 *     routed hostname, so a deployed Worker cannot be reached with these.
 *  3. The request has no `cf-ray` header. Cloudflare's edge adds one to every request; `wrangler dev` does not.
 *
 * Limit: miniflare gives the Worker no reliable, non-header way to tell that a request arrived over
 * loopback, so a LAN client of an exposed dev server could fake the host. Hence: never expose dev
 * servers beyond localhost while ACCESS_DEV_IDENTITY is set (see README).
 */
function devIdentity(env: AppEnv["Bindings"], req: Request): Identity | null {
  const email = env.ACCESS_DEV_IDENTITY?.trim();
  if (!email) return null;
  if (!LOCAL_HOSTS.has(new URL(req.url).hostname)) return null;
  if (req.headers.has("cf-ray")) return null;
  return { email, sub: "dev-bypass" };
}

/**
 * Requires a valid Cloudflare Access JWT (header `Cf-Access-Jwt-Assertion` only; the cookie is
 * ignored, because Access always sets the header and the cookie adds ambient-credential risk).
 * Fails closed when configuration is missing. Paths in `publicPaths` (exact match) skip the check.
 */
export const requireAccess = (publicPaths: readonly string[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
  if (publicPaths.includes(new URL(c.req.url).pathname)) return next();
  const dev = devIdentity(c.env, c.req.raw);
  if (dev) {
    c.set("identity", dev);
    return next();
  }

  const teamDomain = c.env.ACCESS_TEAM_DOMAIN?.trim();
  const aud = c.env.ACCESS_AUD?.trim();
  if (!teamDomain || !aud) {
    console.error("access: ACCESS_TEAM_DOMAIN or ACCESS_AUD is not configured; refusing all requests");
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const token = c.req.header(HEADER);
  if (!token) return deny(c, "missing Cf-Access-Jwt-Assertion header", console.warn);

  try {
    const { payload } = await jwtVerify(token, keySetFor(teamDomain), {
      algorithms: ["RS256"],
      issuer: `https://${teamDomain}`,
      audience: aud,
      clockTolerance: TOLERANCE_SECONDS,
      requiredClaims: ["exp", "sub"],
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return deny(c, "token has no email", console.warn);
    c.set("identity", { email, sub: payload.sub as string });
  } catch (err) {
    // The key set could not be fetched or parsed (network, timeout, non-200, bad body): that is our
    // upstream failing, not a bad token, so say 503 rather than 401.
    if (isKeySetFailure(err)) {
      console.error(`access: key set unavailable: ${err instanceof Error ? err.name : "unknown"}`);
      return c.json({ error: "Authentication temporarily unavailable" }, 503);
    }
    // Log the failure class only, never the token.
    return deny(c, `token rejected: ${err instanceof Error ? err.name : "unknown"}`, console.warn);
  }
  return next();
});
