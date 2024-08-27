import { PrismaClient, User } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { JwtPayload, verify } from 'jsonwebtoken';

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
      const tokenPayload = verify(token, APP_SECRET) as CustomJwtPayload

      if (tokenPayload && tokenPayload.userId) {

        return await prisma.user.findUnique({
          where: {
            id: tokenPayload.userId,
          }
        });
      }
    }

    catch (error) {
      console.error("Error verifying token", error);
      return null
    }
  }
  return null;
}

export default authenticateUser;