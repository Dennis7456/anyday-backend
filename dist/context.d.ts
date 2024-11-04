import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
export type GraphQLContext = {
    prisma: PrismaClient;
    currentUser: User | null;
};
export declare function contextFactory(request: FastifyRequest): Promise<GraphQLContext>;
