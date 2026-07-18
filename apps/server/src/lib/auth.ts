import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { FastifyRequest, FastifyReply } from "fastify";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export interface JwtPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing authorization token" });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    (request as any).user = payload;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export function getUser(request: FastifyRequest): JwtPayload {
  return (request as any).user;
}
