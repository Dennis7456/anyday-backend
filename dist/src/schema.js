"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.resolvers = void 0;
const schema_1 = require("@graphql-tools/schema");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const userController_1 = require("./controllers/userController");
const orderController_1 = require("./controllers/orderController");
const typeDefs = (0, graphql_tag_1.default)(fs_1.default.readFileSync(path_1.default.join(__dirname, 'schema.graphql'), 'utf8'));
exports.resolvers = {
    Query: Object.assign(Object.assign({ info: (parent, args, context) => {
            return `This is the parent: ${parent}. These are the ${args}. This is the ${context}. This works!`;
        } }, userController_1.userResolvers.Query), orderController_1.orderResolvers.Query),
    Mutation: Object.assign(Object.assign({}, userController_1.userResolvers.Mutation), orderController_1.orderResolvers.Mutation),
};
exports.schema = (0, schema_1.makeExecutableSchema)({
    typeDefs,
    resolvers: exports.resolvers,
});
