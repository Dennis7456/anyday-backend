"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderSuccessEmail = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
// Initialize Mailjet client with your API keys
const mailjet = node_mailjet_1.default.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
const sendOrderSuccessEmail = async (to, instructions, paperType, numberOfPages, dueDate, totalAmount, depositAmount, status, uploadedFiles) => {
    // Create a string representation of the uploaded files
    const uploadedFilesList = uploadedFiles
        .map((file) => `<li><a href="${file.url}">${file.name}</a></li>`)
        .join('');
    const data = {
        Messages: [
            {
                From: {
                    Email: 'support@anydayessay.com',
                    Name: 'Any Day Essay Support',
                },
                To: [
                    {
                        Email: to,
                    },
                ],
                Subject: 'Your Order Has Been Created Successfully!',
                TextPart: `Your order has been successfully created! 
        \n\nOrder Details:
        \n- Paper Type: ${paperType}
        \n- Instructions: ${instructions}
        \n- Number of Pages: ${numberOfPages}
        \n- Due Date: ${dueDate}
        \n- Total Amount: $${totalAmount}
        \n- Deposit Amount: $${depositAmount}
        \n- Status: ${status}
        \n\nUploaded Files:
        \n${uploadedFiles.map((file) => `${file.name}: ${file.url}`).join('\n')}
        
        Please login to your account to view and manage your order.`,
                HTMLPart: `
        <div style="text-align: center;">
          <img src="https://anydayessay.com/media/logo.png" alt="Logo" style="width: 150px; height: auto;"/>
          <h1>Order Created Successfully</h1>
        </div>
        <ul>
          <li><strong>Paper Type:</strong> ${paperType}</li>
          <li><strong>Instructions:</strong> ${instructions}</li>
          <li><strong>Number of Pages:</strong> ${numberOfPages}</li>
          <li><strong>Due Date:</strong> ${dueDate}</li>
          <li><strong>Total Amount:</strong> $${totalAmount}</li>
          <li><strong>Deposit Amount:</strong> $${depositAmount}</li>
          <li><strong>Status:</strong> ${status}</li>
        </ul>
        <p><strong>Uploaded Files:</strong></p>
        <ul>${uploadedFilesList}</ul>
        <p>Dear User, your order has been created successfully. Please <a href="https://anydayessay.com">log in</a> to view your order details.</p>`,
            },
        ],
    };
    console.log(data);
    try {
        const response = await mailjet.post('send', { version: 'v3.1' }).request(data);
        console.log('Order success email sent successfully:', response.body);
    }
    catch (error) {
        const e = error;
        console.error('Error sending order success email:', e.message);
        throw new Error('Failed to send order success email');
    }
};
exports.sendOrderSuccessEmail = sendOrderSuccessEmail;
