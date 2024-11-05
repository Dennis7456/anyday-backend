"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = exports.storage = void 0;
require("graphql-import-node");
const stripe_1 = __importDefault(require("stripe"));
const multer_1 = __importDefault(require("multer"));
const fastify_1 = __importDefault(require("fastify"));
const storage_1 = require("@google-cloud/storage");
const fastify_multer_1 = __importDefault(require("fastify-multer"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
// import cookiePlugin from 'fastify-cookie';
const cors_1 = __importDefault(require("@fastify/cors"));
const stream_1 = require("stream");
const graphql_helix_1 = require("graphql-helix");
const graphql_1 = require("graphql");
const graphql_request_1 = require("graphql-request");
const schema_1 = require("./schema");
const context_1 = require("./context");
const redisClient_1 = __importDefault(require("./redisClient"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const static_1 = __importDefault(require("@fastify/static"));
const sendPaymentConfirmationEmail_1 = require("./sendPaymentConfirmationEmail");
dotenv_1.default.config();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// Declare graphQLClient as a let variable to allow reassignment
let graphQLClient;
// GraphQL client for calling mutations
let GraphQLClient;
async function initialize() {
    try {
        // Dynamically import GraphQLClient from 'graphql-request'
        const { GraphQLClient: ImportedGraphQLClient } = await Promise.resolve().then(() => __importStar(require('graphql-request')));
        GraphQLClient = ImportedGraphQLClient;
        // Initialize graphQLClient
        graphQLClient = new GraphQLClient(process.env.GRAPHQL_API_URL, {
            headers: {
                Authorization: `Bearer ${process.env.GRAPHQL_API_TOKEN}`,
            },
        });
        console.log('GraphQL Client initialized');
    }
    catch (error) {
        console.error("Error initializing GraphQL client:", error instanceof Error ? error.message : error);
    }
}
// Call initialize early in your application
initialize().then(() => {
    // Now you can use graphQLClient for any GraphQL requests
    console.log('GraphQL Client initialized');
}).catch((error) => {
    console.error('Failed to initialize GraphQL Client:', error);
    process.exit(1); // Exit if GraphQL client initialization fails
});
if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
}
const stripe = new stripe_1.default(stripeSecretKey, { apiVersion: '2024-10-28.acacia' });
const localUploadDir = path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
// Define the createPayment and updateOrderStatus mutations
const CREATE_PAYMENT_MUTATION = (0, graphql_request_1.gql) `
  mutation CreatePayment($orderId: String!, $amount: Float!, $paymentStatus: PaymentStatus!, $transactionId: String!) {
    createPayment(orderId: $orderId, amount: $amount, paymentStatus: $paymentStatus, transactionId: $transactionId) {
      id
      amount
      paymentStatus
    }
  }
`;
const UPDATE_ORDER_STATUS_MUTATION = (0, graphql_request_1.gql) `
  mutation UpdateOrderStatus($orderId: String!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;
// Initialize Google Cloud Storage
exports.storage = new storage_1.Storage();
exports.bucket = exports.storage.bucket('anyday-essay-bucket');
// Multer setup for handling file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // Store file in memory
});
async function app() {
    const server = (0, fastify_1.default)({ logger: true });
    // server.register(FastifyMultipart);
    //Register fastify-cookie plugin
    // server.register(cookiePlugin as any);
    // CORS Configuration
    server.register(cors_1.default, {
        origin: [process.env.BASE_URL || 'https://anyday-frontend.web.app'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        // strictPreflight: true,
    });
    // Register @fastify/multipart
    server.register(multipart_1.default, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10 MB limit
        },
    });
    server.register(static_1.default, {
        root: localUploadDir,
        prefix: '/uploads/'
    });
    const upload = (0, fastify_multer_1.default)({ dest: localUploadDir });
    const port = Number(process.env.PORT) || 8080;
    // Handle preflight requests
    // server.options('*', (req, reply) => {
    //   reply.status(204).send();
    // });
    server.route({
        method: ['POST', 'GET'],
        url: '/graphql',
        handler: async (req, resp) => {
            const headers = new graphql_helix_1.Headers();
            for (const [key, value] of Object.entries(req.headers)) {
                if (Array.isArray(value)) {
                    value.forEach((v) => headers.append(key, v));
                }
                else if (value !== undefined) {
                    headers.append(key, value);
                }
            }
            // Helper function to convert Node.js Readable to ReadableStream<Uint8Array>
            function convertNodeReadableToWebReadable(readable) {
                return new ReadableStream({
                    start(controller) {
                        readable.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
                        readable.on('end', () => controller.close());
                        readable.on('error', (err) => controller.error(err));
                    },
                    cancel() {
                        readable.destroy();
                    }
                });
            }
            const body = req.body instanceof stream_1.Readable ? convertNodeReadableToWebReadable(req.body) : null;
            const request = {
                headers,
                method: req.method,
                body: body,
                query: typeof req.body === 'string' ? req.body : '',
            };
            const { operationName, query, variables } = (0, graphql_helix_1.getGraphQLParameters)(request);
            const result = await (0, graphql_helix_1.processRequest)({
                request: { headers, method: req.method, body, query },
                schema: schema_1.schema,
                operationName,
                contextFactory: () => (0, context_1.contextFactory)(req),
                query,
                variables,
            });
            if (result.type === "RESPONSE") {
                result.headers.forEach(({ name, value }) => {
                    resp.header(name, value);
                });
                resp.status(result.status).send(result.payload);
            }
            else {
                (0, graphql_helix_1.sendResult)(result, resp.raw);
            }
        },
    });
    // Server Status Endpoint
    server.route({
        method: ['POST', 'GET'],
        url: '/',
        handler: async (req, resp) => {
            try {
                resp.status(200).send("Server is running!");
            }
            catch (error) {
                console.error("Error:", error);
                resp.status(500).send("Internal Server Error");
            }
        },
    });
    // Email Verification Endpoint
    server.route({
        method: 'GET',
        url: '/verify-email',
        handler: async (req, reply) => {
            // Type assertion
            const query = req.query;
            const token = query.token;
            if (!token) {
                reply.status(400).send('Token is required');
                return;
            }
            try {
                // Execute GraphQL mutation directly
                const result = await (0, graphql_1.graphql)({
                    schema: schema_1.schema,
                    source: `
            mutation verifyEmail($token: String!) {
              verifyEmail(token: $token) {
                valid
                message
                redirectUrl
                token
              }
            }
          `,
                    variableValues: { token },
                    contextValue: await (0, context_1.contextFactory)(req),
                });
                if (result.errors) {
                    console.error("GraphQL Errors:", result.errors);
                    reply.status(400).send('Verification failed');
                    return;
                }
                // Safe type assertion and handling
                const data = result.data;
                if (data && typeof data === 'object' && 'verifyEmail' in data) {
                    const { valid, message, redirectUrl, token } = data.verifyEmail;
                    if (valid) {
                        // Return a JSON response with the redirect URL
                        // resp.status(200).send({ redirectUrl });
                        // reply.header('Set-Cookie', `token=${token}; Path=/; HttpOnly`);
                        reply.header('Set-Cookie', `token=${token}; Path=/;`);
                        reply.redirect(redirectUrl || '/');
                    }
                    else {
                        reply.status(400).send(message || 'Verification failed');
                    }
                }
                else {
                    reply.status(400).send('Invalid response structure');
                }
            }
            catch (error) {
                console.error("Verification Error:", error);
                reply.status(500).send('Internal Server Error');
            }
        },
    });
    //Retrieve information from redis
    server.route({
        method: 'POST',
        url: '/api/redis/user-data',
        handler: async (req, reply) => {
            const token = req.headers.authorization?.split(' ')[1];
            // console.log(req.headers)
            if (!token) {
                reply.status(401).send('Token is required');
                return;
            }
            try {
                const userData = await redisClient_1.default.get(token);
                if (userData) {
                    reply.send(JSON.parse(userData));
                }
                else {
                    reply.status(404).send('User data not found');
                }
            }
            catch (error) {
                console.log('Error fetching user data from Redis:', error);
                reply.status(500).send('Internal Server Error');
            }
        }
    });
    // File Upload Endpoint
    server.post('/api/upload/files', async (req, reply) => {
        try {
            const files = [];
            // Collect files from the request
            for await (const file of req.files()) {
                files.push(file);
            }
            if (files.length === 0) {
                return reply.status(400).send('No files uploaded.');
            }
            const uploadPromises = files.map(async (data) => {
                const { filename, file } = data;
                const mimetype = data.mimetype || 'application/octet-stream';
                if (process.env.NODE_ENV === 'development') {
                    // Save files locally during development
                    const uploadDir = path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
                    if (!fs_1.default.existsSync(uploadDir)) {
                        fs_1.default.mkdirSync(uploadDir, { recursive: true });
                    }
                    const localFilePath = path_1.default.join(uploadDir, filename);
                    const writeStream = fs_1.default.createWriteStream(localFilePath);
                    // Pipe the file stream to the local file system
                    file.pipe(writeStream);
                    return new Promise((resolve, reject) => {
                        writeStream.on('finish', () => {
                            const fileObject = {
                                id: `${Date.now()}-${filename}`, // Generate an ID
                                name: filename,
                                url: `/uploads/${encodeURIComponent(filename)}`,
                                size: fs_1.default.statSync(localFilePath).size.toString(), // Ensure size is a string
                                type: mimetype,
                            };
                            console.log(`File saved locally: ${localFilePath}`);
                            resolve(fileObject);
                        });
                        writeStream.on('error', (err) => {
                            console.error('Error saving file locally:', err);
                            reject(err);
                        });
                    });
                }
                else {
                    // In production, upload to Google Cloud Storage
                    const blob = exports.bucket.file(filename);
                    const blobStream = blob.createWriteStream({
                        resumable: true,
                        gzip: true,
                        metadata: {
                            contentType: mimetype,
                        }
                    });
                    return new Promise((resolve, reject) => {
                        blobStream.on('error', (err) => {
                            console.error('Error uploading file:', err);
                            reject(err);
                        });
                        blobStream.on('finish', async () => {
                            const publicUrl = `https://storage.cloud.google.com/${exports.bucket.name}/${blob.name}`;
                            const [metadata] = await blob.getMetadata();
                            const fileSize = metadata.size;
                            const fileObject = {
                                id: `${Date.now()}-${filename}`, // Generate an ID
                                name: filename,
                                url: publicUrl,
                                size: fileSize?.toString(), // Ensure size is a string
                                type: mimetype,
                            };
                            console.log(`File uploaded successfully: ${publicUrl}`);
                            resolve(fileObject);
                        });
                        file.pipe(blobStream);
                    });
                }
            });
            const uploadedFiles = await Promise.all(uploadPromises);
            reply.status(200).send({ uploadedFiles });
        }
        catch (error) {
            console.error('File upload error:', error);
            reply.status(500).send({ message: 'Internal Server Error' });
        }
    });
    // List Files Endpoint
    server.get('/api/files', async (req, reply) => {
        try {
            let fileUrls = [];
            if (process.env.NODE_ENV === 'production') {
                // Production: List files from Google Cloud Storage
                const [files] = await exports.bucket.getFiles(); // List all files
                fileUrls = files.map(file => {
                    return {
                        filename: file.name,
                        url: `https://storage.googleapis.com/${exports.bucket.name}/${file.name}`,
                    };
                });
            }
            else {
                // Development: List files from the local uploads directory
                const uploadDir = path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
                // Read the directory to get a list of files
                if (fs_1.default.existsSync(uploadDir)) {
                    const files = fs_1.default.readdirSync(uploadDir);
                    fileUrls = files.map(filename => {
                        return {
                            filename,
                            url: `${uploadDir}/${filename}`, // Local file path for development
                        };
                    });
                }
                else {
                    return reply.status(400).send('Upload directory not found.');
                }
            }
            // Send the list of files as a response
            reply.status(200).send(fileUrls);
        }
        catch (error) {
            console.error('Error listing files:', error);
            reply.status(500).send({ message: 'Internal Server Error' });
        }
    });
    // Route to access uploaded files
    server.get('/uploads/:filename', async (req, reply) => {
        const { filename } = req.params;
        const filePath = path_1.default.join(process.env.LOCAL_UPLOAD_DIR || './uploads', filename);
        try {
            // Check if the file exists
            if (!fs_1.default.existsSync(filePath)) {
                reply.status(404).send('File not found');
                return;
            }
            // Send the file
            return reply.sendFile(filename);
        }
        catch (error) {
            console.error('Error serving file:', error);
            reply.status(500).send('Internal Server Error');
        }
    });
    // Route to create a payment session
    server.post('/api/payment/create-session', async (req, reply) => {
        const { orderId, amount, paymentType } = req.body; // `amount` is in cents
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: [
                    'card',
                    'alipay',
                    // 'wechat_pay',
                    'cashapp',
                    'link'
                ],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Order Payment - ${paymentType === 'deposit' ? 'Deposit' : 'Full Amount'}`,
                            },
                            unit_amount: amount, // Amount in cents
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
            console.error('Stripe Session Error:', error);
            reply.status(500).send('Error creating payment session');
        }
    });
    // Middleware to parse the raw body for Stripe's webhook
    server.addHook('preParsing', (request, reply, payload, done) => {
        if (request.raw.url === '/webhooks/stripe' && request.headers['stripe-signature']) {
            let rawData = '';
            payload.on('data', (chunk) => {
                rawData += chunk;
            });
            payload.on('end', () => {
                request.rawBody = Buffer.from(rawData); // Set rawBody
                done(null, payload); // Pass the original payload
            });
        }
        else {
            done(null, payload);
        }
    });
    // Stripe webhook handler
    // Stripe webhook handler
    server.post('/webhooks/stripe', async (request, reply) => {
        const sig = request.headers['stripe-signature'];
        try {
            const event = stripe.webhooks.constructEvent(request.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object;
                const orderId = session.client_reference_id || '';
                const customerEmail = session.customer_email || '';
                const transactionId = session.id;
                const amount = session.amount_total || 0;
                console.log('Session details:', { orderId, customerEmail, transactionId, amount });
                if (graphQLClient) {
                    try { // Call createPayment mutation
                        await graphQLClient.request(CREATE_PAYMENT_MUTATION, {
                            orderId,
                            amount,
                            paymentStatus: 'COMPLETED',
                            transactionId,
                        });
                        // Call updateOrderStatus mutation
                        await graphQLClient.request(UPDATE_ORDER_STATUS_MUTATION, {
                            orderId,
                            status: 'IN_PROGRESS',
                        });
                    }
                    catch (GraphQLError) {
                        console.error('GraphQL Client not initialized');
                    }
                }
                else {
                    console.error('GraphQL Client not initialized');
                }
                // Send confirmation email after successfully creating the payment and updating order status
                await (0, sendPaymentConfirmationEmail_1.sendPaymentConfirmationEmail)(customerEmail, orderId); // Move this line inside the if block
            }
            reply.send({ received: true });
        }
        catch (error) {
            console.error('Webhook error:', error);
            reply.status(400).send(`Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    // Define your updateOrderStatus and sendConfirmationEmail functions
    async function updateOrderStatus(orderId, status) {
        // Update the order in your database based on orderId
        console.log(`Updating order ${orderId} to status ${status}`);
    }
    // async function sendPaymentConfirmationEmail(email: string) {
    //   // Send a confirmation email to the customer
    //   console.log(`Sending confirmation email to ${email}`);
    // }
    try {
        const address = await server.listen({ port: port, host: '0.0.0.0' });
        console.log(`Server listening at ${address}`);
    }
    catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}
app().catch(error => {
    console.error("Error in app initialization:", error instanceof Error ? error.message : error);
    process.exit(1); // Optionally exit the process if initialization fails
});
;
