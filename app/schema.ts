import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLContext } from './context';
import typeDefs from './schema.graphql';
import { User, Order, Payment, Review, Assignment, Role, PaymentStatus } from '.prisma/client';
import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { APP_SECRET } from './auth';
import { v4 as uuidv4 } from 'uuid';
import redisClient from './redisClient';
import { emit } from 'process';
import { sendVerificationEmail } from '../sendVerificationEmail';
import { RegisterOrderInput, RegisterOrderResponse } from './types'

const REGISTER_EXPIRATION = 3600; // 1 hour expiration

const users: User[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe23',
    email: 'johndoe23@mail.com',
    dateOfBirth: '1987-03-13',
    password: 'password',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Doe',
    userName: 'janedoe23',
    email: 'janedoe23@mail.com',
    dateOfBirth: '1997-05-10',
    password: 'password',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const resolvers = {
  Query: {
    users: async (_: unknown, __: {}, context: GraphQLContext) => {
      return context.prisma.user.findMany();
    },
    user: async (_: unknown, { id }: { id: number }, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id },
      });
    },
    loggedInUser: (_: unknown, __: {}, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Please login');
      }
      return context.currentUser;
    },
    orders: async (_: unknown, __: {}, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }
      return context.prisma.order.findMany();
    },
    order: async (_: unknown, { id }: { id: number }, context: GraphQLContext) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }
      return context.prisma.order.findUnique({
        where: { id },
      });
    },
  },
  Mutation: {
    registerAndCreateOrder: async (
      _: unknown,
      // { email, paperType, pages, dueDate
      { input }: { input: RegisterOrderInput }
    ): Promise<RegisterOrderResponse> => {

      const verificationToken = uuidv4();

      //store initial data in redis
      await redisClient.setEx(
        verificationToken,
        REGISTER_EXPIRATION,
        JSON.stringify({
          email: input.email,
          paperType: input.paperType,
          pages: input.pages,
          dueDate: input.dueDate
        })
      );

      await sendVerificationEmail(input.email, verificationToken);

      return { success: true, message: "Verification Email Sent.", verificationToken: verificationToken };
    },

    verifyEmail: async (_: unknown,
      { token }: { token: string }): Promise<{ valid: boolean; message: string }> => {
      const cachedData = await redisClient.get(token);

      if (!cachedData) {
        return { valid: false, message: 'Invalid or expired token.' };
      }

      // Data is valid, proceed to verification
      return { valid: true, message: 'Email verified. Please complete your registration.' };
    },

    completeRegistration: async (
      _: unknown,
      { token }: { token: string }
    ): Promise<{ valid: boolean; message: string }> => {

      // Retrieve and parse cached data
      const cachedData = await redisClient.get(token);

      if (!cachedData) {
        throw new Error("Invalid or expired token");
      }

      // Parse cached data
      const { email, paperType, pages, dueDate } = JSON.parse(cachedData);

      // Complete user registration
      // const newUser = await createUser({ email });

      // Create a new order
      // const newOrder = await createOrder({
      //   userId: newUser.id,
      //   paperType,
      //   pages,
      //   dueDate
      // });

      // Optionally, delete the token from Redis after successful registration
      await redisClient.del(token);

      return {
        valid: true,
        message: "Registration complete and order created."
      };
    },

    register: async (
      _: unknown,
      { firstName, lastName, userName, email, dateOfBirth, password, role }: {
        firstName: string;
        lastName: string;
        userName: string;
        email: string;
        dateOfBirth: string;
        password: string;
        role: Role;
      },
      context: GraphQLContext
    ) => {
      const hashedPassword = await hash(password, 10);

      const user = await context.prisma.user.create({
        data: {
          firstName,
          lastName,
          userName,
          email,
          dateOfBirth,
          password: hashedPassword,
          role,
          createdAt: new Date(), // Ensure proper date format
          updatedAt: new Date(), // Ensure proper date format
        },
      });

      const token = sign({ userId: user.id }, APP_SECRET);

      return {
        token,
        user,
      };
    },
    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      context: GraphQLContext
    ) => {
      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('User does not exist');
      }

      const isValid = await compare(password, user.password);
      if (!isValid) {
        throw new Error('Incorrect password');
      }

      const token = sign({ userId: user.id }, APP_SECRET);
      return {
        token,
        user,
      };
    },
    createPayment: async (
      _: unknown,
      { orderId, amount, paymentStatus, transactionId }: {
        orderId: number;
        amount: number;
        paymentStatus: PaymentStatus;
        transactionId: string;
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.payment.create({
        data: {
          orderId,
          amount,
          paymentStatus,
          transactionId,
        },
      });
    },
    createReview: async (
      _: unknown,
      { orderId, qaId, writerId, comments, rating }: {
        orderId: number;
        qaId: number;
        writerId: number;
        comments: string;
        rating: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.review.create({
        data: {
          orderId,
          qaId,
          writerId,
          comments,
          rating,
        },
      });
    },
    createAssignment: async (
      _: unknown,
      { orderId, writerId }: { orderId: number; writerId: number },
      context: GraphQLContext
    ) => {
      if (!context.currentUser) {
        throw new Error('Authentication required');
      }

      return context.prisma.assignment.create({
        data: {
          orderId,
          writerId,
        },
      });
    },
  },

  User: {
    orders: (parent: User, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findMany({
        where: { studentId: parent.id },
      });
    },
  },

  Order: {
    student: (parent: Order, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.studentId },
      });
    },
  },

  Payment: {
    order: (parent: Payment, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
  },

  Review: {
    order: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
    qa: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.qaId },
      });
    },
    writer: (parent: Review, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      });
    },
  },

  Assignment: {
    order: (parent: Assignment, _: {}, context: GraphQLContext) => {
      return context.prisma.order.findUnique({
        where: { id: parent.orderId },
      });
    },
    writer: (parent: Assignment, _: {}, context: GraphQLContext) => {
      return context.prisma.user.findUnique({
        where: { id: parent.writerId },
      });
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
