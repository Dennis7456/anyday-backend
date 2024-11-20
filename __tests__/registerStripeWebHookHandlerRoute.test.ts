import fastify, { FastifyInstance } from 'fastify';
import { registerStripeWebHookHandlerRoute } from '../src/routes/stripeWebHookHandlerRoute';
import { stripe } from '../src/routes/client/stripeClient';
import { ApolloClient } from '@apollo/client/core';
import { sendPaymentConfirmationEmail } from '../src/services/sendPaymentConfirmationEmail';
import gql from 'graphql-tag';
import nock from 'nock';

jest.mock('../src/routes/client/stripeClient', () => ({
    stripe: {
        webhooks: {
            constructEvent: jest.fn(),
        },
    },
}));

jest.mock('../src/services/sendPaymentConfirmationEmail');

describe('Stripe Webhook Handler', () => {
    let app: FastifyInstance;
    let mockedApolloClient: ApolloClient<any>;
    const MOCK_MUTATION = gql`
    mutation MockMutation($id: String!) {
      mockField(id: $id)
    }
  `;

    beforeAll(() => {
        app = fastify();
        mockedApolloClient = {
            mutate: jest.fn(),
        } as unknown as ApolloClient<any>;

        nock('http://localhost:8080')
            .post('/graphql')
            .reply(200, {
                data: { mockField: 'mock-id' },
            });
        nock.disableNetConnect();
        nock.enableNetConnect('127.0.0.1');

        registerStripeWebHookHandlerRoute(app, mockedApolloClient);
    });

    afterAll(() => {
        app.close();
        nock.enableNetConnect();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ApolloClient mutate is mocked', () => {
        expect(mockedApolloClient.mutate).toBeDefined();
        expect(jest.isMockFunction(mockedApolloClient.mutate)).toBe(true);
    });

    test('should process checkout.session.completed event successfully', async () => {
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'order_id',
                    customer_email: 'customer@example.com',
                    id: 'txn_123456789',
                    amount_total: 2000, // 20.00 USD
                },
            },
        };

        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
        (mockedApolloClient.mutate as jest.Mock)
            .mockResolvedValueOnce({
                data: { createPayment: { id: 'payment_id', amount: 20.0, paymentStatus: 'COMPLETED' } },
            })
            .mockResolvedValueOnce({
                data: { updateOrderStatus: { id: 'order_id', status: 'IN_PROGRESS' } },
            });
        (sendPaymentConfirmationEmail as jest.Mock).mockResolvedValueOnce(undefined);

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/stripe',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'valid_signature',
            },
            payload: JSON.stringify(mockEvent),
        });

        expect(response.statusCode).toBe(200);
        expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
            JSON.stringify(mockEvent),
            'valid_signature',
            process.env.STRIPE_WEBHOOK_SECRET
        );
        expect(mockedApolloClient.mutate).toHaveBeenCalledTimes(2);
        expect(sendPaymentConfirmationEmail).toHaveBeenCalledWith('customer@example.com', 'order_id');
    });

    // Update other tests similarly to use mockedApolloClient
});
