import mailgun from 'mailgun-js';

const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY!, domain: process.env.MAILGUN_DOMAIN! });

export const sendVerificationEmail = async (to: string, verificationToken: string) => {
    const verificationLink = `http://localhost:4000/verify-email?token=${verificationToken}`;

    const data = {
        from: process.env.MAILGUN_FROM!,
        to,
        subject: 'Verify Your Email',
        text: `Please verify your email by clicking the following link: ${verificationLink}`,
        html: `<p>Please verify your email by clicking the following link: <a href="${verificationLink}">Verify Email</a></p>`
    };

    try {
        await mg.messages().send(data);
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};
