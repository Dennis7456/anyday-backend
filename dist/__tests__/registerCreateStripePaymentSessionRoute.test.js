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
const createStripeSessionRoute_1 = require("../src/routes/createStripeSessionRoute");
const supertest_1 = __importDefault(require("supertest"));
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
const mockStripe = jest.requireMock('stripe');
const mockCreateSession = mockStripe().checkout.sessions.create;
describe('registerCreateStripePaymentSessionRoute', () => {
    let app;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        app = (0, fastify_1.default)();
        process.env.STRIPE_SECRET_KEY = 'test-stripe-secret-key';
        process.env.BASE_URL = 'http://localhost:3000';
        (0, createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute)(app);
        // Wait for Fastify to finish all initializations before running tests
        yield app.ready();
    }));
    beforeEach(() => {
        jest.resetModules();
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
        process.env.GRAPHQL_API_KEY = 'graphql_api_key';
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        jest.clearAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        app.close();
        jest.resetAllMocks();
    }));
    it('should return a 400 status code if required fields are missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app.server)
            .post('/api/payment/create-session')
            .set('Content-Type', 'application/json')
            .send({});
        expect(response.status).toBe(400);
        // Adjusted expected error structure to match Fastify's validation error format
        expect(response.body).toHaveProperty('error', 'Bad Request');
        expect(response.body).toHaveProperty('message', 'body must have required property \'orderId\'');
        expect(response.body).toHaveProperty('statusCode', 400);
    }));
    it('should return a 500 status code if Stripe secret key is missing', () => {
        delete process.env.STRIPE_SECRET_KEY;
        expect(() => (0, createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute)((0, fastify_1.default)())).toThrow('STRIPE_SECRET_KEY environment variable is not set.');
    });
    it('should create a payment session successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        mockCreateSession.mockResolvedValue({
            url: 'https://checkout.stripe.com/test-session-url',
        });
        const response = yield (0, supertest_1.default)(app.server)
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
    }));
    it('should handle errors from Stripe API gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
        mockCreateSession.mockRejectedValue(new Error('Error creating payment session'));
        const response = yield (0, supertest_1.default)(app.server)
            .post('/api/payment/create-session')
            .send({
            orderId: 'order123',
            amount: 1000,
            paymentType: 'full',
        });
        expect(response.statusCode).toBe(500);
        expect(JSON.stringify(response.body)).toBe(JSON.stringify({ error: 'Error creating payment session' }));
    }));
    it('should validate paymentType correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app.server)
            .post('/api/payment/create-session')
            .send({
            orderId: 'order123',
            amount: 1000,
            paymentType: 'invalid-type',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Bad Request');
    }));
    it('should validate amount as a positive number', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app.server)
            .post('/api/payment/create-session')
            .send({
            orderId: 'order123',
            amount: -1000,
            paymentType: 'deposit',
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Bad Request');
    }));
});
