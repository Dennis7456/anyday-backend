import Mailjet from 'node-mailjet';
import { PrismaClient } from '@prisma/client';
const mailjet = Mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
const prisma = new PrismaClient();
async function sendPaymentConfirmationEmail(customerEmail, orderId) {
    try {
        // Fetch order details from the database
        const order = await prisma.order.findUnique({
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
          ${order.uploadedFiles.map(file => `<li>${file.name} - ${file.size} bytes</li>`).join('')}
          ${order.uploadedFiles.length > 0 ? '</ul>' : ''}
          <p>A writer will reach out to you shortly to begin working on your order.</p>
        `;
        const data = {
            Messages: [
                {
                    From: {
                        Email: "support@anydayessay.com",
                        Name: 'Any Day Essay Support'
                    },
                    To: [
                        {
                            Email: customerEmail
                        }
                    ],
                    Subject: 'Payment Received - Order Confirmation',
                    TextPart: `Your payment was received for order ${orderId}.`,
                    HTMLPart: orderDetailsHtml
                }
            ]
        };
        const response = await mailjet.post('send', { version: 'v3.1' }).request(data);
        console.log('Payment success email sent successfully:', response.body);
    }
    catch (error) {
        const e = error;
        console.error('Error sending payment confirmation email:', e.message);
        throw new Error('Failed to send payment confirmation email');
    }
}
export { sendPaymentConfirmationEmail };
