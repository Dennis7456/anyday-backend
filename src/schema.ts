import { makeExecutableSchema } from '@graphql-tools/schema'
import typeDefs from './schema.graphql'
import { GraphQLContext } from './context'

type Link = {
  id: string
  url: string
  description: string
  createdAt: Date
  updatedAt: Date
  postedOn: Date
}

const resolvers = {
  Query: {
    info: () => 'This is the API of a Hackernews Clone',
    feed: async (parent: unknown, args: object, context: GraphQLContext) => {
      return context.prisma.link.findMany()
    },
  },

  Link: {
    id: (parent: Link) => parent.id,
    description: (parent: Link) => parent.description,
    url: (parent: Link) => parent.url,
    createdAt: (parent: Link) => parent.createdAt,
    updatedAt: (parent: Link) => parent.updatedAt,
    postedOn: (parent: Link) => parent.postedOn,
  },
  Mutation: {
    post: (
      parent: unknown,
      args: { description: string; url: string },
      context: GraphQLContext
    ) => {
      const newLink = context.prisma.link.create({
        data: {
          url: args.url,
          description: args.description,
          createdAt: new Date(),
          updatedAt: new Date(),
          postedOn: new Date(),
        },
      })
      return newLink
    },
  },
}

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
