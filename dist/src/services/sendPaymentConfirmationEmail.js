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
exports.sendPaymentConfirmationEmail = sendPaymentConfirmationEmail;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
const client_1 = require("@prisma/client");
const mailjet = node_mailjet_1.default.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
const prisma = new client_1.PrismaClient();
function sendPaymentConfirmationEmail(customerEmail, orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Fetch order details from the database
            const order = yield prisma.order.findUnique({
                where: { id: orderId },
                include: { uploadedFiles: true }, // Include files if necessary
            });
            if (!order) {
                console.error(`Order with ID ${orderId} not found.`);
                throw new Error('Order not found');
            }
            // Build order details to include in the email
            const orderDetailsHtml = `
          <p>Thank you for your payment! Here are the details of your order:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Paper Type:</strong> ${order.paperType}</li>
            <li><strong>Number of Pages:</strong> ${order.numberOfPages}</li>
            <li><strong>Due Date:</strong> ${order.dueDate}</li>
            <li><strong>Total Amount:</strong> $${order.totalAmount}</li>
            <li><strong>Status:</strong> ${order.status}</li>
          </ul>
          ${order.uploadedFiles.length > 0 ? '<p>Attached Files:</p><ul>' : ''}
          ${order.uploadedFiles.map((file) => `<li>${file.name} - ${file.size} bytes</li>`).join('')}
          ${order.uploadedFiles.length > 0 ? '</ul>' : ''}
          <p>A writer will reach out to you shortly to begin working on your order.</p>
        `;
            const data = {
                Messages: [
                    {
                        From: {
                            Email: 'support@anydayessay.com',
                            Name: 'Any Day Essay Support',
                        },
                        To: [
                            {
                                Email: customerEmail,
                            },
                        ],
                        Subject: 'Payment Received - Order Confirmation',
                        TextPart: `Your payment was received for order ${orderId}.`,
                        HTMLPart: orderDetailsHtml,
                    },
                ],
            };
            const response = yield mailjet
                .post('send', { version: 'v3.1' })
                .request(data);
            console.log('Payment success email sent successfully:', response.body);
        }
        catch (error) {
            const e = error;
            console.error('Error sending payment confirmation email:', e.message);
            throw new Error('Failed to send payment confirmation email');
        }
    });
}
