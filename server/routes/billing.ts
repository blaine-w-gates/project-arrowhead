import { Router } from "express";
import { getDb } from "../db";
import { users, userSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifyJwt } from "../auth/jwt";
import Stripe from "stripe";

const router = Router();

// Initialize Stripe (lazy initialization to avoid errors if key is missing)
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }
        stripeClient = new Stripe(secretKey, {
            apiVersion: "2025-01-27.acacia" as any,
        });
    }
    return stripeClient;
}

// POST /checkout - Create Stripe Checkout session
router.post("/checkout", async (req, res) => {
    try {
        // Authenticate user
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

        // Validate request body (priceId is optional, defaults to env variable)
        const { priceId } = req.body;
        const finalPriceId = priceId || process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

        if (!finalPriceId || typeof finalPriceId !== 'string') {
            return res.status(400).json({ success: false, error: "priceId is required" });
        }

        // Get database connection
        const db = await getDb();

        // Fetch user data
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(userId, 10)))
            .then(r => r[0]);

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // Initialize Stripe
        const stripe = getStripe();

        // Check if user already has a Stripe customer ID
        let stripeCustomerId: string | null = null;
        const subscription = await db
            .select()
            .from(userSubscriptions)
            .where(eq(userSubscriptions.userId, user.id))
            .then(r => r[0]);

        if (subscription?.stripeCustomerId) {
            stripeCustomerId = subscription.stripeCustomerId;
        } else {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id.toString(),
                },
            });
            stripeCustomerId = customer.id;

            // Save customer ID to database
            if (subscription) {
                // Update existing subscription record
                await db
                    .update(userSubscriptions)
                    .set({
                        stripeCustomerId: customer.id,
                        updatedAt: new Date(),
                    })
                    .where(eq(userSubscriptions.userId, user.id));
            } else {
                // Create new subscription record
                await db.insert(userSubscriptions).values({
                    userId: user.id,
                    stripeCustomerId: customer.id,
                    status: 'none',
                });
            }
        }

        // Get public site URL for redirect URLs
        const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:5000';

        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: finalPriceId,
                    quantity: 1,
                },
            ],
            success_url: `${publicSiteUrl}/account?success=true`,
            cancel_url: `${publicSiteUrl}/account?canceled=true`,
            metadata: {
                userId: user.id.toString(),
            },
        });

        return res.status(200).json({
            success: true,
            url: session.url,
        });
    } catch (err) {
        console.error('[billing/checkout] Error:', err);
        return res.status(500).json({ success: false, error: "Failed to create checkout session" });
    }
});

// GET /portal - Redirect to Stripe Customer Portal (stub)
router.get("/portal", async (req, res) => {
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

        // TODO: Create actual Stripe Customer Portal session and redirect
        // For now, return a stub response
        return res.status(200).json({
            success: true,
            portalUrl: "https://stripe.com/portal/stub",
            message: "Stripe integration not yet implemented"
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Unexpected error" });
    }
});

export default router;
