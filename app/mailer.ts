import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const baseUrl = process.env.BASE_URL || "https://anydayessay.com"

  const verificationLink = `${baseUrl}/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
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

export const sendOrderSuccessEmail = async (email:string, instructions:string, paperType:string, numberOfPages:number, dueDate:string, totalAmount:number, depositAmount:number, status:string, uploadedFiles): Promise<void> => {
  const baseUrl = process.env.BASE_URL || "https://anydayessay.com"

  const verificationLink = `${baseUrl}/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
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
