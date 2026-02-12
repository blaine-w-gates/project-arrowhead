
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import * as dbModule from '../../server/db';
import * as middlewareModule from '../../server/auth/middleware';

// Auto-mock DB module
vi.mock('../../server/db');

// Mock Stripe
const mockStripe = {
    customers: {
        create: vi.fn(),
    },
    checkout: {
        sessions: {
            create: vi.fn(),
        },
    },
    billingPortal: {
        sessions: {
            create: vi.fn(),
        },
    },
    webhooks: {
        constructEvent: vi.fn(),
    },
};

vi.mock('stripe', () => {
    return {
        default: class MockStripe {
            customers = mockStripe.customers;
            checkout = mockStripe.checkout;
            billingPortal = mockStripe.billingPortal;
            webhooks = mockStripe.webhooks;
            constructor(_key: string, _config: any) {
                // Constructor mock if needed
            }
        },
    };
});

// Partial mock of middleware
vi.mock('../../server/auth/middleware', async (importOriginal) => {
    const actual = await importOriginal<typeof middlewareModule>();
    return {
        ...actual,
        requireAuth: vi.fn((req, res, _next) => {
            // Default to unauthorized unless overridden
            res.status(401).json({ error: 'Unauthorized' });
            return Promise.resolve();
        }),
        setDbContext: vi.fn((req, res, next) => next()),
    };
});

// Import router AFTER mocks
import billingRouter from '../../server/routes/billing';

describe('Billing API', () => {
    let app: Express;

    // Split mocks: Client is NOT thenable. QueryBuilder IS thenable.
    let mockClient: any;
    let mockQueryBuilder: any;

    const teamId = 'team-123';
    const userId = 'user-123';
    const email = 'test@example.com';

    beforeAll(() => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.STRIPE_PRICE_ID_TEAM_PLAN = 'price_mock';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

        app = express();
        app.use(express.json());
        app.use('/api/billing', billingRouter);
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup QueryBuilder (Thenable)
        mockQueryBuilder = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            // Default: resolve to empty array
            then: vi.fn((resolve: (value: any) => void) => resolve([])),
        };

        // Setup Client (NOT Thenable)
        mockClient = {
            select: vi.fn(() => mockQueryBuilder),
            update: vi.fn(() => mockQueryBuilder),
            insert: vi.fn(() => mockQueryBuilder),
            delete: vi.fn(() => mockQueryBuilder),
            // NO 'then' method on client!
        };

        // Override getDb to return our mockClient
        vi.mocked(dbModule.getDb).mockReturnValue(mockClient as never);

        // Default Auth Middleware Mock (Unauthorized)
        vi.mocked(middlewareModule.requireAuth).mockImplementation((req, res, _next) => {
            res.status(401).json({ error: 'Unauthorized' });
            return Promise.resolve();
        });
    });

    describe('POST /api/billing/checkout', () => {
        it('Requires authentication', async () => {
            const res = await request(app).post('/api/billing/checkout');
            expect(res.status).toBe(401);
        });

        it('Requires Account Owner/Manager role', async () => {
            vi.mocked(middlewareModule.requireAuth).mockImplementation((req, res, next) => {
                (req as any).userContext = { userId, teamId, role: 'Team Member', email };
                next();
                return Promise.resolve();
            });

            const res = await request(app).post('/api/billing/checkout');
            expect(res.status).toBe(403);
        });

        it('Creates session for existing customer', async () => {
            vi.mocked(middlewareModule.requireAuth).mockImplementation((req, res, next) => {
                (req as any).userContext = { userId, teamId, role: 'Account Owner', email };
                next();
                return Promise.resolve();
            });

            // Override 'then' on QueryBuilder to return specific data as ARRAY
            mockQueryBuilder.then.mockImplementation((resolve: (value: any) => void) => resolve([{
                id: teamId,
                stripeCustomerId: 'cus_existing',
                name: 'Test Team'
            }]));

            mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/mock' });

            const res = await request(app).post('/api/billing/checkout');

            expect(res.status).toBe(200);
            expect(res.body.url).toBe('https://checkout.stripe.com/mock');
            expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                customer: 'cus_existing'
            }));
        });

        it('Creates new customer then session if no customer ID', async () => {
            vi.mocked(middlewareModule.requireAuth).mockImplementation((req, res, next) => {
                (req as any).userContext = { userId, teamId, role: 'Account Owner', email };
                next();
                return Promise.resolve();
            });

            // Mock DB: Team found WITHOUT Stripe Customer ID (as ARRAY)
            mockQueryBuilder.then.mockImplementation((resolve: (value: any) => void) => resolve([{
                id: teamId,
                stripeCustomerId: null,
                name: 'Test Team'
            }]));

            mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
            mockStripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/mock' });

            const res = await request(app).post('/api/billing/checkout');

            expect(res.status).toBe(200);
            expect(mockStripe.customers.create).toHaveBeenCalled();
            expect(mockClient.update).toHaveBeenCalled(); // Check client call
            expect(mockQueryBuilder.set).toHaveBeenCalled(); // Check builder call
            expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                customer: 'cus_new'
            }));
        });
    });

    describe('POST /api/billing/webhook', () => {
        it('Verifies signature', async () => {
            const res = await request(app)
                .post('/api/billing/webhook')
                .send({});

            expect(res.status).toBe(400);
            expect(res.text).toContain('Missing signature');
        });

        it('Handles checkout.session.completed', async () => {
            const event = {
                type: 'checkout.session.completed',
                data: {
                    object: {
                        customer: 'cus_123',
                        subscription: 'sub_123',
                        metadata: { teamId },
                    },
                },
            };
            mockStripe.webhooks.constructEvent.mockReturnValue(event);

            const res = await request(app)
                .post('/api/billing/webhook')
                .set('stripe-signature', 'valid_sig')
                .send(event);

            expect(res.status).toBe(200);
            expect(mockClient.update).toHaveBeenCalled();
            expect(mockQueryBuilder.set).toHaveBeenCalledWith(expect.objectContaining({
                stripeCustomerId: 'cus_123',
                stripeSubscriptionId: 'sub_123',
                subscriptionStatus: 'active'
            }));
        });
    });
});
