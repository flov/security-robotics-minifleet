function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") return true;
  if ("cause" in error && error.cause) return isConnectionError(error.cause);
  return false;
}

export function rethrowDatabaseStartupError(error: unknown): never {
  if (isConnectionError(error)) {
    console.error(
      [
        "Cannot reach Postgres (check DATABASE_URL in backend/.env).",
        "This project publishes Compose Postgres on localhost:5433.",
        "From the repo root: docker compose up db -d",
      ].join("\n"),
    );
  }
  throw error;
}
