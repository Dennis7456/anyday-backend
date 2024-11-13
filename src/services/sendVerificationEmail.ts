import Mailjet from 'node-mailjet'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Mailjet client with your API keys
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_SECRET_KEY!
)

export const sendVerificationEmail = async (
  to: string,
  verificationToken: string
) => {
  const backEndUrl = process.env.BACKEND_URL
    ? process.env.BACKEND_URL
    : 'https://anyday-backend-service-969666510139.us-central1.run.app'
  const verificationLink = `${backEndUrl}/verify-email?token=${verificationToken}`

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
  }

  try {
    const response = await mailjet
      .post('send', { version: 'v3.1' })
      .request(data)
    console.log('Verification email sent successfully:', response.body)
  } catch (error) {
    // Type assertion to `Error`
    const e = error as Error
    console.error('Error sending verification email:', e.message)
    throw new Error('Failed to send verification email')
  }
}
