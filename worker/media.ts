import { ApiError } from "./http";

const enc = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string) {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    keyCache.set(secret, k);
  }
  return k;
}

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function signingSecret(env: Env) {
  if (!env.MEDIA_SIGNING_SECRET) throw new ApiError(503, "not_configured", "MEDIA_SIGNING_SECRET is not set");
  return env.MEDIA_SIGNING_SECRET;
}

/** A link to an R2 object that anyone holding it can read until it expires (players, vendors fetching references). */
export async function signedMediaUrl(env: Env, origin: string, key: string, ttlSeconds = 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(signingSecret(env)), enc.encode(`${key}:${exp}`));
  return `${origin}/api/media/${key.split("/").map(encodeURIComponent).join("/")}?exp=${exp}&sig=${b64url(sig)}`;
}

async function verify(env: Env, key: string, exp: string | null, sig: string | null) {
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(signingSecret(env)), fromB64url(sig), enc.encode(`${key}:${exp}`));
  } catch {
    return false;
  }
}

/** GET /api/media/<key>?exp&sig — streams from R2 with Range support so videos can seek. */
export async function serveMedia(request: Request, env: Env, key: string) {
  const url = new URL(request.url);
  if (!(await verify(env, key, url.searchParams.get("exp"), url.searchParams.get("sig")))) {
    throw new ApiError(403, "bad_signature", "This media link has expired");
  }
  const object = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) throw new ApiError(404, "not_found", "Media not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600");
  if (!("body" in object)) return new Response(null, { status: 304, headers });

  const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (range && request.headers.has("range")) {
    const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0);
    const length = range.suffix ?? range.length ?? object.size - offset;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("content-length", String(object.size));
  return new Response(object.body, { headers });
}

const UPLOAD_LIMIT = 50 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

/** POST /api/uploads — raw file body. Stored under the user's prefix so it can only be referenced by them. */
export async function storeUpload(request: Request, env: Env, userId: string, origin: string) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) throw new ApiError(415, "unsupported_type", "Upload a JPEG, PNG, WebP, MP4, MOV or WebM file");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (!length) throw new ApiError(411, "length_required", "Upload size is unknown");
  if (length > UPLOAD_LIMIT) throw new ApiError(413, "too_large", "Uploads are limited to 50 MB");
  if (!request.body) throw new ApiError(400, "empty", "Upload is empty");

  const key = `u/${userId}/refs/${crypto.randomUUID()}.${ext}`;
  const name = request.headers.get("x-filename") ?? `upload.${ext}`;
  await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type }, customMetadata: { name: name.slice(0, 200) } });
  return { key, url: await signedMediaUrl(env, origin, key) };
}

/** Copies a vendor result into R2. Streams when the size is known so large 4K renders don't sit in memory. */
export async function copyToR2(env: Env, key: string, source: Response, fallbackType: string) {
  if (!source.ok || !source.body) throw new Error(`Download failed with HTTP ${source.status}`);
  const contentType = source.headers.get("content-type")?.split(";")[0] || fallbackType;
  const length = Number(source.headers.get("content-length") ?? 0);
  let body: ReadableStream | ArrayBuffer;
  if (length > 0) {
    const fixed = new FixedLengthStream(length);
    void source.body.pipeTo(fixed.writable);
    body = fixed.readable;
  } else {
    body = await source.arrayBuffer();
  }
  await env.MEDIA.put(key, body, { httpMetadata: { contentType } });
  return contentType;
}

/** Bytes for a reference: an R2 upload of this user, or one of the bundled /media/ samples. */
export async function readReference(env: Env, userId: string, ref: { key?: string; url: string }): Promise<{ bytes: ArrayBuffer; mime: string }> {
  if (ref.key) {
    if (!ref.key.startsWith(`u/${userId}/`)) throw new Error("Reference belongs to another account");
    const obj = await env.MEDIA.get(ref.key);
    if (!obj) throw new Error("A reference file is missing — re-upload it");
    return { bytes: await obj.arrayBuffer(), mime: obj.httpMetadata?.contentType ?? "application/octet-stream" };
  }
  if (ref.url.startsWith("/media/")) {
    const res = await env.ASSETS.fetch(new Request(`https://assets.local${ref.url}`));
    if (!res.ok) throw new Error(`Sample ${ref.url} not found`);
    return { bytes: await res.arrayBuffer(), mime: res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg" };
  }
  throw new Error("Unsupported reference");
}

export function toBase64(bytes: ArrayBuffer) {
  const u8 = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
