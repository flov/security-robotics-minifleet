import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { config } from "../config.ts";
import { db } from "../db/client.ts";
import { users } from "../db/schema.ts";

const TOKEN_TTL = "24h";

export type AuthUser = {
  id: number;
  email: string;
};

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser } | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  const user = rows[0];
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
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
