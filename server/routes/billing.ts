import { Router } from "express";
import { getDb } from "../db";
import { teams } from "../../shared/schema/teams";
import { eq } from "drizzle-orm";
import { requireAuth, AuthenticatedRequest, setDbContext } from "../auth/middleware";
import Stripe from "stripe";

const router = Router();

// Initialize Stripe (lazy initialization to avoid errors if key is missing)
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            console.error("STRIPE_SECRET_KEY is not configured");
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }
        stripeClient = new Stripe(secretKey, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apiVersion: "2025-09-30.clover" as any, // Cast to avoid build issues while using newer API version
        });
    }
    return stripeClient;
}

// POST /checkout - Create Stripe Checkout session for Team Subscription
router.post("/checkout", requireAuth, setDbContext, async (req: AuthenticatedRequest, res) => {
    try {
        const userContext = req.userContext;
        if (!userContext || !userContext.teamId) {
            return res.status(403).json({ success: false, error: "No team context found" });
        }

        // Only Owners and admins can manage billing
        // Role check: Account Owner or Account Manager
        const allowedRoles = ['Account Owner', 'Account Manager'];
        if (!userContext.role || !allowedRoles.includes(userContext.role)) {
            return res.status(403).json({ success: false, error: "Insufficient permissions for billing" });
        }

        const teamId = userContext.teamId;

        // Validate request body (priceId is optional, defaults to env variable)
        const { priceId } = req.body;
        // Use TEAM_PLAN price ID, fallback to legacy env var if needed, or error
        const finalPriceId = priceId || process.env.STRIPE_PRICE_ID_TEAM_PLAN || process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

        if (!finalPriceId || typeof finalPriceId !== 'string') {
            return res.status(500).json({ success: false, error: "Server configuration error: Missing Price ID" });
        }

        // Get database connection
        const db = await getDb();

        // Fetch team data
        const team = await db
            .select()
            .from(teams)
            .where(eq(teams.id, teamId))
            .then(r => r[0]);

        if (!team) {
            return res.status(404).json({ success: false, error: "Team not found" });
        }

        // Initialize Stripe
        const stripe = getStripe();

        // Check if team already has a Stripe customer ID
        let stripeCustomerId: string | null = team.stripeCustomerId;

        if (!stripeCustomerId) {
            // Create new Stripe customer
            // We use the User's email for the Team customer initially, 
            // but ideally teams should have a billing email field.
            const customer = await stripe.customers.create({
                email: userContext.email, // Use current user's email as contact
                name: team.name,
                metadata: {
                    teamId: team.id,
                    createdByUserId: userContext.userId
                },
            });
            stripeCustomerId = customer.id;

            // Save customer ID to database
            await db
                .update(teams)
                .set({
                    stripeCustomerId: customer.id,
                    updatedAt: new Date(),
                })
                .where(eq(teams.id, team.id));
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
            // In a real app, you might want a specific billing page
            success_url: `${publicSiteUrl}/ops/settings/billing?success=true`,
            cancel_url: `${publicSiteUrl}/ops/settings/billing?canceled=true`,
            metadata: {
                teamId: team.id,
                userId: userContext.userId
            },
            subscription_data: {
                metadata: {
                    teamId: team.id
                }
            }
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

// GET /portal - Create Stripe Customer Portal session
router.get("/portal", requireAuth, setDbContext, async (req: AuthenticatedRequest, res) => {
    try {
        const userContext = req.userContext;
        if (!userContext || !userContext.teamId) {
            return res.status(403).json({ success: false, error: "No team context found" });
        }

        const teamId = userContext.teamId;
        const db = await getDb();

        const team = await db
            .select()
            .from(teams)
            .where(eq(teams.id, teamId))
            .then(r => r[0]);

        if (!team || !team.stripeCustomerId) {
            return res.status(400).json({ success: false, error: "No billing account found for this team" });
        }

        const stripe = getStripe();
        const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:5000';

        const session = await stripe.billingPortal.sessions.create({
            customer: team.stripeCustomerId,
            return_url: `${publicSiteUrl}/ops/settings/billing`,
        });

        return res.status(200).json({
            success: true,
            portalUrl: session.url,
        });
    } catch (err) {
        console.error('[billing/portal] Error:', err);
        return res.status(500).json({ success: false, error: "Failed to create portal session" });
    }
});

// POST /webhook - Stripe Webhook Handler
router.post("/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        console.error('Webhook Error: Missing signature or secret');
        return res.status(400).send('Webhook Error: Missing signature or secret');
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
        const rawBody = (req as unknown as { rawBody: Buffer }).rawBody || req.body;
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook signature verification failed: ${errorMessage}`);
        return res.status(400).send(`Webhook Error: ${errorMessage}`);
    }

    // Handle the event
    const db = await getDb();

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            // Retrieve the teamId from metadata
            const teamId = session.metadata?.teamId;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;

            if (teamId) {
                await db.update(teams)
                    .set({
                        stripeCustomerId: customerId, // Confirm it
                        stripeSubscriptionId: subscriptionId,
                        subscriptionStatus: 'active', // Assume active on success
                        updatedAt: new Date()
                    })
                    .where(eq(teams.id, teamId));
                console.log(`[Stripe Webhook] Subscription activated for team ${teamId}`);
            }
            break;
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // We need to find the team by stripeCustomerId
            const team = await db
                .select()
                .from(teams)
                .where(eq(teams.stripeCustomerId, customerId))
                .limit(1)
                .then(r => r[0]);

            if (team) {
                // Fix: Cast subscription to any to access current_period_end if typed incorrectly or just to be safe
                const currentPeriodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

                await db.update(teams)
                    .set({
                        stripeSubscriptionId: subscription.id,
                        subscriptionStatus: subscription.status,
                        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                        updatedAt: new Date()
                    })
                    .where(eq(teams.id, team.id));
                console.log(`[Stripe Webhook] Subscription updated for team ${team.id} (${subscription.status})`);
            }
            break;
        }
        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const team = await db
                .select()
                .from(teams)
                .where(eq(teams.stripeCustomerId, customerId))
                .limit(1)
                .then(r => r[0]);

            if (team) {
                await db.update(teams)
                    .set({
                        stripeSubscriptionId: null,
                        subscriptionStatus: 'canceled',
                        currentPeriodEnd: null,
                        updatedAt: new Date()
                    })
                    .where(eq(teams.id, team.id));
                console.log(`[Stripe Webhook] Subscription deleted for team ${team.id}`);
            }
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
});

export default router;
