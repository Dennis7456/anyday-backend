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
exports.registerStripeWebHookHandlerRoute = registerStripeWebHookHandlerRoute;
const stripeClient_1 = require("./client/stripeClient");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const sendPaymentConfirmationEmail_1 = require("../services/sendPaymentConfirmationEmail");
// import fetch from 'cross-fetch';
const dotenv_1 = __importDefault(require("dotenv"));
const http_status_codes_1 = require("http-status-codes");
dotenv_1.default.config();
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const backendUrl = process.env.BACKEND_URL;
if (!stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set.');
}
if (!backendUrl) {
    throw new Error('BACKEND_URL environment variable is not set.');
}
const webhookSecret = stripeWebhookSecret;
function registerStripeWebHookHandlerRoute(app, apolloClient) {
    return __awaiter(this, void 0, void 0, function* () {
        app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
            ;
            req.rawBody = body;
            try {
                const json = JSON.parse(body);
                done(null, json);
            }
            catch (err) {
                const error = err;
                error.message = 'Invalid JSON';
                error.statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
                done(error, undefined);
            }
        });
        // const apolloClient = new ApolloClient({
        //   link: new HttpLink({
        //     uri: backendUrl,
        //     fetch,
        //     headers: {
        //       authorization: `Bearer ${process.env.GRAPHQL_API_KEY}`,
        //     },
        //   }),
        //   cache: new InMemoryCache(),
        // });
        const CREATE_PAYMENT_MUTATION = (0, graphql_tag_1.default) `
    mutation CreatePayment(
      $orderId: String!
      $amount: Float!
      $paymentStatus: PaymentStatus!
      $transactionId: String!
    ) {
      createPayment(
        orderId: $orderId
        amount: $amount
        paymentStatus: $paymentStatus
        transactionId: $transactionId
      ) {
        id
        amount
        paymentStatus
      }
    }
  `;
        const UPDATE_ORDER_STATUS_MUTATION = (0, graphql_tag_1.default) `
    mutation UpdateOrderStatus($orderId: String!, $status: OrderStatus!) {
      updateOrderStatus(orderId: $orderId, status: $status) {
        id
        status
      }
    }
  `;
        app.post('/webhooks/stripe', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const sig = request.headers['stripe-signature'];
            if (!sig || typeof sig !== 'string') {
                reply
                    .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
                    .send('Missing or invalid Stripe signature.');
                return;
            }
            const rawBody = request.rawBody;
            if (!rawBody) {
                reply.status(http_status_codes_1.StatusCodes.BAD_REQUEST).send('No raw body provided.');
                return;
            }
            try {
                const event = stripeClient_1.stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
                switch (event.type) {
                    case 'checkout.session.completed': {
                        const session = event.data.object;
                        const orderId = session.client_reference_id || '';
                        const customerEmail = session.customer_email || '';
                        const transactionId = session.id;
                        const amount = (session.amount_total || 0) / 100;
                        console.log('Processing checkout.session.completed event:', {
                            orderId,
                            customerEmail,
                            transactionId,
                            amount,
                        });
                        try {
                            yield apolloClient.mutate({
                                mutation: CREATE_PAYMENT_MUTATION,
                                variables: {
                                    orderId,
                                    amount,
                                    paymentStatus: 'COMPLETED',
                                    transactionId,
                                },
                            });
                            yield apolloClient.mutate({
                                mutation: UPDATE_ORDER_STATUS_MUTATION,
                                variables: {
                                    orderId,
                                    status: 'IN_PROGRESS',
                                },
                            });
                            yield (0, sendPaymentConfirmationEmail_1.sendPaymentConfirmationEmail)(customerEmail, orderId);
                        }
                        catch (error) {
                            console.error('Error processing GraphQL or email:', error);
                            reply
                                .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
                                .send('Internal server error.');
                            return;
                        }
                        break;
                    }
                    default:
                        console.log(`Received unsupported event type: ${event.type}`);
                        break;
                }
                reply.status(http_status_codes_1.StatusCodes.OK).send({ received: true });
            }
            catch (error) {
                console.error('Webhook error:', error);
                reply.status(http_status_codes_1.StatusCodes.BAD_REQUEST).send({
                    error: `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
            }
        }));
    });
}
