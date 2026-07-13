# ROMZ Backend Deployment Checklist

Use this before deploying the backend to Railway, Render, VPS, or a similar Node host.

## Required Environment

- `NODE_ENV=production`
- `PORT`
- `API_PREFIX=/api/v1`
- `CLIENT_ORIGINS=https://storefront-domain,https://dashboard-domain`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `JWT_REFRESH_COOKIE_NAME=romz_refresh`
- `JWT_REFRESH_COOKIE_SECURE` optional override
- `JWT_REFRESH_COOKIE_SAME_SITE` optional override: `lax`, `strict`, or `none`
- `JWT_REFRESH_COOKIE_PARTITIONED` optional override

## Optional/Feature Environment

- `REDIS_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `PAYMOB_API_KEY`
- `PAYMOB_SECRET_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_CARD_INTEGRATION_ID`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_CHECKOUT_FLOW=auto` or `legacy_iframe`
- `PAYMOB_BASE_URL=https://accept.paymob.com`
- `MYLERZ_BASE_URL=https://mylerzintegrationtest.mylerz.com` for test or `https://integration.mylerz.net` for production
- `MYLERZ_USERNAME`
- `MYLERZ_PASSWORD`
- `MYLERZ_MERCHANT_ID`
- `MYLERZ_WAREHOUSE_NAME`
- `MYLERZ_DEFAULT_SERVICE_TYPE=DTD`
- `MYLERZ_DEFAULT_SERVICE=ND`
- `MYLERZ_DEFAULT_SERVICE_CATEGORY=DELIVERY`
- `MYLERZ_DEFAULT_ADDRESS_CATEGORY=H`
- `MYLERZ_DEFAULT_PRODUCT_CATEGORY=Fashion`
- `MYLERZ_DEFAULT_WEIGHT_KG=1`
- `MYLERZ_CURRENCY=EGP`

Paymob supports two configured flows in this backend:

- Unified checkout: `PAYMOB_SECRET_KEY` + `PAYMOB_PUBLIC_KEY`.
- Legacy iframe: `PAYMOB_API_KEY` + `PAYMOB_CARD_INTEGRATION_ID` + `PAYMOB_IFRAME_ID`.

## Pre-Deploy Verification

Run locally:

```bash
npm audit --omit=dev
npm test
node --check src/server.js
```

Then boot the API:

```bash
npm run dev
```

Check:

```txt
GET http://localhost:5000/api/v1/health
GET http://localhost:5000/api/v1/health/ready
```

## First Production Steps

1. Create MongoDB Atlas database.
2. Add production environment variables.
3. Deploy backend.
4. Run admin seed once:

   ```bash
   npm run seed:admin
   ```

5. Confirm:
   - `/api/v1/health`
   - `/api/v1/health/ready`
   - Admin login
   - Category/product creation
   - COD order creation

## External Services

- Product image uploads are stored on the server filesystem under `uploads/products`; make sure the deployment persists that directory or mounts durable storage.
- Configure SMTP before customer-facing emails.
- Configure Paymob credentials before live online payments.
- Configure Redis only when caching is needed in production.

## Skipped Follow-Ups

See `BACKLOG.md` for:

- Paymob live sandbox payment test.
- Bosta/Mylerz courier API automation.
