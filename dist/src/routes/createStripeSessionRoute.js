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
exports.registerCreateStripePaymentSessionRoute = registerCreateStripePaymentSessionRoute;
// import { Storage } from '@google-cloud/storage'
// import mime from 'mime-types'
// import path from 'path'
// import fs from 'fs'
// import fastifyStatic from '@fastify/static'
const dotenv_1 = __importDefault(require("dotenv"));
const stripe_1 = __importDefault(require("stripe"));
dotenv_1.default.config();
function registerCreateStripePaymentSessionRoute(app) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set.');
    }
    const stripe = new stripe_1.default(stripeSecretKey, {
        apiVersion: '2024-10-28.acacia',
    });
    app.route({
        method: 'POST',
        url: '/api/payment/create-session',
        schema: {
            body: {
                type: 'object',
                required: ['orderId', 'amount', 'paymentType'],
                properties: {
                    orderId: { type: 'string' },
                    amount: { type: 'number', minimum: 1 },
                    paymentType: { type: 'string', enum: ['deposit', 'full'] },
                },
            },
        },
        handler: (req, reply) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { orderId, amount, paymentType } = (_a = req.body) !== null && _a !== void 0 ? _a : {}; // Fallback to an empty object if body is undefined
            // Validate required fields
            if (!orderId ||
                typeof orderId !== 'string' ||
                orderId.trim().length === 0) {
                return reply.status(400).send({ error: 'Invalid or missing orderId' });
            }
            if (!amount || typeof amount !== 'number' || amount <= 0) {
                return reply.status(400).send({ error: 'Invalid or missing amount' });
            }
            if (!['deposit', 'full'].includes(paymentType)) {
                return reply
                    .status(400)
                    .send({ error: 'Invalid or missing paymentType' });
            }
            try {
                const session = yield stripe.checkout.sessions.create({
                    payment_method_types: ['card', 'alipay', 'cashapp', 'link'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'usd',
                                product_data: {
                                    name: `Order Payment - ${paymentType === 'deposit' ? 'Deposit' : 'Full Amount'}`,
                                },
                                unit_amount: amount * 100, // Convert to cents
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'payment',
                    success_url: `${process.env.BASE_URL}/payment-success?orderId=${orderId}`,
                    cancel_url: `${process.env.BASE_URL}/payment-cancel?orderId=${orderId}`,
                });
                reply.send({ url: session.url });
            }
            catch (error) {
                // Check if the error is an instance of Error
                if (error instanceof Error) {
                    // Handle Stripe specific errors or generic errors
                    // console.error('Stripe Session Error:', error.message);
                    // Additional check for Stripe errors
                    if (error.statusCode) {
                        const stripeError = error;
                        console.error('Stripe Error Status Code:', stripeError.statusCode);
                    }
                    reply.status(500).send({ error: 'Error creating payment session' });
                }
                else {
                    // Handle unexpected errors (e.g., non-Error objects)
                    console.error('Unexpected Error:', error);
                    reply.status(500).send({ error: 'Unexpected error occurred' });
                }
            }
        }),
    });
}
