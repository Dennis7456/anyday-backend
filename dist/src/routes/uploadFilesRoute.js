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
const storage_1 = require("@google-cloud/storage");
const multipart_1 = __importDefault(require("@fastify/multipart"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const fast_csv_1 = require("fast-csv");
const stream_1 = require("stream");
const util_1 = require("util");
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const pump = (0, util_1.promisify)(stream_1.pipeline);
const storage = new storage_1.Storage();
function registerUploadFilesRoute(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucketName = process.env.BUCKET_URL;
        if (!bucketName) {
            throw new Error('BUCKET_URL is not defined in the environment variables');
        }
        app.register(multipart_1.default, { limits: { fileSize: 1024 * 1024 * 50 } });
        app.decorate('uploadFile', function (parts) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, parts_1, parts_1_1;
                var _b, e_1, _c, _d;
                const isProduction = process.env.NODE_ENV === 'production';
                const uploadFolder = './uploads';
                if (!isProduction) {
                    yield createFolderIfMissing(uploadFolder);
                }
                const allowedExtensions = [
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.pdf',
                    '.csv',
                    '.doc',
                    '.docx',
                    '.ppt',
                    '.xls',
                ];
                const uploadedFiles = [];
                let fileUploaded = false;
                try {
                    for (_a = true, parts_1 = __asyncValues(parts); parts_1_1 = yield parts_1.next(), _b = parts_1_1.done, !_b; _a = true) {
                        _d = parts_1_1.value;
                        _a = false;
                        const part = _d;
                        if (part.file) {
                            const fileExtension = path_1.default.extname(part.filename).toLowerCase();
                            if (!allowedExtensions.includes(fileExtension)) {
                                throw new Error('Unsupported file type');
                            }
                            const mimeType = mime_types_1.default.lookup(part.filename) || 'application/octet-stream';
                            const fileId = (0, uuid_1.v4)();
                            const fileMetadata = {
                                id: fileId,
                                name: part.filename,
                                size: part.file.bytesRead,
                                type: mimeType,
                            };
                            if (isProduction) {
                                const bucket = storage.bucket(bucketName);
                                const file = bucket.file(part.filename);
                                try {
                                    yield pump(part.file, file.createWriteStream({
                                        metadata: { contentType: mimeType },
                                    }));
                                    console.log(`Uploaded to Google Cloud Storage: ${part.filename}`);
                                    uploadedFiles.push(Object.assign(Object.assign({}, fileMetadata), { url: `https://storage.googleapis.com/${bucketName}/${part.filename}` }));
                                    // If it's a CSV, download and process it
                                    if (mimeType === 'text/csv') {
                                        console.log(`Downloading ${part.filename} from cloud for processing...`);
                                        const tempFilePath = path_1.default.join(uploadFolder, part.filename);
                                        yield createFolderIfMissing(uploadFolder); // Ensure the folder exists
                                        yield file.download({ destination: tempFilePath });
                                        const csvData = yield readCsv(tempFilePath);
                                        console.log('Parsed CSV Data:', csvData);
                                        yield fs_1.default.promises.unlink(tempFilePath); // Clean up temporary file
                                    }
                                }
                                catch (error) {
                                    console.error(`Error uploading to Google Cloud Storage: ${error}`);
                                    throw new Error('File upload to cloud storage failed');
                                }
                            }
                            else {
                                const buffers = [];
                                try {
                                    const localFilePath = path_1.default.join(uploadFolder, part.filename);
                                    const writableStream = fs_1.default.createWriteStream(localFilePath);
                                    part.file.on('data', (chunk) => buffers.push(chunk));
                                    yield pump(part.file, writableStream);
                                    console.log(`File saved locally: ${localFilePath}`);
                                    uploadedFiles.push(Object.assign(Object.assign({}, fileMetadata), { url: localFilePath, file: Buffer.concat(buffers) }));
                                    // If it's a CSV, process it
                                    if (mimeType === 'text/csv') {
                                        const csvData = yield readCsv(localFilePath);
                                        console.log('Parsed CSV Data:', csvData);
                                    }
                                }
                                catch (error) {
                                    console.error(`Error saving file locally: ${error}`);
                                    throw new Error('Local file upload failed');
                                }
                            }
                            fileUploaded = true;
                        }
                        else {
                            console.log(`Received field part: ${part.fieldname} = ${part.value}`);
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
                if (!fileUploaded) {
                    throw new Error('No file uploaded');
                }
                return { message: 'Files uploaded successfully', uploadedFiles };
            });
        });
        app.post('/api/upload/files', (request, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                const parts = request.parts();
                const result = yield app.uploadFile(parts);
                return reply.send(result);
            }
            catch (err) {
                const error = err;
                console.error('Error during file upload:', error);
                if (error.message === 'No file uploaded') {
                    return reply
                        .status(400)
                        .send({ error: 'Bad Request', message: 'No file uploaded' });
                }
                else if (error.message === 'Unsupported file type') {
                    return reply
                        .status(400)
                        .send({ error: 'Bad Request', message: 'Unsupported file type' });
                }
                else if (error.message === 'File upload to cloud storage failed' ||
                    error.message === 'Local file upload failed') {
                    return reply
                        .status(500)
                        .send({ error: 'Internal Server Error', message: error.message });
                }
                else {
                    return reply.status(500).send({ error: 'Internal Server Error' });
                }
            }
        }));
    });
}
function createFolderIfMissing(folderName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs_1.default.promises.access(folderName);
        }
        catch (_a) {
            console.log(`Creating folder: ${folderName}`);
            yield fs_1.default.promises.mkdir(folderName, { recursive: true });
        }
    });
}
function readCsv(filePath) {
    return new Promise((resolve, reject) => {
        const dataArray = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, fast_csv_1.parse)({ headers: true }))
            .on('data', (row) => dataArray.push(row))
            .on('end', () => resolve(dataArray))
            .on('error', reject);
    });
}
