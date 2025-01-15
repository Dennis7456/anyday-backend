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
exports.registerListFilesRoute = registerListFilesRoute;
const storage_1 = require("@google-cloud/storage");
// import mime from 'mime-types'
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const static_1 = __importDefault(require("@fastify/static"));
function registerListFilesRoute(app) {
    app.register(static_1.default, {
        root: path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
    });
    const bucketName = process.env.BUCKET_URL;
    if (!bucketName) {
        throw new Error('BUCKET_URL is not defined in the environment variables');
    }
    // Google Cloud Storage client
    const storage = new storage_1.Storage();
    // Decorate Fastify instance with the listFiles method
    app.decorate('listFiles', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const isProduction = process.env.NODE_ENV === 'production';
            if (isProduction) {
                try {
                    const bucket = storage.bucket(bucketName);
                    // List files in the bucket
                    const [files] = yield bucket.getFiles();
                    return files.map((file) => ({
                        name: file.name,
                        url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
                        metadata: file.metadata,
                    }));
                }
                catch (error) {
                    console.error('Error listing files from Google Cloud Storage:', error);
                    throw new Error('Failed to list files from Google Cloud Storage');
                }
            }
            else {
                const localUploadDir = path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
                try {
                    if (!fs_1.default.existsSync(localUploadDir)) {
                        throw new Error('Local upload directory not found');
                    }
                    const files = yield fs_1.default.promises.readdir(localUploadDir);
                    return files.map((file) => ({
                        name: file,
                        path: path_1.default.join(localUploadDir, file),
                    }));
                }
                catch (error) {
                    console.error('Error listing files from local storage:', error);
                    throw new Error('Failed to list files from local storage');
                }
            }
        });
    });
    // File listing route
    app.route({
        method: 'GET',
        url: '/api/files',
        handler: (req, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                let fileUrls = [];
                if (process.env.NODE_ENV === 'production') {
                    const bucket = storage.bucket(bucketName);
                    // List files from Google Cloud Storage
                    const [files] = yield bucket.getFiles();
                    fileUrls = files.map((file) => ({
                        filename: file.name,
                        url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
                    }));
                }
                else {
                    // List files from local uploads directory
                    const localUploadDir = path_1.default.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads');
                    if (!fs_1.default.existsSync(localUploadDir)) {
                        return reply
                            .status(400)
                            .send({ message: 'Upload directory not found' });
                    }
                    const files = fs_1.default.readdirSync(localUploadDir);
                    fileUrls = files.map((filename) => ({
                        filename,
                        url: `${localUploadDir}/${filename}`,
                    }));
                }
                reply.status(200).send(fileUrls);
            }
            catch (error) {
                console.error('Error listing files:', error);
                reply.status(500).send({ message: 'Internal Server Error' });
            }
        }),
    });
    // Route to access uploaded files
    app.route({
        method: 'GET',
        url: '/api/:filename',
        handler: (req, reply) => __awaiter(this, void 0, void 0, function* () {
            const { filename } = req.params;
            const filePath = path_1.default.join(process.env.LOCAL_UPLOAD_DIR || './uploads', filename);
            try {
                // Check if the file exists
                if (!fs_1.default.existsSync(filePath)) {
                    reply.status(404).send('File not found');
                    return;
                }
                // Send the file
                return reply.sendFile(filename);
            }
            catch (error) {
                console.error('Error serving file:', error);
                reply.status(500).send('Internal Server Error');
            }
        }),
    });
}
