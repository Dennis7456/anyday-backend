import {createServer} from '../src/index';
import supertest from 'supertest'
import request from 'supertest';

describe('GraphQL Server', () => {
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    server = createServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('should return a valid response for a GraphQL query', async () => {
    const query = `
      query {
        info
      }
    `

    const response = await supertest(server.server)
      .post('/graphql')
      .send({ query })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data.info')
  })

  it('should return the GraphiQL interface on GET requests', async () => {
    const response = await supertest(server.server)
    .get('/graphql')
    .set('Host', 'localhost:4000') // Include Host header as in the browser request
    .set('Connection', 'keep-alive')
    .set('Cache-Control', 'max-age=0')
    .set('Sec-CH-UA', '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"')
    .set('Sec-CH-UA-Mobile', '?0')
    .set('Sec-CH-UA-Platform', '"Linux"')
    .set('Dnt', '1')
    .set('Upgrade-Insecure-Requests', '1')
    .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
    .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7')
    .set('Sec-Fetch-Site', 'none')
    .set('Sec-Fetch-Mode', 'navigate')
    .set('Sec-Fetch-User', '?1')
    .set('Sec-Fetch-Dest', 'document')
    .set('Accept-Encoding', 'gzip, deflate, br, zstd')
    .set('Accept-Language', 'en-GB,en;q=0.9');

    expect(response.statusCode).toBe(200)
    expect(response.header['content-type']).toContain('text/html')
    expect(response.text).toContain('<title>GraphiQL</title>')
  })
})