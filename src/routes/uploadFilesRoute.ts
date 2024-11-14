import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import path from 'path'
import fs from 'fs'
import { Storage } from '@google-cloud/storage'
import {
  // bucketName,
  locallDir,
} from '../config/config'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

const server = Fastify()
server.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
})

const storage = new Storage()
const bucket = storage.bucket('bucketName')

export function registerUploadFilesRoute(server: FastifyInstance) {
  // File Upload Endpoint
  server.post(
    '/api/upload/files',
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const files = []

        // Collect files from the request
        for await (const file of req.files()) {
          files.push(file)
        }

        if (files.length === 0) {
          return reply.status(400).send('No files uploaded.')
        }

        const uploadPromises = files.map(async (data) => {
          const { filename, file } = data
          const mimetype = data.mimetype || 'application/octet-stream'

          if (process.env.NODE_ENV === 'development') {
            // Save files locally during development
            const uploadDir = path.resolve(locallDir ?? './uploads')
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true })
            }

            const localFilePath = path.join(uploadDir, filename)
            const writeStream = fs.createWriteStream(localFilePath)

            // Pipe the file stream to the local file system
            file.pipe(writeStream)

            return new Promise((resolve, reject) => {
              writeStream.on('finish', () => {
                const fileObject = {
                  id: `${Date.now()}-${filename}`, // Generate an ID
                  name: filename,
                  url: `/uploads/${encodeURIComponent(filename)}`,
                  size: fs.statSync(localFilePath).size.toString(), // Ensure size is a string
                  type: mimetype,
                }

                console.log(`File saved locally: ${localFilePath}`)
                resolve(fileObject)
              })

              writeStream.on('error', (err) => {
                console.error('Error saving file locally:', err)
                reject(err)
              })
            })
          } else {
            // In production, upload to Google Cloud Storage
            const blob = bucket.file(filename)
            const blobStream = blob.createWriteStream({
              resumable: true,
              gzip: true,
              metadata: {
                contentType: mimetype,
              },
            })

            return new Promise((resolve, reject) => {
              blobStream.on('error', (err) => {
                console.error('Error uploading file:', err)
                reject(err)
              })

              blobStream.on('finish', async () => {
                const publicUrl = `https://storage.cloud.google.com/${bucket.name}/${blob.name}`
                const [metadata] = await blob.getMetadata()
                const fileSize = metadata.size

                const fileObject = {
                  id: `${Date.now()}-${filename}`, // Generate an ID
                  name: filename,
                  url: publicUrl,
                  size: fileSize?.toString(), // Ensure size is a string
                  type: mimetype,
                }

                console.log(`File uploaded successfully: ${publicUrl}`)
                resolve(fileObject)
              })

              file.pipe(blobStream)
            })
          }
        })

        const uploadedFiles = await Promise.all(uploadPromises)
        reply.status(200).send({ uploadedFiles })
      } catch (error) {
        console.error('File upload error:', error)
        reply.status(500).send({ message: 'Internal Server Error' })
      }
    }
  )
}
