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
require("graphql-import-node");
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
// import multipart from '@fastify/multipart'
// import fs from 'fs'
// import formbody from '@fastify/formbody'
const indexRoute_1 = require("./routes/indexRoute");
const graphqlRoute_1 = require("./routes/graphqlRoute");
const getRedisDataRoute_1 = require("./routes/getRedisDataRoute");
const uploadFilesRoute_1 = require("./routes/uploadFilesRoute");
// import util from 'util'
// import mime from 'mime-types'
// import { parse } from 'fast-csv'
// import { pipeline } from 'stream'
// import path from 'path'
const showFileRoute_1 = require("./routes/showFileRoute");
const createStripeSessionRoute_1 = require("./routes/createStripeSessionRoute");
const stripeWebHookHandlerRoute_1 = require("./routes/stripeWebHookHandlerRoute");
const apolloClient_1 = require("./routes/client/apolloClient");
dotenv_1.default.config();
// const pump = util.promisify(pipeline)
// Extending Fastify instance type to include 'uploadFile' method
// declare module 'fastify' {
//   interface FastifyInstance {
//     uploadFile(parts: AsyncIterable<any>): Promise<{ message: string }>;
//   }
// }
const app = (0, fastify_1.default)({
    logger: true,
});
// app.register(multipart, {
//   limits: {
//     fileSize: 1024 * 1024 * 50, // 50MB
//   }
// });
// app.decorate('uploadFile', async function (parts: AsyncIterable<any>) {
//   const folder = './uploads';
//   await createFolderIfMissing(folder);
//   for await (const part of parts) {
//     if (part.file) {
//       const mimeType = mime.lookup(part.filename);
//       const destFilePath = path.join(folder, part.filename);
//       // Store the uploaded file regardless of type
//       await pump(part.file, fs.createWriteStream(destFilePath));
//       // You can process files differently based on MIME type
//       if (mimeType === 'text/csv') {
//         // If it's a CSV, process it with CSV parsing
//         console.log(await readCsv(destFilePath));
//       } else {
//         // For all other file types, log the file path
//         console.log(`File uploaded: ${destFilePath}`);
//       }
//     }
//   }
//   return { message: 'files uploaded' };
// });
// app.post('/api/upload/files', async function (req: FastifyRequest) {
//   const parts = await req.parts(); // Automatically infers parts as AsyncIterable<any>
//   return app.uploadFile(parts);
// });
// async function createFolderIfMissing(folderName: string): Promise<void> {
//   try {
//     await fs.promises.stat(folderName);
//   } catch (error) {
//     console.error('folder not found, creating..');
//     await fs.promises.mkdir(folderName);
//   }
// }
// CSV parsing function
// function readCsv(filePath: string): Promise<any[]> {
//   return new Promise((resolve, reject) => {
//     const dataArray: any[] = [];
//     fs.createReadStream(filePath)
//       .pipe(parse({ headers: true, delimiter: ';' })) // Ensure correct CSV parsing options
//       .on('data', (row) => dataArray.push(row))
//       .on('end', () => resolve(dataArray))
//       .on('error', reject); // Handle error
//   });
// }
// Registered routes
(0, indexRoute_1.registerIndexRoute)(app);
(0, graphqlRoute_1.registerGraphQLRoute)(app);
(0, getRedisDataRoute_1.registerGetRedisDataRoute)(app);
(0, uploadFilesRoute_1.registerUploadFilesRoute)(app);
(0, showFileRoute_1.registerListFilesRoute)(app);
(0, createStripeSessionRoute_1.registerCreateStripePaymentSessionRoute)(app);
(0, stripeWebHookHandlerRoute_1.registerStripeWebHookHandlerRoute)(app, apolloClient_1.apolloClient);
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const address = yield app.listen({ port: 8080 });
        if (typeof address !== 'string') {
            const addr = address;
            console.log(`server listening on ${addr.port}`);
        }
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
});
start();
