# Admin Panel - Project Arrowhead

AdminJS-based admin panel for managing Project Arrowhead backend operations.

## Setup

### 1. Run Database Migration

Create the admin users and audit log tables:

```bash
# Connect to your PostgreSQL database and run:
psql $DATABASE_URL -f server/migrations/009_create_admin_tables.sql
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Admin Panel Configuration
ADMIN_SESSION_SECRET="your-random-secret-here"
ADMIN_COOKIE_SECRET="another-random-secret-here"

# Default Admin Credentials
ADMIN_EMAIL="admin@projectarrowhead.com"
ADMIN_PASSWORD="changeme123"
ADMIN_ROLE="super_admin"
```

**⚠️ IMPORTANT:** Change these secrets to random strings in production!

### 3. Create Your First Admin User

```bash
npm run admin:create
```

Or with custom credentials:

```bash
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npm run admin:create
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Access the Admin Panel

Navigate to: **http://localhost:5000/admin**

Login with the credentials you created in step 3.

---

## Features (Sprint 1)

### ✅ Authentication
- Secure session-based authentication with Passport.js
- Password hashing with bcrypt (cost factor 12)
- Session storage in PostgreSQL
- Rate limiting on login attempts (5 per 15 minutes)
- 30-minute session timeout

### ✅ Security
- HTTP-only cookies
- CSRF protection
- Secure cookies in production (HTTPS only)
- IP address tracking
- User agent logging

### ✅ Audit Logging
- All admin actions logged to `admin_audit_log` table
- Tracks: admin ID, action type, resource, changes, IP, timestamp
- Immutable logs (no edit/delete)

### ✅ Role-Based Access Control (RBAC)
- **Super Admin**: Full access to all features
- **Admin**: User management, view billing
- **Support**: Read-only access to users and sessions
- **Read Only**: Dashboard and analytics only

---

## File Structure

```
server/admin/
├── README.md                    # This file
├── index.ts                     # AdminJS setup and configuration
├── auth.ts                      # Passport.js authentication
├── middleware.ts                # Audit logging and rate limiting
├── resources/                   # AdminJS resource definitions
│   ├── users.ts                 # Users table resource
│   ├── journeySessions.ts       # Journey sessions resource
│   ├── tasks.ts                 # Tasks resource
│   ├── adminUsers.ts            # Admin users resource
│   └── auditLog.ts              # Audit log resource
└── components/                  # Custom AdminJS components (future)
```

---

## Usage

### Creating Additional Admin Users

```bash
# Interactive
npm run admin:create

# With environment variables
ADMIN_EMAIL=newadmin@example.com ADMIN_PASSWORD=secure123 ADMIN_ROLE=admin npm run admin:create
```

### Changing Your Password

1. Login to `/admin`
2. Navigate to "Admin Management" → "Admin Users"
3. Click on your email
4. Click "Edit"
5. Enter new password
6. Save

### Deactivating an Admin User

1. Navigate to "Admin Management" → "Admin Users"
2. Click on the user
3. Click "Edit"
4. Uncheck "Is Active"
5. Save

The user will be immediately logged out and unable to login.

### Viewing Audit Logs

1. Navigate to "Admin Management" → "Admin Audit Log"
2. Filter by:
   - Admin ID
   - Action type
   - Resource
   - Date range

---

## Next Steps (Sprint 2+)

- [ ] Add Drizzle adapter for AdminJS resources
- [ ] Build custom dashboard with business metrics
- [ ] Add team management resources
- [ ] Integrate Stripe for billing management
- [ ] Add real-time analytics charts
- [ ] Implement CSV export for all resources
- [ ] Add email notifications for critical actions

---

## Troubleshooting

### "Cannot connect to database"

Ensure `DATABASE_URL` is set in your `.env` file and the database is accessible.

### "Admin user already exists"

If you need to reset:

```sql
DELETE FROM admin_users WHERE email = 'your@email.com';
```

Then run `npm run admin:create` again.

### Session expires too quickly

Increase session duration in `server/admin/auth.ts`:

```typescript
cookie: {
  maxAge: 60 * 60 * 1000, // 1 hour instead of 30 minutes
}
```

### Can't access admin panel after deployment

Ensure:
1. Admin tables are created in production database
2. Environment variables are set in production
3. HTTPS is enabled (required for secure cookies)

---

## Security Best Practices

1. ✅ Use strong, unique secrets for `ADMIN_SESSION_SECRET` and `ADMIN_COOKIE_SECRET`
2. ✅ Change default admin password immediately after first login
3. ✅ Regularly review audit logs for suspicious activity
4. ✅ Deactivate admin users who no longer need access
5. ✅ Use HTTPS in production
6. ✅ Limit super_admin role to only necessary users
7. ✅ Enable 2FA (future enhancement)

---

## Development Notes

### Testing Authentication

```bash
curl -X POST http://localhost:5000/admin/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@projectarrowhead.com","password":"changeme123"}'
```

### Clearing Sessions

```sql
DELETE FROM session;
```

All users will be logged out immediately.

---

For questions or issues, see Sprint Plan v7.0 or contact the development team.
