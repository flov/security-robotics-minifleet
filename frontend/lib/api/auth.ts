import { getApiBaseUrl } from "../config";

export type AuthUser = {
  id: number;
  email: string;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export class LoginError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message = "Login failed";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new LoginError(message, response.status);
  }

  return (await response.json()) as LoginResult;
}
