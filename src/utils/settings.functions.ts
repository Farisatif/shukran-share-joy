import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// In-memory rate limit store (per-instance). Keyed by client IP.
type Attempt = { count: number; firstAt: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

function getClientKey(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRate(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a) return { allowed: true };
  if (a.lockedUntil > now) return { allowed: false, retryAfter: Math.ceil((a.lockedUntil - now) / 1000) };
  if (now - a.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFail(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.lockedUntil = now + LOCK_MS;
}

// 24-char recovery code from a no-ambiguity alphabet, formatted XXXX-XXXX-...
function generateRecoveryCode(): { raw: string; formatted: string } {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  let raw = "";
  for (let i = 0; i < 24; i++) raw += alphabet[buf[i] % alphabet.length];
  const formatted = (raw.match(/.{1,4}/g) || []).join("-");
  return { raw, formatted };
}

// Normalize user-typed recovery codes (strip spaces/dashes, uppercase).
function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

async function readAdminRow() {
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .select("password_hash, recovery_code_hash")
    .eq("id", "singleton")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;
  // Auto-initialize on first use using the configured admin password secret.
  const seedPw = process.env.SETTINGS_ADMIN_PASSWORD;
  if (!seedPw) throw new Error("Admin settings not initialized");
  const { raw } = generateRecoveryCode();
  const password_hash = await bcrypt.hash(seedPw, 10);
  const recovery_code_hash = await bcrypt.hash(raw, 10);
  const { error: upErr } = await supabaseAdmin
    .from("admin_settings")
    .upsert({ id: "singleton", password_hash, recovery_code_hash, updated_at: new Date().toISOString() });
  if (upErr) throw new Error(upErr.message);
  console.warn("[admin_settings] Initialized singleton row from SETTINGS_ADMIN_PASSWORD. Recovery code:", (raw.match(/.{1,4}/g) || []).join("-"));
  return { password_hash, recovery_code_hash };
}

type PasswordCheck = { ok: true } | { ok: false; error: string; retryAfter?: number };

async function checkPassword(password: string): Promise<PasswordCheck> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const key = getClientKey(req.headers);
  const rate = checkRate(key);
  if (!rate.allowed) {
    return { ok: false, error: `Too many attempts. Try again in ${rate.retryAfter}s.`, retryAfter: rate.retryAfter };
  }
  try {
    const row = await readAdminRow();
    let ok = await bcrypt.compare(password, row.password_hash);
    // Self-heal: if the supplied password matches the configured Cloud secret
    // exactly but the stored hash was rotated/stale, re-seed the hash from the
    // secret so the admin can always log in with the configured password.
    if (!ok) {
      const seedPw = process.env.SETTINGS_ADMIN_PASSWORD;
      if (seedPw && password === seedPw) {
        const newHash = await bcrypt.hash(seedPw, 10);
        const { error: upErr } = await supabaseAdmin
          .from("admin_settings")
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .eq("id", "singleton");
        if (!upErr) {
          ok = true;
        }
      }
    }
    if (!ok) {
      recordFail(key);
      return { ok: false, error: "Invalid password" };
    }
    return { ok: true };
  } catch (error) {
    recordFail(key);
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "Invalid password",
    };
  }
}

export const saveSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; data: unknown }) => {
    if (!input || typeof input.password !== "string") throw new Error("Invalid input");
    if (input.password.length > 200) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return auth;
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ id: "singleton", data: data.data as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const verifySettingsPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string" || input.password.length > 200) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    return checkPassword(data.password);
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => {
    if (!input || typeof input.password !== "string" || typeof input.id !== "string") {
      throw new Error("Invalid input");
    }
    if (input.password.length > 200 || input.id.length > 64) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return auth;
    const { error } = await supabaseAdmin.from("comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listAllComments = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string" || input.password.length > 200) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return { ...auth, comments: [] as Array<{ id: string; author_name: string; message: string; created_at: string; status: string }> };
    const { data: rows, error } = await supabaseAdmin
      .from("comments")
      .select("id, author_name, message, created_at, status")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { ok: true as const, comments: (rows || []) as Array<{ id: string; author_name: string; message: string; created_at: string; status: string }> };
  });

// Approve or reject a comment.
export const setCommentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; status: "approved" | "rejected" | "pending" }) => {
    if (!input || typeof input.password !== "string" || typeof input.id !== "string") {
      throw new Error("Invalid input");
    }
    if (!["approved", "rejected", "pending"].includes(input.status)) throw new Error("Invalid status");
    if (input.password.length > 200 || input.id.length > 64) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return auth;
    const { error } = await supabaseAdmin
      .from("comments")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Reset password using a one-time recovery code. On success, returns a freshly
// generated recovery code (the old one is invalidated).
export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { recoveryCode: string; newPassword: string }) => {
    if (!input || typeof input.recoveryCode !== "string" || typeof input.newPassword !== "string") {
      throw new Error("Invalid input");
    }
    if (input.recoveryCode.length > 200 || input.newPassword.length > 200 || input.newPassword.length < 6) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const key = getClientKey(req.headers);
    const rate = checkRate(key);
    if (!rate.allowed) {
      return { ok: false as const, error: `Too many attempts. Try again in ${rate.retryAfter}s.` };
    }
    const row = await readAdminRow();
    const codeOk = await bcrypt.compare(normalizeCode(data.recoveryCode), row.recovery_code_hash);
    if (!codeOk) {
      recordFail(key);
      return { ok: false as const, error: "Invalid recovery code" };
    }
    const newPwHash = await bcrypt.hash(data.newPassword, 10);
    const newCode = generateRecoveryCode();
    const newCodeHash = await bcrypt.hash(newCode.raw, 10);
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({
        password_hash: newPwHash,
        recovery_code_hash: newCodeHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true as const, newRecoveryCode: newCode.formatted };
  });

// Generate a new recovery code (requires current password). Old code becomes invalid.
export const rotateRecoveryCode = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string" || input.password.length > 200) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return auth;
    const newCode = generateRecoveryCode();
    const newCodeHash = await bcrypt.hash(newCode.raw, 10);
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({
        recovery_code_hash: newCodeHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true as const, newRecoveryCode: newCode.formatted };
  });

// Change password while logged in (requires current password).
export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; newPassword: string }) => {
    if (!input || typeof input.password !== "string" || typeof input.newPassword !== "string") {
      throw new Error("Invalid input");
    }
    if (input.password.length > 200 || input.newPassword.length > 200 || input.newPassword.length < 6) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return auth;
    const newPwHash = await bcrypt.hash(data.newPassword, 10);
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({ password_hash: newPwHash, updated_at: new Date().toISOString() })
      .eq("id", "singleton");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Lightweight DB connectivity check for the admin panel. Requires a valid
// admin password since this is only used inside the CMS drawer. Returns a
// generic error string to avoid leaking raw Supabase/Postgres error details.
export const pingDatabase = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string" || input.password.length > 200) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const auth = await checkPassword(data.password);
    if (!auth.ok) return { ...auth, latencyMs: 0 };
    const startedAt = Date.now();
    try {
      const { error } = await supabaseAdmin
        .from("admin_settings")
        .select("id")
        .eq("id", "singleton")
        .maybeSingle();
      const latencyMs = Date.now() - startedAt;
      if (error) {
        console.error("[pingDatabase] supabase error:", error.message);
        return { ok: false as const, error: "Database unreachable", latencyMs };
      }
      return { ok: true as const, latencyMs };
    } catch (e) {
      const latencyMs = Date.now() - startedAt;
      console.error("[pingDatabase] exception:", e);
      return {
        ok: false as const,
        error: "Database unreachable",
        latencyMs,
      };
    }
  });
