import dotenv from 'dotenv'

dotenv.config()

export const APP_SECRET = process.env.APP_SECRET || 'SASQUATCH'
export const REGISTER_EXPIRATION = 3600
export const frontEndUrl = process.env.FRONTEND_URL
export const backendUrl = process.env.BACKEND_URL
export const bucketName = process.env.BUCKET_NAME
// process.env.BUCKET_URL || 'anyday-essay-documents-bucket'
export const locallDir = process.env.LOCAL_UPLOAD_DIR
