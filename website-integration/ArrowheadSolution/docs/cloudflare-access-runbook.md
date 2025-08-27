# Cloudflare Access Automation Runbook

## Overview
Automated service token access to `/admin` routes on `project-arrowhead.pages.dev` using Cloudflare Access policies.

## Current Implementation

### Active Policy
- **App**: `project-arrowhead.pages.dev/admin*` (ID: `54abf925-ad33-402c-aa01-4443c7c949d7`)
- **Policy**: "Allow Service Token to /admin" (ID: `0655351a-1f68-4ee5-8547-88c4f9a16c2d`)
- **Include Rule**: `[{ "any_valid_service_token": {} }]`
- **Decision**: `allow`
 - **Precedence**: 1

### Service Token
- **Name**: Cascade Service Token
- **Client ID**: `610a91c566012b52588e01b8208fbea5.access`
- **UUID**: `5e45b465-e037-4ac5-84d9-958af9cab173`

## Scripts

### Policy Management
```bash
# List Access apps
npm run cf:access:list-apps

# List service tokens  
npm run cf:access:list-tokens

# Create/update policy
npm run cf:access:upsert-policy -- \
  --app-domain https://project-arrowhead.pages.dev/admin \
  --policy-name "Allow Service Token to /admin" \
  --service-token-id 5e45b465-e037-4ac5-84d9-958af9cab173 \
  --fallback-any-valid-service-token
```

### Access Groups
```bash
# Create an Access Group that allows service tokens
node scripts/cf-access-create-group.mjs --group-name "Admin Service Tokens" \
  --service-token-id 5e45b465-e037-4ac5-84d9-958af9cab173

# Update existing policy to reference the Access Group and set precedence=1
# Requires: CF_ACCOUNT_ID and either CF_API_TOKEN or CF_API_KEY+CF_API_EMAIL
node scripts/cf-access-update-policy.mjs \
  --policy-id 0655351a-1f68-4ee5-8547-88c4f9a16c2d \
  --group-id <ACCESS_GROUP_ID> \
  --precedence 1
```

### Access Verification
```bash
# Test admin access
CF_ACCESS_CLIENT_ID='610a91c566012b52588e01b8208fbea5.access' \
CF_ACCESS_CLIENT_SECRET='<secret>' \
npm run cf:fetch -- https://project-arrowhead.pages.dev/admin/index.html
```

## Integration Tests (Playwright, Production)

- **Location**: `website-integration/ArrowheadSolution/tests/e2e/admin-access.spec.ts`
- **What it verifies**:
  - 200 OK for `/admin/index.html` and `/admin/config.yml` with valid service token headers
  - Deny/redirect (401/403/302/307/308) without headers
  - Deny/redirect with invalid random token headers
- **Env required**: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`
- **Run**:
```bash
cd website-integration/ArrowheadSolution
PLAYWRIGHT_NO_WEBSERVER=1 \
CF_ACCESS_CLIENT_ID='610a91c566012b52588e01b8208fbea5.access' \
CF_ACCESS_CLIENT_SECRET='<secret>' \
npx playwright test --project=prod-chromium -g "PROD Access"
```
Notes:
- Tests are scoped to the Playwright project `prod-chromium` (see `playwright.config.ts`).
- If env vars are not set, the positive test is skipped.

## Environment Variables
- `CF_ACCOUNT_ID`: Cloudflare account ID
- `CF_API_TOKEN`: Cloudflare API token with Access permissions
- `CF_ACCESS_CLIENT_ID`: Service token client ID (for verification)
- `CF_ACCESS_CLIENT_SECRET`: Service token secret (for verification)

## Script Features
The `cf-access-upsert-policy.mjs` script includes:
- **Variant Testing**: Tries multiple include/decision combinations
- **Path-Aware App Selection**: Matches longest path prefix
- **Client ID Normalization**: Handles `.access` suffix variations
- **Fallback Support**: Uses `any_valid_service_token` if specific token fails

## Known Limitations
- **Broad Token Scope**: Current policy allows any valid service token (not just the specific one)
- **API Schema Gap**: Cloudflare API rejects specific service token include formats we tried:
  - `{ service_token: { id: "<uuid>" } }`
  - `{ service_token: { identity_id: "<uuid>" } }`

## Future Improvements
1. **Tighten Policy Scope**: Replace `any_valid_service_token` with specific token once Cloudflare confirms correct schema
2. **Monitoring**: Add access logging/alerting
3. **CI/CD Integration**: Automate policy updates on token rotation

## Troubleshooting

### Policy Creation Fails
- Check Access app exists for target domain/path
- Verify API token has Access permissions
- Review script logs for specific error details

### Access Denied
- Confirm service token is valid and not expired
- Check policy precedence (lower numbers = higher priority)
- Verify headers: `CF-Access-Client-Id` and `CF-Access-Client-Secret`

### Wrong App Selected
- Script uses longest path prefix matching
- For `/admin`, should select `project-arrowhead.pages.dev/admin*`
- Not `project-arrowhead.pages.dev/api/oauth/*`

## Verification Commands
```bash
# Quick health check
curl -H "CF-Access-Client-Id: 610a91c566012b52588e01b8208fbea5.access" \
     -H "CF-Access-Client-Secret: <secret>" \
     https://project-arrowhead.pages.dev/admin/

# Full verification
npm run cf:access:list-apps
npm run cf:access:list-tokens
```
