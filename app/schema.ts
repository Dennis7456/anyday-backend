import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLContext } from './context';
import typeDefs from './schema.graphql';
import { User } from '.prisma/client';
import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { APP_SECRET } from './auth';

// type User = {
//   id: number;
//   firstName: string;
//   lastName: string;
//   userName: string;
//   email: string;
//   dateOfBirth: string;
//   password: string;
// };

const users: User[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    userName: 'johndoe23',
    email: 'johndoe23@mail.com',
    dateOfBirth: '13-03-1987',
    password: 'password',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Doe',
    userName: 'janedoe23',
    email: 'janedoe23@mail.com',
    dateOfBirth: '10-05-1997',
    password: 'password',
  },
];
const resolvers = {
  Query: {
    users: async (parent: unknown, args: {}, context: GraphQLContext) => {
      return context.prisma.user.findMany();
    },
    user: (parent: unknown, args: { id: number }, context: GraphQLContext) => {
      const user = context.prisma.user.findUnique({
        where: { id: args.id },
      });
      return user;
    },
    loggedInUser: (parent: unknown, args: {}, context: GraphQLContext) => {
      if (context.currentUser === null) {
        throw new Error('Please login');
      }
      return context.currentUser;
    },
  },
  Mutation: {
    register: async (
      parent: unknown,
      args: {
        firstName: string;
        lastName: string;
        userName: string;
        email: string;
        dateOfBirth: string;
        password: string;
      },
      context: GraphQLContext
    ) => {
      const password = await hash(args.password, 10);

      const user = await context.prisma.user.create({
        data: {
          firstName: args.firstName,
          lastName: args.lastName,
          userName: args.userName,
          email: args.email,
          dateOfBirth: args.dateOfBirth,
          password: password,
        },
      });
      const token = sign({ userId: user.id }, APP_SECRET);

      return {
        token,
        user,
      };
    },
    login: async (
      parent: unknown,
      args: {
        email: string;
        password: string;
      },
      context: GraphQLContext
    ) => {
      const user = await context.prisma.user.findUnique({
        where: { email: args.email },
      });

      if (!user) {
        throw new Error('User does not exist');
      }

      const validUser = await compare(args.password, user.password);
      if (!validUser) {
        throw new Error('Incorrect password');
      }

      const token = sign({ userId: user.id }, APP_SECRET);
      return {
        token,
        user,
      };
    },
  },

  User: {
    id: (parent: User) => parent.id,
    firstName: (parent: User) => parent.firstName,
    lastName: (parent: User) => parent.lastName,
    userName: (parent: User) => parent.userName,
    email: (parent: User) => parent.email,
    dateOfBirth: (parent: User) => parent.dateOfBirth,
    password: (parent: User) => parent.password,
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

