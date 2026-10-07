export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) return json({ error: err.code, message: err.message, ...err.extra }, { status: err.status });
  console.error(JSON.stringify({ level: "error", msg: "unhandled", error: String(err), stack: (err as Error)?.stack }));
  return json({ error: "internal", message: "Something went wrong on our side" }, { status: 500 });
}

/** `next dev` on localhost talks to `wrangler dev` cross-origin; production is same-origin and needs no CORS. */
export function withCors(request: Request, response: Response) {
  const origin = request.headers.get("origin");
  if (!origin || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return response;
  const res = new Response(response.body, response);
  res.headers.set("access-control-allow-origin", origin);
  res.headers.set("access-control-allow-headers", "authorization, content-type, x-filename");
  res.headers.set("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.headers.set("vary", "origin");
  return res;
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "bad_json", "Request body must be JSON");
  }
}
