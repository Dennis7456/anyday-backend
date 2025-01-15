import { FastifyInstance } from 'fastify'
import { Storage } from '@google-cloud/storage'
// import mime from 'mime-types'
import path from 'path'
import fs from 'fs'
import fastifyStatic from '@fastify/static'

export function registerListFilesRoute(app: FastifyInstance) {
  app.register(fastifyStatic, {
    root: path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
  })
  const bucketName = process.env.BUCKET_URL as string

  if (!bucketName) {
    throw new Error('BUCKET_URL is not defined in the environment variables')
  }

  // Google Cloud Storage client
  const storage = new Storage()

  // Decorate Fastify instance with the listFiles method
  app.decorate('listFiles', async function () {
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction) {
      try {
        const bucket = storage.bucket(bucketName)

        // List files in the bucket
        const [files] = await bucket.getFiles()

        return files.map((file) => ({
          name: file.name,
          url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
          metadata: file.metadata,
        }))
      } catch (error) {
        console.error('Error listing files from Google Cloud Storage:', error)
        throw new Error('Failed to list files from Google Cloud Storage')
      }
    } else {
      const localUploadDir = path.resolve(
        process.env.LOCAL_UPLOAD_DIR || './uploads'
      )

      try {
        if (!fs.existsSync(localUploadDir)) {
          throw new Error('Local upload directory not found')
        }

        const files = await fs.promises.readdir(localUploadDir)

        return files.map((file) => ({
          name: file,
          path: path.join(localUploadDir, file),
        }))
      } catch (error) {
        console.error('Error listing files from local storage:', error)
        throw new Error('Failed to list files from local storage')
      }
    }
  })

  // File listing route
  app.route({
    method: 'GET',
    url: '/api/files',
    handler: async (req, reply) => {
      try {
        let fileUrls = []

        if (process.env.NODE_ENV === 'production') {
          const bucket = storage.bucket(bucketName)

          // List files from Google Cloud Storage
          const [files] = await bucket.getFiles()

          fileUrls = files.map((file) => ({
            filename: file.name,
            url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
          }))
        } else {
          // List files from local uploads directory
          const localUploadDir = path.resolve(
            process.env.LOCAL_UPLOAD_DIR || './uploads'
          )

          if (!fs.existsSync(localUploadDir)) {
            return reply
              .status(400)
              .send({ message: 'Upload directory not found' })
          }

          const files = fs.readdirSync(localUploadDir)

          fileUrls = files.map((filename) => ({
            filename,
            url: `${localUploadDir}/${filename}`,
          }))
        }

        reply.status(200).send(fileUrls)
      } catch (error) {
        console.error('Error listing files:', error)
        reply.status(500).send({ message: 'Internal Server Error' })
      }
    },
  })

  // Route to access uploaded files
  app.route({
    method: 'GET',
    url: '/api/:filename',
    handler: async (req, reply) => {
      const { filename } = req.params as { filename: string }
      const filePath = path.join(
        process.env.LOCAL_UPLOAD_DIR || './uploads',
        filename
      )
      try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          reply.status(404).send('File not found')
          return
        }
        // Send the file
        return reply.sendFile(filename)
      } catch (error) {
        console.error('Error serving file:', error)
        reply.status(500).send('Internal Server Error')
      }
    },
  })
}
