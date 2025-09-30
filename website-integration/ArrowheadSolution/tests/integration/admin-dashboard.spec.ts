import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'

import { setupAdminPanel } from '../../server/admin/index'
import { db } from '../../server/db'
import { adminUsers } from '@shared/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../server/admin/auth'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.PORT = process.env.PORT || '5000'

describe('AdminJS dashboard handler (integration)', () => {
  const app = express()
  let agent: request.SuperAgentTest

  const email = `dashboard.test+${Date.now()}@arrowhead.local`
  const password = 'test-dashboard-789'

  beforeAll(async () => {
    await setupAdminPanel(app)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    agent = request.agent(app)

    const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    const passwordHash = await hashPassword(password)
    if (existing.length) {
      await db.update(adminUsers).set({ passwordHash, isActive: true }).where(eq(adminUsers.email, email))
    } else {
      await db.insert(adminUsers).values({ email, passwordHash, role: 'super_admin', isActive: true })
    }

    // Login
    const loginRes = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)

    expect(loginRes.status).toBe(302)
    expect(loginRes.headers.location).toBe('/admin')
  })

  it('returns counts and recentAudit from /admin/api/dashboard', async () => {
    const res = await agent.get('/admin/api/dashboard')
    expect(res.status).toBe(200)
    expect(res.type).toMatch(/json/)

    const body = res.body as any
    expect(body).toBeTruthy()
    expect(body.counts).toBeTruthy()
    expect(typeof body.counts.users).toBe('number')
    expect(typeof body.counts.blogPosts).toBe('number')
    expect(typeof body.counts.sessions).toBe('number')
    expect(typeof body.counts.tasks).toBe('number')
    expect(Array.isArray(body.recentAudit)).toBe(true)
  })
})
