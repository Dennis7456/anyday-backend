import { PrismaClient, User } from '@prisma/client'
import { FastifyRequest } from 'fastify'
import {
  // JwtPayload,
  verify,
} from 'jsonwebtoken'

export const APP_SECRET = 'SASQUATCH'

interface CustomJwtPayload {
  userId: string
}

export async function authenticateUser(
  prisma: PrismaClient,
  request: FastifyRequest
): Promise<User | null> {
  const authHeader = request.headers.authorization

  console.log('Authorization Header:', authHeader)

  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1]
      console.log('Extracted Token:', token)
      const tokenPayload = verify(token, APP_SECRET) as CustomJwtPayload
      console.log('Decoded Token Payload:', tokenPayload)

      if (tokenPayload && tokenPayload.userId) {
        const userId = tokenPayload.userId
        const user = await prisma.user.findUnique({ where: { id: userId } })
        console.log('Authenticated User:', user)
        return user
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Token verification failed:', error.message)
      }
    }
  } else {
    console.warn('No Authorization header provided.')
  }

  return null
}
