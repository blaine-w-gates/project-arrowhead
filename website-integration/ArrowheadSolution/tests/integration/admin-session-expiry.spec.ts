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

describe('AdminJS session expiry via maxAge (integration)', () => {
  const email = `expiry.test+${Date.now()}@arrowhead.local`
  const password = 'test-expire-123'

  beforeAll(async () => {
    const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    const passwordHash = await hashPassword(password)
    if (existing.length) {
      await db.update(adminUsers).set({ passwordHash, isActive: true }).where(eq(adminUsers.email, email))
    } else {
      await db.insert(adminUsers).values({ email, passwordHash, role: 'super_admin', isActive: true })
    }
  })

  it('expires the session cookie and protects /admin again', async () => {
    // Use a very short maxAge
    process.env.ADMIN_SESSION_MAX_AGE_MS = '100'

    const app = express()
    await setupAdminPanel(app)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))

    const agent = request.agent(app)

    // Login
    const resLogin = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    expect(resLogin.status).toBe(302)

    // Initially should be accessible
    const ok = await agent.get('/admin')
    expect(ok.status).toBe(200)

    // Wait for cookie to expire
    await new Promise((r) => setTimeout(r, 150))

    const res = await agent.get('/admin')
    expect([301, 302]).toContain(res.status)
    expect(res.headers.location).toContain('/admin/login')
  })
})
