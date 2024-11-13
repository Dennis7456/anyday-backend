import { makeExecutableSchema } from '@graphql-tools/schema'
import fs from 'fs'
import path from 'path'
import gql from 'graphql-tag'
import { GraphQLContext } from './context/context'
import { userResolvers } from './controllers/userController'
import { orderResolvers } from './controllers/orderController'

const typeDefs = gql(
  fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8')
)

export const resolvers = {
  Query: {
    info: (parent: unknown, args: object, context: GraphQLContext) => {
      return `This is the parent: ${parent}. These are the ${args}. This is the ${context}. This works!`
    },
    ...userResolvers.Query,
    ...orderResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...orderResolvers.Mutation,
  },
}

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
