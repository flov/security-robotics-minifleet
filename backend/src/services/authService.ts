import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { sql } from "../db/client.ts";

const TOKEN_TTL = "24h";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
};

export type AuthUser = {
  id: number;
  email: string;
};

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser } | null> {
  const rows = await sql<UserRow[]>`
    SELECT id, email, password_hash
    FROM users
    WHERE lower(email) = lower(${email})
  `;
  const user = rows[0];
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) return null;

  const token = jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
    expiresIn: TOKEN_TTL,
  });

  return { token, user: { id: user.id, email: user.email } };
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string") return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
