import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "ancestors-saas-super-secret-key-2026-very-long-and-secure";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

export function signToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailAnniversaries: true,
        emailNameDays: true,
      }
    });
    return user;
  } catch (e) {
    return null;
  }
}

export async function getActiveTreeIdForUser(userId: string): Promise<string> {
  const cookieStore = await cookies();
  let activeTreeId = cookieStore.get("activeTreeId")?.value;

  if (activeTreeId) {
    // Verify user owns the tree
    const tree = await prisma.tree.findFirst({
      where: { id: activeTreeId, ownerId: userId }
    });
    if (tree) {
      return tree.id;
    }
  }

  // Fallback: get the first tree owned by this user
  let tree = await prisma.tree.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" }
  });

  if (!tree) {
    // If no trees exist at all, create a default one
    tree = await prisma.tree.create({
      data: {
        name: "Mon arbre généalogique",
        description: "Mon premier arbre généalogique sur Ancestors",
        ownerId: userId,
      }
    });
  }

  // Set the cookie so it's persisted
  try {
    cookieStore.set("activeTreeId", tree.id, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });
  } catch (e) {
    // Ignore error when setting cookie in render phase (GET page render etc.)
  }

  return tree.id;
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmailsStr = process.env.ADMIN_EMAILS;
  if (!adminEmailsStr) {
    // In local development, if ADMIN_EMAILS is not set, allow access to ease testing
    return process.env.NODE_ENV !== "production";
  }
  const adminEmails = adminEmailsStr.split(",").map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

