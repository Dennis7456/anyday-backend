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
exports.sendOrderSuccessEmail = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mailjetClient = node_mailjet_1.default.apiConnect(process.env.MAILJET_API_KEY || '', process.env.MAILJET_SECRET_KEY || '');
const sendOrderSuccessEmail = (to, instructions, paperType, numberOfPages, dueDate, totalAmount, depositAmount, status, uploadedFiles) => __awaiter(void 0, void 0, void 0, function* () {
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
                HTMLPart: `
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
          <ul>${uploadedFilesList}</ul>`,
            },
        ],
    };
    try {
        const response = yield mailjetClient
            .post('send', { version: 'v3.1' })
            .request(data);
        console.log('Order success email sent successfully:', response.body);
    }
    catch (error) {
        console.error('Error sending order success email:', error.message);
        throw new Error('Failed to send order success email');
    }
});
exports.sendOrderSuccessEmail = sendOrderSuccessEmail;
