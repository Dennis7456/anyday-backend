"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const mailgun_js_1 = __importDefault(require("mailgun-js"));
const mg = (0, mailgun_js_1.default)({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });
const sendVerificationEmail = async (to, verificationToken) => {
    const verificationLink = `http://localhost:4000/verify-email?token=${verificationToken}`;
    const data = {
        from: process.env.MAILGUN_FROM,
        to,
        subject: 'Verify Your Email',
        text: `Please verify your email by clicking the following link: ${verificationLink}`,
        html: `<p>Please verify your email by clicking the following link: <a href="${verificationLink}">Verify Email</a></p>`
    };
    try {
        await mg.messages().send(data);
        console.log('Verification email sent successfully');
    }
    catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
