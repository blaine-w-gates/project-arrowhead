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

describe('AdminJS sessions (integration)', () => {
  const app = express()
  let agent: request.SuperAgentTest

  const email = `session.test+${Date.now()}@arrowhead.local`
  const password = 'test-pass-456'

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
  }, 15000)

  it('redirects unauthenticated GET /admin to /admin/login', async () => {
    const res = await request(app).get('/admin')
    expect([301, 302]).toContain(res.status)
    expect(res.headers.location).toContain('/admin/login')
  }, 15000)

  it('invalid login re-renders login page with error', async () => {
    const res = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=invalid@example.com&password=wrong')

    expect(res.status).toBe(200)
    expect(res.text).toContain('invalidCredentials')
  }, 15000)

  it('successful login sets session cookie and allows GET /admin', async () => {
    const resLogin = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)

    expect(resLogin.status).toBe(302)
    expect(resLogin.headers.location).toBe('/admin')
    await new Promise((r) => setTimeout(r, 100))

    const resAdmin = await agent.get('/admin')
    expect(resAdmin.status).toBe(200)
    expect(resAdmin.text).toContain('<div id="app"')
  }, 15000)

  it('logout then protects /admin again', async () => {
    const resLogout = await agent.get('/admin/logout')
    expect([301, 302]).toContain(resLogout.status)

    const res = await agent.get('/admin')
    expect([301, 302]).toContain(res.status)
    expect(res.headers.location).toContain('/admin/login')
  })
})
