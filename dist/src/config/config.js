"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locallDir = exports.bucketName = exports.backendUrl = exports.frontEndUrl = exports.REGISTER_EXPIRATION = exports.APP_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.APP_SECRET = process.env.APP_SECRET || 'SASQUATCH';
exports.REGISTER_EXPIRATION = 3600;
exports.frontEndUrl = process.env.FRONTEND_URL;
exports.backendUrl = process.env.BACKEND_URL;
exports.bucketName = process.env.BUCKET_NAME;
// process.env.BUCKET_URL || 'anyday-essay-documents-bucket'
exports.locallDir = process.env.LOCAL_UPLOAD_DIR;
