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
exports.sendVerificationEmail = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Initialize Mailjet client with your API keys
const mailjet = node_mailjet_1.default.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
const sendVerificationEmail = (to, verificationToken) => __awaiter(void 0, void 0, void 0, function* () {
    const backEndUrl = process.env.BACKEND_URL
        ? process.env.BACKEND_URL
        : 'https://anyday-backend-service-969666510139.us-central1.run.app';
    const verificationLink = `${backEndUrl}/verify-email?token=${verificationToken}`;
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
                Subject: 'Verify Your Email',
                TextPart: `Please verify your email by clicking the following link: ${verificationLink}`,
                HTMLPart: `<p>Please verify your email by clicking the following link: <a href="${verificationLink}">Verify Email</a></p>`,
            },
        ],
    };
    console.log('Verification Link', verificationLink);
    console.log('Data: ', data);
    try {
        const response = yield mailjet
            .post('send', { version: 'v3.1' })
            .request(data);
        console.log('Verification email sent successfully:', response.body);
    }
    catch (error) {
        // Type assertion to `Error`
        const e = error;
        console.error('Error sending verification email:', e.message);
        throw new Error('Failed to send verification email');
    }
});
exports.sendVerificationEmail = sendVerificationEmail;
