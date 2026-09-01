const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : "Something went wrong. Please try again.";

    throw new Error(message);
  }

  return payload as T;
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
