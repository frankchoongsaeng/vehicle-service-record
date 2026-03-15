import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_ISSUER = "vehicle-service-record-openauth";
const DEFAULT_AUDIENCE = "vehicle-service-record-client";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type OpenAuthClaims = {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(normalized, "base64");
}

function getSecret(): string {
  return process.env.OPENAUTH_SECRET || "dev-only-openauth-secret-change-me";
}

export function issueOpenAuthToken(subject: { id: string; email: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: OpenAuthClaims = {
    sub: subject.id,
    email: subject.email,
    iss: process.env.OPENAUTH_ISSUER || DEFAULT_ISSUER,
    aud: process.env.OPENAUTH_AUDIENCE || DEFAULT_AUDIENCE,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(claims));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", getSecret()).update(unsigned).digest();

  return `${unsigned}.${toBase64Url(signature)}`;
}

export function verifyOpenAuthToken(token: string): OpenAuthClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", getSecret()).update(unsigned).digest();
  const providedSignature = fromBase64Url(encodedSignature);

  if (expectedSignature.length !== providedSignature.length) {
    return null;
  }

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  const claims = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as OpenAuthClaims;
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = process.env.OPENAUTH_ISSUER || DEFAULT_ISSUER;
  const expectedAudience = process.env.OPENAUTH_AUDIENCE || DEFAULT_AUDIENCE;

  if (claims.iss !== expectedIssuer) {
    return null;
  }

  if (claims.aud !== expectedAudience) {
    return null;
  }

  if (claims.exp <= now) {
    return null;
  }

  return claims;
}
