import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationLink = `http://localhost:3000/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
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
