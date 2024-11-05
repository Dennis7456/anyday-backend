import Mailjet from 'node-mailjet';
const mailjetClient = Mailjet.apiConnect(process.env.MAILJET_API_KEY || '', process.env.MAILJET_SECRET_KEY || '');
export const sendOrderSuccessEmail = async (to, instructions, paperType, numberOfPages, dueDate, totalAmount, depositAmount, status, uploadedFiles) => {
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
        const response = await mailjetClient.post('send', { version: 'v3.1' }).request(data);
        console.log('Order success email sent successfully:', response.body);
    }
    catch (error) {
        console.error('Error sending order success email:', error.message);
        throw new Error('Failed to send order success email');
    }
};
