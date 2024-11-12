module.exports = `scalar DateTime
type Query {
  info: String!
  feed: [Link!]!
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(name: String!): User!
  post(url: String!, description: String!): Link!
}

type User {
  id: ID!
  name: String!
}

type Link {
  id: ID!
  description: String!
  url: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  postedOn: DateTime!
}`;