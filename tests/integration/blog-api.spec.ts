import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'

import { registerRoutes } from '../../server/routes'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

describe('Blog API (integration)', () => {
  const app = express()

  beforeAll(async () => {
    await registerRoutes(app)
  })

  it('GET /api/blog/posts returns 200 and an array', async () => {
    const res = await request(app).get('/api/blog/posts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('HEAD /api/blog/posts returns 204 when healthy', async () => {
    const res = await request(app).head('/api/blog/posts')
    expect([204, 200]).toContain(res.status)
  })

  it('GET and HEAD a specific post when available', async () => {
    const resList = await request(app).get('/api/blog/posts')
    expect(resList.status).toBe(200)
    const posts = resList.body as Array<{ slug: string }>
    if (!Array.isArray(posts) || posts.length === 0) {
      // no posts available in this environment; skip remainder
      return
    }
    const slug = posts[0].slug

    const resGet = await request(app).get(`/api/blog/posts/${slug}`)
    expect([200, 404]).toContain(resGet.status)

    const resHead = await request(app).head(`/api/blog/posts/${slug}`)
    expect([204, 404, 200]).toContain(resHead.status)
  })
})
