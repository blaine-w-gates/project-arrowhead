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

describe('Admin Users page (integration)', () => {
  const app = express()
  const agent = request.agent(app)

  const email = `page.admin-users+${Date.now()}@arrowhead.local`
  const password = 'test-page-123'

  beforeAll(async () => {
    await setupAdminPanel(app)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))

    const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    const passwordHash = await hashPassword(password)
    if (existing.length) {
      await db.update(adminUsers).set({ passwordHash, isActive: true }).where(eq(adminUsers.email, email))
    } else {
      await db.insert(adminUsers).values({ email, passwordHash, role: 'super_admin', isActive: true })
    }

    const resLogin = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    expect(resLogin.status).toBe(302)
  })

  it('renders the Admin Users page shell', async () => {
    const res = await agent.get('/admin/pages/Admin%20Users')
    expect([200, 304]).toContain(res.status)
    expect(res.text).toContain('<div id="app"')
  })

  it('returns rows from page handler JSON endpoint', async () => {
    const res = await agent.get('/admin/api/pages/Admin%20Users')
    expect(res.status).toBe(200)
    const body = res.body as any
    expect(body).toBeTruthy()
    expect(Array.isArray(body.rows)).toBe(true)
  })
})
