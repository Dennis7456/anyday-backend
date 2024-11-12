"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const schema_1 = require("@graphql-tools/schema");
const schema_graphql_1 = __importDefault(require("./schema.graphql"));
// const links: Link[] = [
//   {
//     id: 'link-0',
//     url: 'www.howtographql.com',
//     description: 'Fullstack tutorial for GraphQL',
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     postedOn: new Date(),
//   },
// ]
const resolvers = {
    Query: {
        info: () => 'This is the API of a Hackernews Clone',
        feed: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            return context.prisma.link.findMany();
        }),
    },
    Link: {
        id: (parent) => parent.id,
        description: (parent) => parent.description,
        url: (parent) => parent.url,
        createdAt: (parent) => parent.createdAt,
        updatedAt: (parent) => parent.updatedAt,
        postedOn: (parent) => parent.postedOn,
    },
    Mutation: {
        post: (parent, args, context) => {
            const newLink = context.prisma.link.create({
                data: {
                    url: args.url,
                    description: args.description,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    postedOn: new Date(),
                },
            });
            return newLink;
        },
    },
};
exports.schema = (0, schema_1.makeExecutableSchema)({
    typeDefs: schema_graphql_1.default,
    resolvers,
});
