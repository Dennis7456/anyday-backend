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
const index_1 = require("../src/index");
const supertest_1 = __importDefault(require("supertest"));
const indexRoute_1 = require("../src/routes/indexRoute");
jest.mock('node-mailjet', () => ({
    apiConnect: jest.fn(() => ({
        post: jest.fn().mockReturnThis(),
        request: jest.fn().mockResolvedValue({ body: { success: true } }),
    }))
}));
describe('GraphQL Server', () => {
    let server;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        server = (0, index_1.createServer)();
        yield server.ready();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield server.close();
    }));
    it('should return a valid response for a GraphQL query', () => __awaiter(void 0, void 0, void 0, function* () {
        const query = `
      query {
        info
      }
    `;
        const response = yield (0, supertest_1.default)(server.server)
            .post('/graphql')
            .send({ query });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data.info');
    }));
    it('should return the GraphiQL interface on GET requests', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(server.server)
            .get('/graphql')
            .set('Host', 'localhost:4000') // Include Host header as in the browser request
            .set('Connection', 'keep-alive')
            .set('Cache-Control', 'max-age=0')
            .set('Sec-CH-UA', '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"')
            .set('Sec-CH-UA-Mobile', '?0')
            .set('Sec-CH-UA-Platform', '"Linux"')
            .set('Dnt', '1')
            .set('Upgrade-Insecure-Requests', '1')
            .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
            .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7')
            .set('Sec-Fetch-Site', 'none')
            .set('Sec-Fetch-Mode', 'navigate')
            .set('Sec-Fetch-User', '?1')
            .set('Sec-Fetch-Dest', 'document')
            .set('Accept-Encoding', 'gzip, deflate, br, zstd')
            .set('Accept-Language', 'en-GB,en;q=0.9');
        expect(response.statusCode).toBe(200);
        expect(response.header['content-type']).toContain('text/html');
        expect(response.text).toContain('<title>GraphiQL</title>');
    }));
});
describe('indexRoute', () => {
    let server;
    beforeEach(() => {
        // Create a fresh Fastify server instance for each test
        server = (0, fastify_1.default)();
        // Register the index route
        (0, indexRoute_1.registerIndexRoute)(server);
    });
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
        // console.log(response)
        expect(response.statusMessage).toBe('Internal Server Error');
    }));
});
