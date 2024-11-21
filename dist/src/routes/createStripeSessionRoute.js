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
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function registerCreateStripePaymentSessionRoute(app, stripeClient) {
    const stripe = stripeClient ||
        new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-11-20.acacia',
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
            const { orderId, amount, paymentType } = req.body;
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
                                unit_amount: amount * 100,
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
                reply.status(500).send({ error: 'Error creating payment session' });
                console.error(error);
            }
        }),
    });
}
