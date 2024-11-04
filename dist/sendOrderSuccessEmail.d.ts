export declare const sendOrderSuccessEmail: (to: string, instructions: string, paperType: string, numberOfPages: number, dueDate: string, totalAmount: number, depositAmount: number, status: string, uploadedFiles: {
    url: string;
    name: string;
}[]) => Promise<void>;
