import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

export const APP_SECRET = 'secret';

interface CustomJwtPayload {
  userId: number;
}

async function authenticateUser(
  prisma: PrismaClient,
  request: FastifyRequest
): Promise<User | null> {

  const authHeader = request.headers.authorization;

  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const { verify } = jwt;
      const tokenPayload = verify(token, APP_SECRET) as CustomJwtPayload;

      if (tokenPayload && tokenPayload.userId) {
        return await prisma.user.findUnique({
          where: {
            id: tokenPayload.userId.toString(),
          }
        });
      }
    } catch (error) {
      console.error("Error verifying token", error);
      return null;
    }
  }
  return null;
}

export default authenticateUser;
