import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import authenticateUser from './auth.js';

const prisma = new PrismaClient();

async function initializePrisma() {
  try {
    await prisma.$connect();
    console.log("Prisma connected successfully to the database.");
  } catch (error) {
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

export type GraphQLContext = {
  prisma: PrismaClient;
  currentUser: User | null;
};

export async function contextFactory(
  request: FastifyRequest
): Promise<GraphQLContext> {
  return {
    prisma,
    currentUser: await authenticateUser(prisma, request),
  };
}
