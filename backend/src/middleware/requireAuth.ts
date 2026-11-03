import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/authService.ts";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
