import Fastify, { FastifyInstance } from 'fastify';
import { registerCreateStripePaymentSessionRoute } from '../src/routes/createStripeSessionRoute';
import request from 'supertest';
import Stripe from 'stripe';
import type { Mock } from 'jest-mock';

jest.mock('stripe', () => {
    const mockCreateSession = jest.fn();
    const mockStripe = jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                create: mockCreateSession,
            },
        },
    }));
    return mockStripe;
});

// const mockStripe = jest.requireMock('stripe') as unknown as Mock<typeof Stripe>
const mockStripe = jest.requireMock('stripe') as unknown as jest.Mock;
const mockCreateSession = mockStripe().checkout.sessions.create as jest.Mock;

describe('registerCreateStripePaymentSessionRoute', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        process.env.STRIPE_SECRET_KEY = 'test-stripe-secret-key';
        process.env.BASE_URL = 'http://localhost:3000';
        registerCreateStripePaymentSessionRoute(app);
        // Wait for Fastify to finish all initializations before running tests
        await app.ready();
    });

    beforeEach(() => {
        jest.resetModules();
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        process.env.GRAPHQL_API_KEY = 'graphql_api_key';
    });

    afterEach(async () => {
        jest.clearAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
    })

    afterAll(async () => {
        app.close();
        jest.resetAllMocks();
    });

    it('should return a 400 status code if required fields are missing', async () => {
        const response = await request(app.server)
            .post('/api/payment/create-session')
            .set('Content-Type', 'application/json')
            .send({});

        expect(response.status).toBe(400);

        // Adjusted expected error structure to match Fastify's validation error format
        expect(response.body).toHaveProperty('error', 'Bad Request');
        expect(response.body).toHaveProperty('message', 'body must have required property \'orderId\'');
        expect(response.body).toHaveProperty('statusCode', 400);
    });


    it('should return a 500 status code if Stripe secret key is missing', () => {
        delete process.env.STRIPE_SECRET_KEY;
        expect(() => registerCreateStripePaymentSessionRoute(Fastify())).toThrow(
            'STRIPE_SECRET_KEY environment variable is not set.'
        );
    });

    it('should create a payment session successfully', async () => {
        mockCreateSession.mockResolvedValue({
            url: 'https://checkout.stripe.com/test-session-url',
        });

        const response = await request(app.server)
            .post('/api/payment/create-session')
            .send({
                orderId: 'order123',
                amount: 1000, // Amount in cents
                paymentType: 'deposit',
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url', 'https://checkout.stripe.com/test-session-url');

        expect(mockCreateSession).toHaveBeenCalledWith({
            payment_method_types: [
                'card',
                'alipay',
                'cashapp',
                'link',
            ],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Order Payment - Deposit',
                        },
                        unit_amount: 100000,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: 'http://localhost:3000/payment-success?orderId=order123',
            cancel_url: 'http://localhost:3000/payment-cancel?orderId=order123',
        });
    });

    it('should handle errors from Stripe API gracefully', async () => {
        mockCreateSession.mockRejectedValue(new Error('Error creating payment session'));

        const response = await request(app.server)
            .post('/api/payment/create-session')
            .send({
                orderId: 'order123',
                amount: 1000,
                paymentType: 'full',
            });

        expect(response.statusCode).toBe(500);
        expect(JSON.stringify(response.body)).toBe(JSON.stringify({ error: 'Error creating payment session' }));
    });


    it('should validate paymentType correctly', async () => {
        const response = await request(app.server)
            .post('/api/payment/create-session')
            .send({
                orderId: 'order123',
                amount: 1000,
                paymentType: 'invalid-type',
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should validate amount as a positive number', async () => {
        const response = await request(app.server)
            .post('/api/payment/create-session')
            .send({
                orderId: 'order123',
                amount: -1000,
                paymentType: 'deposit',
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Bad Request');
    });
});
