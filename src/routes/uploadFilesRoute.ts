import { Storage } from '@google-cloud/storage'
import multipart from '@fastify/multipart'
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { parse } from 'fast-csv'
import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

const pump = promisify(pipeline)

declare module 'fastify' {
  interface FastifyInstance {
    uploadFile(parts: AsyncIterable<any>): Promise<{
      message: string
      uploadedFiles: Array<{
        id: string
        name: string
        size: number
        url?: string
        file?: Buffer
      }>
    }>
  }
}

const storage = new Storage()

export async function registerUploadFilesRoute(app: FastifyInstance) {
  const bucketName = process.env.BUCKET_URL
  if (!bucketName) {
    throw new Error('BUCKET_URL is not defined in the environment variables')
  }

  app.register(multipart, { limits: { fileSize: 1024 * 1024 * 50 } })

  app.decorate('uploadFile', async function (parts: AsyncIterable<any>) {
    const isProduction = process.env.NODE_ENV === 'production'
    const uploadFolder = './uploads'

    if (!isProduction) {
      await createFolderIfMissing(uploadFolder)
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
      '.xlsx',
    ]
    const uploadedFiles: Array<{
      id: string
      name: string
      size: number
      url?: string
      file?: Buffer
    }> = []
    let fileUploaded = false

    for await (const part of parts) {
      if (part.file) {
        const fileExtension = path.extname(part.filename).toLowerCase()
        if (!allowedExtensions.includes(fileExtension)) {
          throw new Error('Unsupported file type')
        }

        const mimeType =
          mime.lookup(part.filename) || 'application/octet-stream'
        const fileId = uuidv4()
        const fileMetadata = {
          id: fileId,
          name: part.filename,
          size: part.file.bytesRead,
          type: mimeType,
        }

        if (isProduction) {
          const bucket = storage.bucket(bucketName)
          const file = bucket.file(part.filename)

          try {
            await pump(
              part.file,
              file.createWriteStream({
                metadata: { contentType: mimeType },
              })
            )

            console.log(`Uploaded to Google Cloud Storage: ${part.filename}`)
            uploadedFiles.push({
              ...fileMetadata,
              url: `https://storage.googleapis.com/${bucketName}/${part.filename}`,
            })

            // If it's a CSV, download and process it
            if (mimeType === 'text/csv') {
              console.log(
                `Downloading ${part.filename} from cloud for processing...`
              )
              const tempFilePath = path.join(uploadFolder, part.filename)

              await createFolderIfMissing(uploadFolder) // Ensure the folder exists
              await file.download({ destination: tempFilePath })
              const csvData = await readCsv(tempFilePath)
              console.log('Parsed CSV Data:', csvData)
              await fs.promises.unlink(tempFilePath) // Clean up temporary file
            }
          } catch (error) {
            console.error(`Error uploading to Google Cloud Storage: ${error}`)
            throw new Error('File upload to cloud storage failed')
          }
        } else {
          const buffers: Buffer[] = []

          try {
            const localFilePath = path.join(uploadFolder, part.filename)
            const writableStream = fs.createWriteStream(localFilePath)
            part.file.on('data', (chunk: Buffer) => buffers.push(chunk))
            await pump(part.file, writableStream)
            console.log(`File saved locally: ${localFilePath}`)

            uploadedFiles.push({
              ...fileMetadata,
              url: localFilePath,
              file: Buffer.concat(buffers),
            })

            // If it's a CSV, process it
            if (mimeType === 'text/csv') {
              const csvData = await readCsv(localFilePath)
              console.log('Parsed CSV Data:', csvData)
            }
          } catch (error) {
            console.error(`Error saving file locally: ${error}`)
            throw new Error('Local file upload failed')
          }
        }

        fileUploaded = true
      } else {
        console.log(`Received field part: ${part.fieldname} = ${part.value}`)
      }
    }

    if (!fileUploaded) {
      throw new Error('No file uploaded')
    }

    return { message: 'Files uploaded successfully', uploadedFiles }
  })

  app.post('/api/upload/files', async (request, reply) => {
    try {
      const parts = request.parts()
      const result = await app.uploadFile(parts)
      return reply.send(result)
    } catch (err) {
      const error = err as Error
      console.error('Error during file upload:', error)

      if (error.message === 'No file uploaded') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'No file uploaded' })
      } else if (error.message === 'Unsupported file type') {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Unsupported file type' })
      } else if (
        error.message === 'File upload to cloud storage failed' ||
        error.message === 'Local file upload failed'
      ) {
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: error.message })
      } else {
        return reply.status(500).send({ error: 'Internal Server Error' })
      }
    }
  })
}

async function createFolderIfMissing(folderName: string): Promise<void> {
  try {
    await fs.promises.access(folderName)
  } catch {
    console.log(`Creating folder: ${folderName}`)
    await fs.promises.mkdir(folderName, { recursive: true })
  }
}

function readCsv(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const dataArray: any[] = []
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true }))
      .on('data', (row) => dataArray.push(row))
      .on('end', () => resolve(dataArray))
      .on('error', reject)
  })
}
