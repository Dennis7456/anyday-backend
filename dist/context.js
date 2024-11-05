import { PrismaClient } from '@prisma/client';
import authenticateUser from './auth.js';
const prisma = new PrismaClient();
async function initializePrisma() {
    try {
        await prisma.$connect();
        console.log("Prisma connected successfully to the database.");
    }
    catch (error) {
        console.error("Failed to connect to the database:", error);
    }
}
// Call the function to initialize the connection and log status
initializePrisma();
// Graceful shutdown handling using process.on
process.on('beforeExit', async () => {
    console.log("Application is about to exit, disconnecting Prisma...");
    await prisma.$disconnect();
    console.log("Prisma disconnected successfully.");
});
export async function contextFactory(request) {
    return {
        prisma,
        currentUser: await authenticateUser(prisma, request),
    };
}
