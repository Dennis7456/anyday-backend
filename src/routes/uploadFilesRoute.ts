import { Storage } from '@google-cloud/storage' // Google Cloud Storage SDK
import multipart from '@fastify/multipart'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { parse } from 'fast-csv'
// import util from 'util'
import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream'
import { promisify } from 'util'

const pump = promisify(pipeline)

// Extending Fastify instance type to include 'uploadFile' method
declare module 'fastify' {
  interface FastifyInstance {
    uploadFile(parts: AsyncIterable<any>): Promise<{ message: string }>
  }
}

// Create a Google Cloud Storage client
const storage = new Storage()

export async function registerUploadFilesRoute(app: FastifyInstance) {
  const bucketName = process.env.BUCKET_URL as string

  if (!bucketName) {
    throw new Error('BUCKET_URL is not defined in the environment variables')
  }
  app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 50, // 50MB
    },
  })

  // Register the upload file functionality
  app.decorate('uploadFile', async function (parts: AsyncIterable<any>) {
    const isProduction = process.env.NODE_ENV === 'production'
    const folder = './uploads'

    if (!isProduction) {
      // Create local uploads folder if it doesn't exist
      await createFolderIfMissing(folder)
    }

    for await (const part of parts) {
      if (part.file) {
        const mimeType = mime.lookup(part.filename)
        const destFilePath = path.join(folder, part.filename)

        if (isProduction) {
          // Upload to Google Cloud Storage in production
          const bucket = storage.bucket(bucketName)
          const file = bucket.file(part.filename)

          await pump(
            part.file,
            file.createWriteStream({
              metadata: {
                contentType: mimeType || 'application/octet-stream',
              },
            })
          )

          console.log(`Uploaded to Google Cloud Storage: ${part.filename}`)
        } else {
          // Save locally in development mode
          await pump(part.file, fs.createWriteStream(destFilePath))
          console.log(`Uploaded to local folder: ${destFilePath}`)
        }

        // Process CSV files
        if (mimeType === 'text/csv') {
          const csvData = await readCsv(
            isProduction ? part.filename : destFilePath
          )
          console.log(csvData)
        }
      }
    }

    return { message: 'Files Uploaded Successfully' }
  })

  app.post('/api/upload/files', async function (request, reply) {
    const file = await request.file()

    if (!file) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'No file uploaded',
      })
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
    ]
    const fileExtension = path.extname(file.filename).toLowerCase()

    // Validate file type
    if (!allowedTypes.includes(fileExtension)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Unsupported file type',
      })
    }

    try {
      const parts = await request.parts()
      return app.uploadFile(parts)
    } catch (error) {
      console.error('Error during file upload:', error)
      reply.status(500).send({ error: 'Internal Server Error' })
    }
  })
}

// Helper function to create folder if it doesn't exist
async function createFolderIfMissing(folderName: string): Promise<void> {
  try {
    await fs.promises.stat(folderName)
  } catch (error) {
    console.error('Folder not found, creating...', error)
    await fs.promises.mkdir(folderName)
  }
}

// CSV parsing function
function readCsv(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const dataArray: any[] = []
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true, delimiter: ';' }))
      .on('data', (row) => dataArray.push(row))
      .on('end', () => resolve(dataArray))
      .on('error', reject)
  })
}
