"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendVerificationEmail = async (email, token) => {
    const baseUrl = process.env.BASE_URL || "https://anyday-frontend.web.app";
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: 'denniskiplangat.dk@gmail.com',
            pass: '',
        },
    });
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Email Verification',
        html: `<p>Please verify your email by clicking on the following link:</p>
           <a href="${verificationLink}">${verificationLink}</a>`,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendVerificationEmail = sendVerificationEmail;
