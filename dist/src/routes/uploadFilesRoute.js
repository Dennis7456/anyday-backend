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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUploadFilesRoute = registerUploadFilesRoute;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage_1 = require("@google-cloud/storage");
const config_1 = require("../config/config");
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const server = (0, fastify_1.default)();
server.register(multipart_1.default, {
    limits: { fileSize: 50 * 1024 * 1024 },
});
const storage = new storage_1.Storage();
const bucket = storage.bucket('bucketName');
function registerUploadFilesRoute(server) {
    // File Upload Endpoint
    server.post('/api/upload/files', (req, reply) => __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        try {
            const files = [];
            try {
                // Collect files from the request
                for (var _d = true, _e = __asyncValues(req.files()), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const file = _c;
                    files.push(file);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (files.length === 0) {
                return reply.status(400).send('No files uploaded.');
            }
            const uploadPromises = files.map((data) => __awaiter(this, void 0, void 0, function* () {
                const { filename, file } = data;
                const mimetype = data.mimetype || 'application/octet-stream';
                if (process.env.NODE_ENV === 'development') {
                    // Save files locally during development
                    const uploadDir = path_1.default.resolve(config_1.locallDir !== null && config_1.locallDir !== void 0 ? config_1.locallDir : './uploads');
                    if (!fs_1.default.existsSync(uploadDir)) {
                        fs_1.default.mkdirSync(uploadDir, { recursive: true });
                    }
                    const localFilePath = path_1.default.join(uploadDir, filename);
                    const writeStream = fs_1.default.createWriteStream(localFilePath);
                    // Pipe the file stream to the local file system
                    file.pipe(writeStream);
                    return new Promise((resolve, reject) => {
                        writeStream.on('finish', () => {
                            const fileObject = {
                                id: `${Date.now()}-${filename}`, // Generate an ID
                                name: filename,
                                url: `/uploads/${encodeURIComponent(filename)}`,
                                size: fs_1.default.statSync(localFilePath).size.toString(), // Ensure size is a string
                                type: mimetype,
                            };
                            console.log(`File saved locally: ${localFilePath}`);
                            resolve(fileObject);
                        });
                        writeStream.on('error', (err) => {
                            console.error('Error saving file locally:', err);
                            reject(err);
                        });
                    });
                }
                else {
                    // In production, upload to Google Cloud Storage
                    const blob = bucket.file(filename);
                    const blobStream = blob.createWriteStream({
                        resumable: true,
                        gzip: true,
                        metadata: {
                            contentType: mimetype,
                        },
                    });
                    return new Promise((resolve, reject) => {
                        blobStream.on('error', (err) => {
                            console.error('Error uploading file:', err);
                            reject(err);
                        });
                        blobStream.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                            const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`;
                            const [metadata] = yield blob.getMetadata();
                            const fileSize = metadata.size;
                            const fileObject = {
                                id: `${Date.now()}-${filename}`, // Generate an ID
                                name: filename,
                                url: publicUrl,
                                size: fileSize === null || fileSize === void 0 ? void 0 : fileSize.toString(), // Ensure size is a string
                                type: mimetype,
                            };
                            console.log(`File uploaded successfully: ${publicUrl}`);
                            resolve(fileObject);
                        }));
                        file.pipe(blobStream);
                    });
                }
            }));
            const uploadedFiles = yield Promise.all(uploadPromises);
            reply.status(200).send({ uploadedFiles });
        }
        catch (error) {
            console.error('File upload error:', error);
            reply.status(500).send({ message: 'Internal Server Error' });
        }
    }));
}
