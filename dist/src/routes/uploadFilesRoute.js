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
const storage_1 = require("@google-cloud/storage"); // Google Cloud Storage SDK
const multipart_1 = __importDefault(require("@fastify/multipart"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const fast_csv_1 = require("fast-csv");
const stream_1 = require("stream");
const util_1 = require("util");
const pump = (0, util_1.promisify)(stream_1.pipeline);
// Create a Google Cloud Storage client
const storage = new storage_1.Storage();
function registerUploadFilesRoute(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucketName = process.env.BUCKET_URL;
        if (!bucketName) {
            throw new Error('BUCKET_URL is not defined in the environment variables');
        }
        app.register(multipart_1.default, {
            limits: {
                fileSize: 1024 * 1024 * 50, // 50MB
            },
        });
        // Register the upload file functionality
        app.decorate('uploadFile', function (parts) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, parts_1, parts_1_1;
                var _b, e_1, _c, _d;
                const isProduction = process.env.NODE_ENV === 'production';
                const folder = './uploads';
                if (!isProduction) {
                    // Create local uploads folder if it doesn't exist
                    yield createFolderIfMissing(folder);
                }
                try {
                    for (_a = true, parts_1 = __asyncValues(parts); parts_1_1 = yield parts_1.next(), _b = parts_1_1.done, !_b; _a = true) {
                        _d = parts_1_1.value;
                        _a = false;
                        const part = _d;
                        if (part.file) {
                            const mimeType = mime_types_1.default.lookup(part.filename);
                            const destFilePath = path_1.default.join(folder, part.filename);
                            if (isProduction) {
                                // Upload to Google Cloud Storage in production
                                const bucket = storage.bucket(bucketName);
                                const file = bucket.file(part.filename);
                                yield pump(part.file, file.createWriteStream({
                                    metadata: {
                                        contentType: mimeType || 'application/octet-stream',
                                    },
                                }));
                                console.log(`Uploaded to Google Cloud Storage: ${part.filename}`);
                            }
                            else {
                                // Save locally in development mode
                                yield pump(part.file, fs_1.default.createWriteStream(destFilePath));
                                console.log(`Uploaded to local folder: ${destFilePath}`);
                            }
                            // Process CSV files
                            if (mimeType === 'text/csv') {
                                const csvData = yield readCsv(isProduction ? part.filename : destFilePath);
                                console.log(csvData);
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = parts_1.return)) yield _c.call(parts_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return { message: 'Files Uploaded Successfully' };
            });
        });
        app.post('/api/upload/files', function (request, reply) {
            return __awaiter(this, void 0, void 0, function* () {
                const file = yield request.file();
                if (!file) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'No file uploaded',
                    });
                }
                const allowedTypes = [
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.pdf',
                    '.csv',
                    'doc',
                    'docx',
                    '.ppt',
                    'xls',
                ];
                const fileExtension = path_1.default.extname(file.filename).toLowerCase();
                // Validate file type
                if (!allowedTypes.includes(fileExtension)) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Unsupported file type',
                    });
                }
                try {
                    const parts = yield request.parts();
                    return app.uploadFile(parts);
                }
                catch (error) {
                    console.error('Error during file upload:', error);
                    reply.status(500).send({ error: 'Internal Server Error' });
                }
            });
        });
    });
}
// Helper function to create folder if it doesn't exist
function createFolderIfMissing(folderName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs_1.default.promises.stat(folderName);
        }
        catch (error) {
            console.error('Folder not found, creating...', error);
            yield fs_1.default.promises.mkdir(folderName);
        }
    });
}
// CSV parsing function
function readCsv(filePath) {
    return new Promise((resolve, reject) => {
        const dataArray = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, fast_csv_1.parse)({ headers: true, delimiter: ';' }))
            .on('data', (row) => dataArray.push(row))
            .on('end', () => resolve(dataArray))
            .on('error', reject);
    });
}
