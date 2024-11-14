import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { hash } from 'bcryptjs'
import { GraphQLContext } from '../context/context'
import { APP_SECRET, REGISTER_EXPIRATION, baseUrl } from '../config/config'
import { v4 as uuidv4 } from 'uuid'
import { sendVerificationEmail } from '../services/sendVerificationEmail'
import redisClient from '../services/redisClient'

export type Role = 'STUDENT' | 'ADMIN' | 'WRITER' | 'QA'

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
        // Generate a unique verification token
        const verificationToken = uuidv4()

        // Store the registration data in Redis temporarily with an expiration time
        await redisClient.setEx(
          verificationToken,
          REGISTER_EXPIRATION,
          JSON.stringify({
            email: input.email, // Corrected typo 'emai' to 'email'
            paperType: input.paperType,
            numberOfPages: input.numberOfPages,
            dueDate: input.dueDate,
          })
        )

        // Send verification email
        await sendVerificationEmail(input.email, verificationToken)

        // Return a success response with the verification token
        return {
          success: true,
          message: 'Verification Email Sent.',
          verificationToken,
        }
      } catch (error) {
        // Handle any errors that occur during the process
        console.error('Error registering and creating order:', error)
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
      { token }: { token: string }
    ): Promise<{ valid: boolean; message: string }> => {
      const cachedData = await redisClient.get(token)
      if (!cachedData) {
        throw new Error('Invalid or expired token')
      }
      // const { email, paperType, numberOfPages, dueDate } =
      //   JSON.parse(cachedData)
      await redisClient.del(token)
      return {
        valid: true,
        message: 'Registration completed successfully and order created.',
      }
    },
    createStudent: async (
      _: unknown,
      { input }: { input: CreateStudentInput },
      context: GraphQLContext
    ): Promise<User> => {
      const { firstName, lastName, email, phoneNumber, dateOfBirth, password } =
        input

      // Validate input fields
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

      const userName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`

      const hashedPassword = await hash(password, 10)
      try {
        const student = await context.prisma.user.create({
          data: {
            firstName,
            lastName,
            userName,
            email,
            phoneNumber,
            dateOfBirth,
            password: hashedPassword,
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
        return student
      } catch (error) {
        console.error('Database error:', error)
        throw new Error('An error occurred while creating the student.')
      }
    },
  },
  User: {
    orders: (parent: User, _: unknown, context: GraphQLContext) => {
      return context.prisma.order.findMany({ where: { studentId: parent.id } })
    },
  },
}
