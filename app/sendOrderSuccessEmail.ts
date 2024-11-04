import Mailjet from 'node-mailjet';

const mailjetClient = Mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC || '',
  process.env.MJ_APIKEY_PRIVATE || ''
);

export const sendOrderSuccessEmail = async (
  to: string,
  instructions: string,
  paperType: string,
  numberOfPages: number,
  dueDate: string,
  totalAmount: number,
  depositAmount: number,
  status: string,
  uploadedFiles: { url: string; name: string }[]
) => {
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
  } catch (error) {
    console.error('Error sending order success email:', (error as Error).message);
    throw new Error('Failed to send order success email');
  }
};
