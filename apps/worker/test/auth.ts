import { exports } from "cloudflare:workers";
import { exportJWK, generateKeyPair, SignJWT, type JWK, type CryptoKey } from "jose";

export const TEAM = "test-team.cloudflareaccess.com";
export const AUD = "test-aud-tag";
export const ISS = `https://${TEAM}`;
export const DOWN_TEAM = "down-team.cloudflareaccess.com";
export const NETWORK_FAIL_TEAM = "unreachable-team.cloudflareaccess.com";
const DOWN_JWKS_URL = `https://${DOWN_TEAM}/cdn-cgi/access/certs`;
const TIMEOUT_JWKS_URL = `https://${NETWORK_FAIL_TEAM}/cdn-cgi/access/certs`;
const JWKS_URL = `https://${TEAM}/cdn-cgi/access/certs`;

const pair = await generateKeyPair("RS256", { extractable: true });
export const otherPair = await generateKeyPair("RS256", { extractable: true });
const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };

// Serve the fake key set; everything else goes to the real fetch.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url === DOWN_JWKS_URL) return new Response("bad gateway", { status: 502 });
  if (url === TIMEOUT_JWKS_URL) throw new TypeError("fetch failed");
  if (url === JWKS_URL) return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { "content-type": "application/json" } });
  return realFetch(input, init);
}) as typeof fetch;

export type TokenOptions = { aud?: string | string[]; iss?: string; exp?: number | string; nbf?: number; email?: string | null; sub?: string; key?: CryptoKey; kid?: string };

export async function signToken(o: TokenOptions & { team?: string } = {}): Promise<string> {
  const jwt = new SignJWT({ ...(o.email === null ? {} : { email: o.email ?? "player@example.com" }) })
    .setProtectedHeader({ alg: "RS256", kid: o.kid ?? "test-key" })
    .setSubject(o.sub ?? "user-1")
    .setAudience(o.aud ?? AUD)
    .setIssuer(o.iss ?? (o.team ? `https://${o.team}` : ISS))
    .setIssuedAt()
    .setExpirationTime(o.exp ?? "5m");
  if (o.nbf !== undefined) jwt.setNotBefore(o.nbf);
  return jwt.sign(o.key ?? pair.privateKey);
}

/** Fetches through the Worker with a valid Access token (the normal test path). */
export async function authedFetch(url: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cf-Access-Jwt-Assertion", token ?? (await signToken()));
  return exports.default.fetch(new Request(url, { ...init, headers }));
}

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Hand-built tokens for the algorithm-confusion tests. */
export function unsignedToken(): string {
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "x", email: "a@b.c", aud: AUD, iss: ISS, exp: Math.floor(Date.now() / 1000) + 300 })}.`;
}

export async function hs256Token(secret: string): Promise<string> {
  return new SignJWT({ email: "a@b.c" })
    .setProtectedHeader({ alg: "HS256", kid: "test-key" })
    .setSubject("x")
    .setAudience(AUD)
    .setIssuer(ISS)
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}
