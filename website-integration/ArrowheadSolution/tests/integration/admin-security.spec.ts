import express from 'express'
import request, { Response } from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'

import { setupAdminPanel } from '../../server/admin/index'
import { db } from '../../server/db'
import { adminUsers } from '@shared/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../../server/admin/auth'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.PORT = process.env.PORT || '5000'

async function seedAdmin(email: string, password: string) {
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
  const passwordHash = await hashPassword(password)
  if (existing.length) {
    await db.update(adminUsers).set({ passwordHash, isActive: true }).where(eq(adminUsers.email, email))
  } else {
    await db.insert(adminUsers).values({ email, passwordHash, role: 'super_admin', isActive: true })
  }
}

function extractCookies(res: Response): string[] {
  const set = res.headers['set-cookie']
  if (!set) return []
  const arr = Array.isArray(set) ? set : [set]
  // Keep only the cookie pairs (strip attributes)
  return arr.map((c) => c.split(';')[0])
}

describe('AdminJS auth security (integration)', () => {
  const email = `security.test+${Date.now()}@arrowhead.local`
  const password = 'test-sec-999'

  beforeAll(async () => {
    await seedAdmin(email, password)
  })

  it('prevents cookie reuse after logout', async () => {
    const app = express()
    await setupAdminPanel(app)
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))

    const agent = request.agent(app)

    const resLogin = await agent
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    expect(resLogin.status).toBe(302)

    const res1 = await agent.get('/admin')
    expect(res1.status).toBe(200)

    const resLogout = await agent.get('/admin/logout')
    expect([301, 302]).toContain(resLogout.status)

    const res2 = await agent.get('/admin')
    expect([301, 302]).toContain(res2.status)
    expect(res2.headers.location).toContain('/admin/login')
  })

  it('invalidates session after secret rotation (simulated expiration)', async () => {
    // App A with secret S1 -> login
    const appA = express()
    process.env.ADMIN_SESSION_SECRET = 'secret-A'
    process.env.ADMIN_COOKIE_SECRET = 'cookie-A'
    await setupAdminPanel(appA)
    appA.use(express.json())
    appA.use(express.urlencoded({ extended: false }))

    const resLoginA = await request(appA)
      .post('/admin/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    expect(resLoginA.status).toBe(302)

    const cookies = extractCookies(resLoginA)
    expect(cookies.length).toBeGreaterThan(0)

    // App B with rotated secrets S2 -> try to reuse cookies from A
    const appB = express()
    process.env.ADMIN_SESSION_SECRET = 'secret-B'
    process.env.ADMIN_COOKIE_SECRET = 'cookie-B'
    await setupAdminPanel(appB)
    appB.use(express.json())
    appB.use(express.urlencoded({ extended: false }))

    const resReuse = await request(appB).get('/admin').set('Cookie', cookies.join('; '))
    expect([301, 302]).toContain(resReuse.status)
    expect(resReuse.headers.location).toContain('/admin/login')
  })
})
