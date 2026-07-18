let apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
if (apiBase) {
  apiBase = apiBase.replace(/\/$/, "");
  if (!apiBase.endsWith("/api")) {
    apiBase = apiBase + "/api";
  }
}
const BASE_URL = apiBase;

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ApiError("NETWORK_ERROR", "Could not reach the server", 0);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN_ERROR", body?.error?.message ?? res.statusText, res.status);
  }

  return body;
}

export function get(path) {
  return request(path);
}

export function post(path, body) {
  if (body instanceof FormData) {
    return request(path, { method: "POST", body });
  }
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch(path, body) {
  return request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
