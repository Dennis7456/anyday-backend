import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
export declare const APP_SECRET = "secret";
declare function authenticateUser(prisma: PrismaClient, request: FastifyRequest): Promise<User | null>;
export default authenticateUser;
