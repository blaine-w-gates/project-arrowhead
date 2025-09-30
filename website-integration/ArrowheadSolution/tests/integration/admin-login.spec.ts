import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'

import { setupAdminPanel } from '../../server/admin/index'
import { db } from '../../server/db'
import { adminUsers } from '@shared/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../server/admin/auth'

// Ensure node test env for this spec (also set in vitest.config.ts)
process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.PORT = process.env.PORT || '5000'

describe('AdminJS login flow (integration)', () => {
  const app = express()
  let agent: request.SuperAgentTest
  const email = `login.test+${Date.now()}@arrowhead.local`
  const password = 'test-password-123'

  beforeAll(async () => {
    // Mount AdminJS first (its router adds its own middlewares)
    await setupAdminPanel(app)

    // Body parsers AFTER AdminJS (to avoid conflicts with @adminjs/express)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))

    agent = request.agent(app)

    // Ensure an active admin exists for this test
    const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    const passwordHash = await hashPassword(password)
    if (existing.length) {
      await db
        .update(adminUsers)
        .set({ passwordHash, isActive: true })
        .where(eq(adminUsers.email, email))
    } else {
      await db
        .insert(adminUsers)
        .values({ email, passwordHash, role: 'super_admin', isActive: true })
    }
  })

  it('logs in with valid credentials and can access /admin', async () => {
    // 1) Submit login form
    const resLogin = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)

    // Expect redirect to /admin and a session cookie set by AdminJS
    expect(resLogin.status).toBe(302)
    expect(resLogin.headers.location).toBe('/admin')
    expect(Object.keys(resLogin.headers).join(','))
      .toContain('set-cookie')

    // 2) Follow with cookie to /admin
    const resAdmin = await agent.get('/admin')
    expect(resAdmin.status).toBe(200)
    // HTML shell is enough for SSR; UI hydrated client-side
    expect(resAdmin.text).toContain('<div id="app"')
  })
})
