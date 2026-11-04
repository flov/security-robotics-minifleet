import type { Express } from "express";
import request from "supertest";

export const ADMIN_EMAIL = "admin@test.com";
export const ADMIN_PASSWORD = "test123";

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function loginAsAdmin(app: Express): Promise<{ token: string }> {
  const res = await request(app).post("/auth/login").send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (res.status !== 200 || typeof res.body?.token !== "string") {
    throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token };
}
