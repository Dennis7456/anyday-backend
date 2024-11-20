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
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const indexRoute_1 = require("../src/routes/indexRoute");
describe('Fastify Server', () => {
    let server;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        server = (0, fastify_1.default)();
        server.register(multipart_1.default);
        // Register necessary routes
        (0, indexRoute_1.registerIndexRoute)(server);
        yield server.ready();
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        // Close the server after each test
        yield server.close();
    }));
    it('should return "Server is running!" when the root endpoint is accessed', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield server.inject({
            method: 'GET',
            url: '/',
        });
        expect(response.statusCode).toBe(200); // Check that status is 200 OK
        expect(response.body).toBe('Server is running!'); // Check the response body
    }));
    it('should return 500 if an error occurs in the handler', () => __awaiter(void 0, void 0, void 0, function* () {
        // Simulate an error by modifying the route handler to throw an error
        const erroringServer = (0, fastify_1.default)();
        erroringServer.route({
            method: 'GET',
            url: '/',
            handler: (req, resp) => __awaiter(void 0, void 0, void 0, function* () {
                throw new Error('Simulated error');
            }),
        });
        // Registering the error route
        yield erroringServer.ready();
        const response = yield erroringServer.inject({
            method: 'GET',
            url: '/',
        });
        expect(response.statusCode).toBe(500);
        expect(response.statusMessage).toBe('Internal Server Error');
    }));
});
