import { afterEach, describe, expect, test } from "bun:test";
import request from "supertest";
import { createApp } from "../src/app.ts";
import { stopSimulation } from "../src/simulation/tick.ts";
import { ADMIN_EMAIL, ADMIN_PASSWORD, auth, loginAsAdmin } from "./helpers.ts";
import "./setup.ts";

const app = createApp();

describe.serial("API", () => {
  test("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  describe("auth", () => {
    test("POST /auth/login rejects a missing body", async () => {
      const res = await request(app).post("/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email and password required" });
    });

    test("POST /auth/login rejects a wrong password", async () => {
      const res = await request(app).post("/auth/login").send({
        email: ADMIN_EMAIL,
        password: "not-the-password",
      });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    test("POST /auth/login returns a token for the demo user", async () => {
      const res = await request(app).post("/auth/login").send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(res.body.user.email).toBe(ADMIN_EMAIL);
    });
  });

  describe("robots", () => {
    test("rejects unauthenticated requests", async () => {
      const list = await request(app).get("/robots");
      const create = await request(app).post("/robots").send({ name: "X", lat: 0, lon: 0 });
      const remove = await request(app).delete("/robots/1");
      const move = await request(app).post("/robots/1/move");

      expect(list.status).toBe(401);
      expect(create.status).toBe(401);
      expect(remove.status).toBe(401);
      expect(move.status).toBe(401);
    });

    test("GET /robots returns the fleet", async () => {
      const { token } = await loginAsAdmin(app);
      const res = await request(app).get("/robots").set(auth(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const robot of res.body) {
        expect(typeof robot.id).toBe("number");
        expect(typeof robot.name).toBe("string");
        expect(robot.status === "idle" || robot.status === "moving").toBe(true);
      }
    });

    test("POST /robots rejects an invalid latitude", async () => {
      const { token } = await loginAsAdmin(app);
      const res = await request(app).post("/robots").set(auth(token)).send({
        name: "Out of range",
        lat: 120,
        lon: 12.37,
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Latitude must be a number between -90 and 90");
    });

    test("POST /robots creates an idle robot", async () => {
      const { token } = await loginAsAdmin(app);
      const name = `Test Robot ${Date.now()}`;
      const created = await request(app).post("/robots").set(auth(token)).send({
        name,
        lat: 51.34,
        lon: 12.37,
      });
      expect(created.status).toBe(201);
      expect(created.body.name).toBe(name);
      expect(created.body.status).toBe("idle");

      const list = await request(app).get("/robots").set(auth(token));
      expect(list.status).toBe(200);
      expect(list.body.some((robot: { name: string }) => robot.name === name)).toBe(true);

      await request(app).delete(`/robots/${created.body.id}`).set(auth(token));
    });

    test("POST /robots/:id/move returns 404 for an unknown robot", async () => {
      const { token } = await loginAsAdmin(app);
      const res = await request(app).post("/robots/999999999/move").set(auth(token));
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Robot not found" });
    });

    test("POST /robots/:id/move marks the robot as moving", async () => {
      const { token } = await loginAsAdmin(app);
      const created = await request(app).post("/robots").set(auth(token)).send({
        name: `Move Robot ${Date.now()}`,
        lat: 51.34,
        lon: 12.37,
      });
      expect(created.status).toBe(201);

      const moved = await request(app)
        .post(`/robots/${created.body.id}/move`)
        .set(auth(token));
      expect(moved.status).toBe(200);
      expect(moved.body.id).toBe(created.body.id);
      expect(moved.body.status).toBe("moving");
      expect(typeof moved.body.lat).toBe("number");
      expect(typeof moved.body.lon).toBe("number");

      const history = await request(app)
        .get(`/robots/${created.body.id}/positions`)
        .set(auth(token));
      expect(history.status).toBe(200);
      expect(Array.isArray(history.body)).toBe(true);
      expect(history.body.length).toBeGreaterThanOrEqual(2);
      const last = history.body[history.body.length - 1];
      expect(last.lat).toBe(moved.body.lat);
      expect(last.lon).toBe(moved.body.lon);
      expect(last.status).toBe("moving");

      await request(app).delete(`/robots/${created.body.id}`).set(auth(token));
    });

    test("GET /robots/:id/positions returns 404 for an unknown robot", async () => {
      const { token } = await loginAsAdmin(app);
      const res = await request(app).get("/robots/999999999/positions").set(auth(token));
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Robot not found" });
    });

    test("DELETE /robots/:id validates, misses, and removes", async () => {
      const { token } = await loginAsAdmin(app);

      const invalid = await request(app).delete("/robots/0").set(auth(token));
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ error: "Invalid id" });

      const missing = await request(app).delete("/robots/999999999").set(auth(token));
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: "Robot not found" });

      const created = await request(app).post("/robots").set(auth(token)).send({
        name: `Delete Robot ${Date.now()}`,
        lat: 51.33,
        lon: 12.36,
      });
      expect(created.status).toBe(201);
      const id = created.body.id as number;

      const removed = await request(app).delete(`/robots/${id}`).set(auth(token));
      expect(removed.status).toBe(204);

      const list = await request(app).get("/robots").set(auth(token));
      expect(list.status).toBe(200);
      expect(list.body.some((robot: { id: number }) => robot.id === id)).toBe(false);
    });
  });

  describe("simulation", () => {
    afterEach(() => {
      stopSimulation();
    });

    test("GET /simulation reports whether the timer is running", async () => {
      const { token } = await loginAsAdmin(app);
      const res = await request(app).get("/simulation").set(auth(token));
      expect(res.status).toBe(200);
      expect(typeof res.body.running).toBe("boolean");
    });

    test("POST /simulation/stop and /start toggle the timer", async () => {
      const { token } = await loginAsAdmin(app);

      const stopped = await request(app).post("/simulation/stop").set(auth(token));
      expect(stopped.status).toBe(200);
      expect(stopped.body).toEqual({ running: false });

      const started = await request(app).post("/simulation/start").set(auth(token));
      expect(started.status).toBe(200);
      expect(started.body).toEqual({ running: true });
    });
  });
});
