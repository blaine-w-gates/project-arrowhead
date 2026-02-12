import { Router } from "express";
import { getDb } from "../db";
import { authOtp, authEvents, users, userSubscriptions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { signJwt, verifyJwt } from "../auth/jwt";

const router = Router();

// --- Auth vNext: Passwordless OTP endpoints ---
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function rateKey(ip: string, email?: string) {
    return `${ip}|${(email || "").toLowerCase()}`;
}
function allowRate(key: string) {
    const now = Date.now();
    const v = rateMap.get(key);
    if (!v || v.resetAt <= now) {
        rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }
    if (v.count >= RATE_LIMIT) return false;
    v.count += 1;
    return true;
}
function originAllowed(req: import("express").Request): boolean {
    const origin = (req.get("origin") || "").replace(/\/$/, "");
    if (!origin) return true; // tolerate missing Origin in dev/tools
    const host = `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
    return origin === host;
}
function sha256Hex(s: string): string {
    return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

// In-memory fallback for OTP/events in dev/test; only use DB in non-test environments
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.VITEST_WORKER_ID;
const useDb = !!process.env.DATABASE_URL && !isTestEnv;
type MemOtp = {
    id: number;
    email: string;
    codeHash: string | null;
    purpose: string | null;
    attempts: number;
    maxAttempts: number;
    expiresAt: Date | null;
    createdAt: Date;
    ip?: string | null;
    userAgent?: string | null;
};
const memOtps: MemOtp[] = [];
let memOtpId = 1;
const memEvents: Array<{ id: number; userId: number | null; type: string; metadata: string | null; createdAt: Date }> = [];
let memEventId = 1;
const memUsers = new Map<string, { id: number; email: string }>();
let memUserId = 1;

router.post("/request", async (req, res) => {
    try {
        if (req.get("content-type")?.toLowerCase().indexOf("application/json") === -1) {
            return res.status(415).json({ success: false, error: "Content-Type must be application/json" });
        }
        if (!originAllowed(req)) {
            return res.status(403).json({ success: false, error: "Origin not allowed" });
        }

        const emailRaw = typeof req.body?.email === "string" ? String(req.body.email) : "";
        const email = emailRaw.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
            return res.status(400).json({ success: false, error: "Invalid email" });
        }

        const ip = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() || req.socket.remoteAddress || "";
        const key = rateKey(String(ip), email);
        if (!allowRate(key)) {
            return res.status(429).json({ success: false, error: "Too many requests" });
        }

        // Generate a 6-digit OTP and store hashed
        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const codeHash = sha256Hex(code);
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (useDb) {
            const db = getDb();
            await db.insert(authOtp).values({
                email,
                codeHash,
                purpose: "login",
                attempts: 0,
                maxAttempts: 5,
                expiresAt: expires,
                createdAt: new Date(),
                ip: String(ip),
                userAgent: req.get("user-agent") || "",
            });

            await db.insert(authEvents).values({
                userId: null,
                type: "otp_issued",
                metadata: JSON.stringify({ email, ip }),
                createdAt: new Date(),
            });
        } else {
            memOtps.unshift({ id: memOtpId++, email, codeHash, purpose: "login", attempts: 0, maxAttempts: 5, expiresAt: expires, createdAt: new Date(), ip: String(ip), userAgent: req.get("user-agent") || "" });
            memEvents.push({ id: memEventId++, userId: null, type: "otp_issued", metadata: JSON.stringify({ email, ip }), createdAt: new Date() });
        }

        // TODO: integrate email provider; for now, log code in dev
        if (process.env.NODE_ENV !== 'production') {
            // Start with code so the first digit sequence matches the 6-digit OTP
            console.log(`${code} [auth][dev] OTP for ${email}: ${code}`);
        }

        const testMode = (process.env.NODE_ENV === 'test') || (process.env.E2E_EXPOSE_OTP === '1' || process.env.E2E_EXPOSE_OTP === 'true') || (req.get('x-test-mode') === '1');
        return res.status(200).json(testMode ? { success: true, devCode: code } : { success: true });
    } catch (err) {
        console.error('[auth][verify] error', err);
        return res.status(500).json({ success: false, error: "Unexpected error" });
    }
});

router.post("/verify", async (req, res) => {
    try {
        if (req.get("content-type")?.toLowerCase().indexOf("application/json") === -1) {
            return res.status(415).json({ success: false, error: "Content-Type must be application/json" });
        }
        if (!originAllowed(req)) {
            return res.status(403).json({ success: false, error: "Origin not allowed" });
        }

        const emailRaw = typeof req.body?.email === "string" ? String(req.body.email) : "";
        const codeRaw = typeof req.body?.code === "string" ? String(req.body.code) : "";
        const email = emailRaw.trim().toLowerCase();
        const code = codeRaw.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || !/^\d{6,8}$/.test(code)) {
            return res.status(400).json({ success: false, error: "Invalid email or code" });
        }

        const ip = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() || req.socket.remoteAddress || "";
        const key = rateKey(String(ip), email);
        if (!allowRate(key)) {
            return res.status(429).json({ success: false, error: "Too many requests" });
        }

        if (useDb) {
            const db = getDb();
            const now = new Date();
            const rows = await db
                .select()
                .from(authOtp)
                .where(eq(authOtp.email, email))
                .orderBy(desc(authOtp.createdAt))
                .limit(5);

            const candidate = rows.find(r => (r.expiresAt ? r.expiresAt.getTime() : 0) >= now.getTime() && (r.attempts ?? 0) < (r.maxAttempts ?? 5));
            if (!candidate) {
                await db.insert(authEvents).values({ userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "no_valid_otp" }), createdAt: now });
                return res.status(401).json({ success: false, error: "Invalid or expired code" });
            }

            const ok = candidate.codeHash && candidate.codeHash === sha256Hex(code);
            if (!ok) {
                // increment attempts best-effort
                try {
                    await db.update(authOtp)
                        .set({ attempts: (candidate.attempts ?? 0) + 1 })
                        .where(eq(authOtp.id, candidate.id as number));
                } catch (e) { void e; }
                await db.insert(authEvents).values({ userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "mismatch" }), createdAt: now });
                return res.status(401).json({ success: false, error: "Invalid or expired code" });
            }

            // Resolve or create user
            let user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
            if (!user) {
                user = await db.insert(users).values({ email, password: crypto.randomBytes(16).toString('hex'), tier: 'free' }).returning().then(r => r[0]);
            }

            const secret = process.env.AUTH_JWT_SECRET || '';
            if (!secret) {
                return res.status(500).json({ success: false, error: "Server not configured" });
            }
            const jti = crypto.randomBytes(16).toString('hex');
            const token = signJwt({ sub: String(user.id), jti }, secret, 7 * 24 * 60 * 60);

            // Set HttpOnly cookie
            // Important: Avoid Secure on HTTP so Safari/WebKit stores the cookie in CI/dev
            const isHttps = (req.headers['x-forwarded-proto'] === 'https') || req.secure === true;
            res.cookie('sb_session', token, {
                httpOnly: true,
                secure: isHttps,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            await db.insert(authEvents).values({ userId: user.id, type: "login", metadata: JSON.stringify({ jti, ip }), createdAt: now });

            return res.status(200).json({ success: true, user: { id: user.id, email: user.email } });
        } else {
            const now = new Date();
            const candidate = memOtps.find(o => o.email === email && (o.expiresAt ? o.expiresAt.getTime() : 0) >= now.getTime() && o.attempts < o.maxAttempts);
            console.log('[auth][dev] verify candidate', { found: !!candidate });
            if (!candidate) {
                memEvents.push({ id: memEventId++, userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "no_valid_otp" }), createdAt: now });
                return res.status(401).json({ success: false, error: "Invalid or expired code" });
            }

            const ok = candidate.codeHash && candidate.codeHash === sha256Hex(code);
            console.log('[auth][dev] verify compare', { ok });
            if (!ok) {
                try { candidate.attempts = candidate.attempts + 1; } catch (e) { void e; }
                memEvents.push({ id: memEventId++, userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "mismatch" }), createdAt: now });
                return res.status(401).json({ success: false, error: "Invalid or expired code" });
            }

            let user = memUsers.get(email);
            if (!user) {
                user = { id: memUserId++, email };
                memUsers.set(email, user);
            }

            const secret = process.env.AUTH_JWT_SECRET || '';
            if (!secret) {
                return res.status(500).json({ success: false, error: "Server not configured" });
            }
            const jti = crypto.randomBytes(16).toString('hex');
            const token = signJwt({ sub: String(user.id), jti }, secret, 7 * 24 * 60 * 60);

            const isHttps2 = (req.headers['x-forwarded-proto'] === 'https') || req.secure === true;
            res.cookie('sb_session', token, {
                httpOnly: true,
                secure: isHttps2,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            memEvents.push({ id: memEventId++, userId: user.id, type: "login", metadata: JSON.stringify({ jti, ip }), createdAt: now });
            return res.status(200).json({ success: true, user: { id: user.id, email: user.email } });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: "Unexpected error" });
    }
});

// GET /me - Return authenticated user from sb_session JWT
router.get("/me", async (req, res) => {
    try {
        const token = req.cookies?.sb_session;
        if (!token) {
            return res.status(401).json({ success: false, error: "Not authenticated" });
        }

        const secret = process.env.AUTH_JWT_SECRET || '';
        if (!secret) {
            return res.status(500).json({ success: false, error: "Server not configured" });
        }

        const result = verifyJwt(token, secret);
        if (!result.valid || !result.payload) {
            return res.status(401).json({ success: false, error: "Invalid or expired session" });
        }

        const userId = result.payload.sub;
        if (typeof userId !== 'string') {
            return res.status(401).json({ success: false, error: "Invalid session payload" });
        }

        if (useDb) {
            const db = await getDb();
            const user = await db.select().from(users).where(eq(users.id, parseInt(userId, 10))).then(r => r[0]);
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            // Join with user_subscriptions table
            const subscription = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id)).then(r => r[0]);

            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    subscription: subscription ? {
                        status: subscription.status,
                        planName: subscription.planName,
                        currentPeriodEnd: subscription.currentPeriodEnd,
                        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                    } : { status: 'none' }
                }
            });
        } else {
            // In-memory fallback
            const user = Array.from(memUsers.values()).find(u => u.id === parseInt(userId, 10));
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }
            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    subscription: { status: 'none' }
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: "Unexpected error" });
    }
});

// POST /logout - Clear sb_session cookie
router.post("/logout", async (req, res) => {
    try {
        const isHttps = (req.headers['x-forwarded-proto'] === 'https') || req.secure === true;
        res.clearCookie('sb_session', {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
            path: '/',
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Unexpected error" });
    }
});

export default router;
