"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const stripeWebHookHandlerRoute_1 = require("../src/routes/stripeWebHookHandlerRoute");
const stripeClient_1 = require("../src/routes/client/stripeClient");
const sendPaymentConfirmationEmail_1 = require("../src/services/sendPaymentConfirmationEmail");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const nock_1 = __importDefault(require("nock"));
jest.mock('../src/routes/client/stripeClient', () => ({
    stripe: {
        webhooks: {
            constructEvent: jest.fn(),
        },
    },
}));
jest.mock('../src/services/sendPaymentConfirmationEmail');
describe('Stripe Webhook Handler', () => {
    let app;
    let mockedApolloClient;
    const MOCK_MUTATION = (0, graphql_tag_1.default) `
    mutation MockMutation($id: String!) {
      mockField(id: $id)
    }
  `;
    beforeAll(() => {
        app = (0, fastify_1.default)();
        mockedApolloClient = {
            mutate: jest.fn(),
        };
        (0, nock_1.default)('http://localhost:8080')
            .post('/graphql')
            .reply(200, {
            data: { mockField: 'mock-id' },
        });
        nock_1.default.disableNetConnect();
        nock_1.default.enableNetConnect('127.0.0.1');
        (0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(app, mockedApolloClient);
    });
    afterAll(() => {
        app.close();
        nock_1.default.enableNetConnect();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('ApolloClient mutate is mocked', () => {
        expect(mockedApolloClient.mutate).toBeDefined();
        expect(jest.isMockFunction(mockedApolloClient.mutate)).toBe(true);
    });
    test('should process checkout.session.completed event successfully', () => __awaiter(void 0, void 0, void 0, function* () {
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
        stripeClient_1.stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
        mockedApolloClient.mutate
            .mockResolvedValueOnce({
            data: { createPayment: { id: 'payment_id', amount: 20.0, paymentStatus: 'COMPLETED' } },
        })
            .mockResolvedValueOnce({
            data: { updateOrderStatus: { id: 'order_id', status: 'IN_PROGRESS' } },
        });
        sendPaymentConfirmationEmail_1.sendPaymentConfirmationEmail.mockResolvedValueOnce(undefined);
        const response = yield app.inject({
            method: 'POST',
            url: '/webhooks/stripe',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'valid_signature',
            },
            payload: JSON.stringify(mockEvent),
        });
        expect(response.statusCode).toBe(200);
        expect(stripeClient_1.stripe.webhooks.constructEvent).toHaveBeenCalledWith(JSON.stringify(mockEvent), 'valid_signature', process.env.STRIPE_WEBHOOK_SECRET);
        expect(mockedApolloClient.mutate).toHaveBeenCalledTimes(2);
        expect(sendPaymentConfirmationEmail_1.sendPaymentConfirmationEmail).toHaveBeenCalledWith('customer@example.com', 'order_id');
    }));
    // Update other tests similarly to use mockedApolloClient
});
