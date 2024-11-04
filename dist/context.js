import { PrismaClient } from '@prisma/client';
import authenticateUser from './auth.js';
const prisma = new PrismaClient();
export async function contextFactory(request) {
    return {
        prisma,
        currentUser: await authenticateUser(prisma, request),
    };
}
