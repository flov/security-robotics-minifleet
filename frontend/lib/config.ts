const DEFAULT_DEV_API_URL = "http://localhost:4000";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_API_URL;
  }
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}
