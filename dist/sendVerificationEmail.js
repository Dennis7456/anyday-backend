import Mailjet from 'node-mailjet';
// Initialize Mailjet client with your API keys
const mailjet = Mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
export const sendVerificationEmail = async (to, verificationToken) => {
    const backEndUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL : 'https://anyday-backend-app-hufozn77kq-uc.a.run.app';
    const verificationLink = `${backEndUrl}/verify-email?token=${verificationToken}`;
    const data = {
        Messages: [
            {
                From: {
                    Email: "support@anydayessay.com",
                    Name: 'Any Day Essay Support'
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
