import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { hash } from 'bcryptjs'
import { GraphQLContext } from '../context/context'
import { APP_SECRET, REGISTER_EXPIRATION, baseUrl } from '../config/config'
import { v4 as uuidv4 } from 'uuid'
import { sendVerificationEmail } from '../services/sendVerificationEmail'
import { Redis } from '@upstash/redis'
import redisClient from '../services/redisClient'
import { Role } from '@prisma/client'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: Date
  password: string
  role: string
}

interface RegisterAndCreateOrderInput {
  email: string // Corrected 'String' to 'string'
  paperType: string // Corrected 'String' to 'string'
  numberOfPages: number
  dueDate: Date
}

interface CreateStudentInput {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: Date
  password: string
}

interface UpdateUserInput {
  firstName: string
  lastName: string
  userName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  role: Role
}

export interface RegisterOrderResponse {
  success: boolean
  message: string
  verificationToken: string | null
}

export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown, context: GraphQLContext) => {
      return context.prisma.user.findMany()
    },
    user: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      return context.prisma.user.findUnique({ where: { id } })
    },
    loggedInUser: (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Please login')
      }
      return context.currentUser
    },
  },
  Mutation: {
    registerAndCreateOrder: async (
      _: unknown,
      { input }: { input: RegisterAndCreateOrderInput }
    ): Promise<RegisterOrderResponse> => {
      try {
        const verificationToken = uuidv4()

        // Store registration data in Redis with an expiration time
        await redisClient.set(
          verificationToken,
          JSON.stringify({
            email: input.email,
            paperType: input.paperType,
            numberOfPages: input.numberOfPages,
            dueDate: input.dueDate,
          }),
          { ex: REGISTER_EXPIRATION }
        )

        await sendVerificationEmail(input.email, verificationToken)

        return {
          success: true,
          message: 'Verification Email Sent.',
          verificationToken,
        }
      } catch (error) {
        console.error('Error in registerAndCreateOrder:', error)

        return {
          success: false,
          message:
            'An error occurred while processing your request. Please try again later.',
          verificationToken: null,
        }
      }
    },

    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      const user = await context.prisma.user.findUnique({ where: { email } })
      if (!user) {
        throw new Error('User does not exist')
      }
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        throw new Error('Invalid password')
      }

      const token = jwt.sign({ userId: user.id }, APP_SECRET)
      return {
        token,
        user,
      }
    },

    verifyEmail: async (
      _: unknown,
      { token }: { token: string }
    ): Promise<{
      valid: boolean
      message: string
      redirectUrl: string
      token: string
    }> => {
      const cachedData = await redisClient.get(token)

      if (!cachedData) {
        return {
          valid: false,
          message: 'Invalid or expired token.',
          redirectUrl: '#',
          token: '',
        }
      }

      // Data is valid, proceed to verification
      return {
        valid: true,
        message: 'Email verified. Please complete your registration.',
        redirectUrl: `${baseUrl}/complete-registration`,
        token: token,
      }
    },
    completeRegistration: async (
      _: unknown,
      { token }: { token: string },
      { redisClient }: { redisClient: Redis }
    ): Promise<{ valid: boolean; message: string }> => {
      try {
        const cachedData = await redisClient.get(token)
        if (!cachedData) {
          return {
            valid: false,
            message: 'Invalid or expired token.',
          }
        }

        const { email, paperType, numberOfPages, dueDate } = JSON.parse(
          cachedData as string
        )

        console.log('Verified data:', {
          email,
          paperType,
          numberOfPages,
          dueDate,
        })

        // Delete token after successful verification
        await redisClient.del(token)

        return {
          valid: true,
          message: 'Registration completed successfully and order created.',
        }
      } catch (error) {
        console.error('Error in completeRegistration:', error)
        throw new Error('An error occurred while completing registration.')
      }
    },

    createStudent: async (
      _: unknown,
      { input }: { input: CreateStudentInput },
      context: GraphQLContext
    ): Promise<User> => {
      const { firstName, lastName, email, phoneNumber, dateOfBirth, password } =
        input

      // Ensure input validation includes password requirements
      if (
        !firstName ||
        !lastName ||
        !email ||
        !phoneNumber ||
        !dateOfBirth ||
        !password
      ) {
        throw new Error('All fields are required.')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.')
      }

      const userName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(
        Math.random() * 10000
      )}`

      try {
        const hashedPassword = await hash(password, 10)
        // Ensure dateOfBirth is a valid Date object
        const formattedDateOfBirth = new Date(dateOfBirth)

        if (isNaN(formattedDateOfBirth.getTime())) {
          throw new Error('Invalid date format for dateOfBirth')
        }

        const student = await context.prisma.user.create({
          data: {
            firstName,
            lastName,
            userName,
            email,
            phoneNumber,
            dateOfBirth: formattedDateOfBirth,
            password: hashedPassword,
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        return student
      } catch (error) {
        console.error('Error creating student:', error)
        throw new Error('An error occurred while creating the student.')
      }
    },
    updateUser: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateUserInput },
      context: GraphQLContext
    ) => {
      try {
        // Validate the role input
        if (input.role && !Object.values(Role).includes(input.role as Role)) {
          throw new Error('Invalid role value')
        }

        const updatedUser = await context.prisma.user.update({
          where: { id },
          data: {
            ...input,
            role: input.role as Role, // Cast the string to the Role enum
          },
        })

        return updatedUser
      } catch (error) {
        console.error('Error updating user:', error)
        throw new Error('An error occurred while updating the user.')
      }
    },
    deleteUser: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ): Promise<{ message: string }> => {
      try {
        await context.prisma.user.delete({ where: { id } })
        return { message: 'User deleted successfully' }
      } catch (error) {
        console.error('Error deleting user:', error)
        throw new Error('An error occurred while deleting the user.')
      }
    },
  },
  User: {
    orders: (parent: User, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findMany({ where: { studentId: parent.id } })
    },
  },
}
