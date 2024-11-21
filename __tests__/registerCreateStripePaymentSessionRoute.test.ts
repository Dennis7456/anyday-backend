jest.mock('stripe', () => {
    const mockCreateSession = jest.fn();
    const mockStripe = jest.fn().mockImplementation(() => ({
        checkout: { sessions: { create: mockCreateSession } },
    }));
    return mockStripe;
});

import Fastify, { FastifyInstance } from 'fastify';
import { registerCreateStripePaymentSessionRoute } from '../src/routes/createStripeSessionRoute';
import Stripe from 'stripe';
import request from 'supertest';

const mockStripe = jest.requireMock('stripe') as jest.Mock;
const mockCreateSession = mockStripe().checkout.sessions.create as jest.Mock;

describe('registerCreateStripePaymentSessionRoute', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        process.env.STRIPE_SECRET_KEY = 'test-stripe-secret-key';
        process.env.BASE_URL = 'http://localhost:3000';

        const mockedStripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-11-20.acacia' });
        registerCreateStripePaymentSessionRoute(app, mockedStripeClient);

        await app.ready();
    });

    afterAll(async () => {
        await app.close();
        jest.clearAllMocks();
    });

    it('should create a payment session successfully', async () => {
        mockCreateSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/test-session-url' });

        const response = await request(app.server)
            .post('/api/payment/create-session')
            .send({ orderId: 'order123', amount: 1000, paymentType: 'deposit' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('url', 'https://checkout.stripe.com/test-session-url');
        expect(mockCreateSession).toHaveBeenCalledWith({
            payment_method_types: ['card', 'alipay', 'cashapp', 'link'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Order Payment - Deposit' },
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
});
