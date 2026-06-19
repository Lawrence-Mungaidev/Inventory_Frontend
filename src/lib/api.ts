import { auth } from "./auth";

export const API_BASE =
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}


type Opts = {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  skipAuth?: boolean;
  raw?: boolean;
};

function buildUrl(path: string, query?: Record<string, any>) {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (!opts.skipAuth) {
    const t = auth.getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && !opts.skipAuth) {
    if (opts.skipAuth) {
    } else {
      auth.clear();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired");
    }
}

  if (res.status === 204) return undefined as T;

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let msg = "Request failed";
    if (typeof data === "string") msg = data;
    else if (data?.message) msg = data.message;
    else if (data?.error) msg = data.error;
    else if (Array.isArray(data?.errors)) msg = data.errors.join(", ");
    else if (data && typeof data === "object") {
      // 400 validation: { field: "msg", ... }
      const parts = Object.entries(data)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => `${k}: ${v}`);
      if (parts.length) msg = parts.join("; ");
    }
    if (res.status === 404 && !msg) msg = "Not found";
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}
