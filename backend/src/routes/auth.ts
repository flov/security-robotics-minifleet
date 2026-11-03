import { Router } from "express";
import { login } from "../services/authService.ts";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;
  if (typeof email !== "string" || typeof password !== "string" || email.length === 0) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const result = await login(email, password);
  if (!result) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json(result);
});
