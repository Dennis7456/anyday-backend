"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locallDir = exports.bucketName = exports.baseUrl = exports.REGISTER_EXPIRATION = exports.APP_SECRET = void 0;
exports.APP_SECRET = process.env.APP_SECRET || 'SASQUATCH';
exports.REGISTER_EXPIRATION = 3600;
exports.baseUrl = process.env.FRONTEND_URL;
exports.bucketName = process.env.BUCKET_URL || 'anyday-essay-documents-bucket';
exports.locallDir = process.env.LOCAL_UPLOAD_DIR;
