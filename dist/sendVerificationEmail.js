"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
// Initialize Mailjet client with your API keys
const mailjet = node_mailjet_1.default.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
const sendVerificationEmail = async (to, verificationToken) => {
    const backEndUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL : 'https://anyday-backend-app-hufozn77kq-uc.a.run.app';
    const verificationLink = `${backEndUrl}/verify-email?token=${verificationToken}`;
    const data = {
        Messages: [
            {
                From: {
                    Email: "charlottewritesessays@gmail.com",
                    Name: 'AnyDayEssay'
                },
                To: [
                    {
                        Email: to
                    }
                ],
                Subject: 'Verify Your Email',
                TextPart: `Please verify your email by clicking the following link: ${verificationLink}`,
                HTMLPart: `<p>Please verify your email by clicking the following link: <a href="${verificationLink}">Verify Email</a></p>`
            }
        ]
    };
    try {
        const response = await mailjet.post('send', { version: 'v3.1' }).request(data);
        console.log('Verification email sent successfully:', response.body);
    }
    catch (error) {
        // Type assertion to `Error`
        const e = error;
        console.error('Error sending verification email:', e.message);
        throw new Error('Failed to send verification email');
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
