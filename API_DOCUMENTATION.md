# ROMZ Frontend API Documentation

This document describes every mounted API in the ROMZ backend for frontend integration.

Last synchronized with the backend source: `2026-07-17`.

The backend is the source of truth for prices, discounts, shipping fees, stock, payment status,
and order status. The frontend should display values returned by `/cart/validate` and `/orders`
instead of calculating a final payable total independently.

## Base URL

Default local base URL:

```text
http://localhost:5000/api/v1
```

The prefix is controlled by `API_PREFIX` and defaults to `/api/v1`.

## Common Headers

Use JSON for normal requests:

```http
Content-Type: application/json
```

For protected endpoints:

```http
Authorization: Bearer <accessToken>
```

For refresh-token requests, prefer browser credentials/cookies:

```js
fetch(`${API_URL}/auth/refresh`, {
  method: "POST",
  credentials: "include"
});
```

Also use `credentials: "include"` on `register`, `login`, and `logout` so the browser stores or clears the HTTP-only refresh cookie:

```js
fetch(`${API_URL}/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
```

If your frontend cannot rely on cookies, store `data.refreshToken` from login/register/refresh and send it to `/auth/refresh` in the JSON body:

```js
fetch(`${API_URL}/auth/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refreshToken })
});
```

Product photos are uploaded with Multer using `multipart/form-data`. Send product photo files in the `images` field, up to 8 files per request. Category photos are uploaded with a single `image` file field. When using multipart, send structured fields such as `name`, `description`, `categories`, `collections`, `variants`, `badges`, `existingImages`, and `imageColors` as JSON strings.

CORS is open. The API reflects the request origin and allows credentials, so browser clients on localhost, tunnels, or deployed domains can call the API without adding their origin to `CLIENT_ORIGINS`.

## Response Envelope

JSON success responses use:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

`data` is `null` when a successful endpoint has no response data. `meta` is present only when the
controller supplies it, currently on paginated endpoints. Delete/logout endpoints may return
`204 No Content` with no body.

All JSON errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": ["\"email\" must be a valid email"],
  "meta": {
    "stack": "Only in development"
  }
}
```

Common error statuses:

| Status | Meaning |
| --- | --- |
| `400` | Validation error, invalid cart/order/coupon/payment state |
| `401` | Missing or invalid access/refresh token |
| `403` | Authenticated but not allowed, usually non-admin |
| `404` | Resource not found |
| `409` | Duplicate value such as registered email or coupon code |
| `429` | Rate limit exceeded |
| `500` | Server/configuration error |

Frontend JSON paths use the API envelope's `data` field:

| API area | JSON path |
| --- | --- |
| Auth | `data.user`, `data.accessToken`, `data.refreshToken` |
| Product list/detail | `data.products`, `data.product` |
| Settings | `data.settings` |
| Contact submit | `data.message` |
| Admin contact list/detail | `data.messages`, `data.message` |
| Cart validation | `data.cart` |
| Order create/detail/track | `data.order` |
| Paymob intent | `data.payment` |

With Axios, its own HTTP response wrapper adds another level; for example, the cart is commonly read as
`axiosResponse.data.data.cart`. With `fetch`, after `await response.json()`, it is `json.data.cart`.

Rate-limited endpoints:

| Area | Limit |
| --- | --- |
| All API routes | 300 requests per 15 minutes per IP |
| Register/login | 20 requests per 15 minutes |
| Verify/resend OTP | 8 requests per 15 minutes |
| Forgot/reset password | 5 requests per 60 minutes |
| Contact form submit | 10 requests per 15 minutes |
| Order tracking | 30 requests per 15 minutes |
| Paymob webhook | 120 requests per minute |

## Pagination

Paginated endpoints accept:

| Query | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | number | `1` | Minimum `1` |
| `limit` | number | `12` | Minimum `1`, maximum `100` |

Paginated responses include:

```json
{
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 30,
    "pages": 3
  }
}
```

## Shared Data Shapes

### Localized String

```json
{
  "ar": "Arabic T-shirt",
  "en": "T-shirt"
}
```

### Image

```json
{
  "url": "https://res.cloudinary.com/example/image/upload/v1/romz/products/product.jpg",
  "publicId": "romz/products/product",
  "color": "Black"
}
```

Product and category image `url` and `publicId` are created by the backend after Multer receives the file and uploads it to Cloudinary. `color` exists on product images and can be set for uploaded files with `imageColors`. Category images only use `url` and `publicId`.

### Product Variant

```json
{
  "_id": "64f000000000000000000001",
  "sku": "TEE-BLK-M",
  "size": "M",
  "color": {
    "name": "Black",
    "hex": "#000000"
  },
  "stock": 8,
  "priceOverride": null
}
```

### Product

```json
{
  "_id": "64f000000000000000000010",
  "name": { "ar": "Arabic T-shirt", "en": "T-shirt" },
  "slug": "t-shirt",
  "description": { "ar": "Arabic description", "en": "Description" },
  "category": {
    "_id": "64f000000000000000000020",
    "name": { "ar": "Arabic Men", "en": "Men" },
    "slug": "men"
  },
  "categories": [
    {
      "_id": "64f000000000000000000020",
      "name": { "ar": "Arabic Men", "en": "Men" },
      "slug": "men"
    }
  ],
  "collections": [],
  "basePrice": 500,
  "salePrice": 450,
  "images": [],
  "variants": [],
  "badges": ["new"],
  "isActive": true,
  "sold": 0,
  "views": 0,
  "ratingAvg": 0,
  "ratingCount": 0,
  "createdAt": "2026-07-11T12:00:00.000Z",
  "updatedAt": "2026-07-11T12:00:00.000Z"
}
```

### User

```json
{
  "_id": "64f000000000000000000030",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "01000000000",
  "role": "user",
  "isVerified": false,
  "addresses": [],
  "wishlist": [],
  "createdAt": "2026-07-11T12:00:00.000Z",
  "updatedAt": "2026-07-11T12:00:00.000Z"
}
```

Passwords, OTPs, refresh-token version, and reset-token fields are never returned.

### Address

```json
{
  "_id": "64f000000000000000000031",
  "label": "Home",
  "governorate": "Cairo",
  "city": "Nasr City",
  "street": "Main Street",
  "apartment": "12A"
}
```

### Order

```json
{
  "_id": "64f000000000000000000040",
  "orderNumber": "RZ-2026-00001",
  "user": null,
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "01000000000"
  },
  "shippingAddress": {
    "governorate": "Cairo",
    "city": "Nasr City",
    "street": "Main Street",
    "apartment": "12A",
    "postal": ""
  },
  "items": [
    {
      "product": "64f000000000000000000010",
      "nameSnapshot": { "ar": "Arabic T-shirt", "en": "T-shirt" },
      "sku": "TEE-BLK-M",
      "size": "M",
      "color": { "name": "Black", "hex": "#000000" },
      "qty": 2,
      "unitPrice": 450
    }
  ],
  "subtotal": 900,
  "shippingFee": 50,
  "discount": {
    "couponCode": "",
    "amount": 0
  },
  "total": 950,
  "paymentMethod": "cod",
  "paymentStatus": "pending",
  "paymobTransactionId": "",
  "paymobOrderId": "",
  "status": "pending",
  "statusHistory": [
    {
      "status": "pending",
      "at": "2026-07-11T12:00:00.000Z",
      "note": "Order created"
    }
  ],
  "courier": {
    "name": "",
    "trackingNumber": "",
    "trackingUrl": ""
  },
  "cancelledReason": "",
  "createdAt": "2026-07-11T12:00:00.000Z",
  "updatedAt": "2026-07-11T12:00:00.000Z"
}
```

Order statuses: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`.

Payment statuses: `pending`, `paid`, `failed`, `refunded`.

Payment methods: `cod`, `paymob`.

## Health APIs

### `GET /health`

Checks that the API process is running.

Request: no body.

Response `200`:

```json
{
  "success": true,
  "message": "ROMZ API is healthy",
  "data": {
    "uptime": 123.45,
    "timestamp": "2026-07-11T12:00:00.000Z"
  }
}
```

### `GET /health/ready`

Checks that MongoDB is connected.

Request: no body.

Response `200`:

```json
{
  "success": true,
  "message": "ROMZ API is ready",
  "data": {
    "mongo": "connected",
    "timestamp": "2026-07-11T12:00:00.000Z"
  }
}
```

Response `503` when MongoDB is disconnected:

```json
{
  "success": false,
  "message": "ROMZ API is not ready",
  "data": {
    "mongo": "disconnected",
    "timestamp": "2026-07-11T12:00:00.000Z"
  }
}
```

## Auth APIs

Refresh tokens are set as HTTP-only cookies named by `JWT_REFRESH_COOKIE_NAME`, default `romz_refresh`, and are also returned in JSON as `refreshToken` for clients that cannot use cookies reliably. Access tokens are returned in JSON and should be sent in `Authorization: Bearer <accessToken>`.

`POST /auth/refresh` and `POST /auth/logout` read the refresh token in this exact priority order:

1. Cookie named by `JWT_REFRESH_COOKIE_NAME` (default `romz_refresh`).
2. JSON body field `refreshToken`.
3. JSON body field `refresh_token`.
4. Header `x-refresh-token`.

Do not send several different refresh tokens at once. A stale cookie has priority over a valid body
or header token and will cause `401`. After a successful refresh, replace the stored access token and,
when using JSON token storage, replace the stored refresh token with the token from the response.

Refreshing does not revoke the previously issued refresh token. Logging out with a valid refresh token
or resetting the password increments the user's token version and invalidates all older refresh tokens
for that account.

Cookie defaults are environment-aware:

| Environment | Default Cookie Settings |
| --- | --- |
| development | `HttpOnly`, `SameSite=Lax`, not `Secure`, works on local HTTP |
| production | `HttpOnly`, `Secure`, `SameSite=None`, `Partitioned`, for deployed HTTPS/cross-site clients |

You can override with `JWT_REFRESH_COOKIE_SECURE`, `JWT_REFRESH_COOKIE_SAME_SITE`, and `JWT_REFRESH_COOKIE_PARTITIONED`.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | `{ name, email, password, phone? }` | `201`, `data: { user, accessToken, refreshToken }`, sets refresh cookie |
| `POST` | `/auth/login` | Public | `{ email, password }` | `200`, `data: { user, accessToken, refreshToken }`, sets refresh cookie |
| `POST` | `/auth/verify-email` | Public | `{ email, code }` where `code` is 6 digits | `200`, `data: { user }` |
| `POST` | `/auth/resend-otp` | Public | `{ email }` | `200`, `data: null` |
| `POST` | `/auth/refresh` | Refresh cookie/body/header | optional `{ refreshToken }` | `200`, `data: { user, accessToken, refreshToken }`, reissues refresh cookie |
| `POST` | `/auth/logout` | Refresh cookie/body/header optional | optional `{ refreshToken }` | `204 No Content`, clears refresh cookie |
| `POST` | `/auth/forgot-password` | Public | `{ email }` | `200`, `data: null` |
| `POST` | `/auth/reset-password` | Public | `{ token, password }` | `200`, `data: null` |

Register request:

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "password": "password123",
  "phone": "01000000000"
}
```

Register/login response:

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "_id": "64f000000000000000000030",
      "name": "Customer Name",
      "email": "customer@example.com",
      "phone": "01000000000",
      "role": "user",
      "isVerified": false,
      "addresses": [],
      "wishlist": []
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

Validation rules:

| Field | Rules |
| --- | --- |
| `name` | required for register, 2-80 chars |
| `email` | required, valid email, normalized lowercase |
| `password` | register/reset: required, 8-128 chars; login: any non-empty string is accepted for comparison |
| `phone` | optional, max 30 chars |
| `code` | required for verify email, exactly 6 digits |
| `token` | required for password reset |

## User APIs

All user endpoints require `Authorization: Bearer <accessToken>`.

| Method | Path | Request | Success Response |
| --- | --- | --- | --- |
| `GET` | `/users/me` | no body | `200`, `data: { user }` |
| `PATCH` | `/users/me` | `{ name?, phone? }` | `200`, `data: { user }` |
| `POST` | `/users/me/addresses` | address body | `201`, `data: { addresses }` |
| `PATCH` | `/users/me/addresses/:addressId` | address body | `200`, `data: { addresses }` |
| `DELETE` | `/users/me/addresses/:addressId` | no body | `204 No Content` |
| `GET` | `/users/me/wishlist` | no body | `200`, `data: { wishlist }` |
| `POST` | `/users/me/wishlist/:productId` | no body | `200`, `data: { wishlist }` |
| `DELETE` | `/users/me/wishlist/:productId` | no body | `200`, `data: { wishlist }` |

Address request:

```json
{
  "label": "Home",
  "governorate": "Cairo",
  "city": "Nasr City",
  "street": "Main Street",
  "apartment": "12A"
}
```

Wishlist items are populated product summaries:

```json
{
  "success": true,
  "message": "Wishlist fetched",
  "data": {
    "wishlist": [
      {
        "_id": "64f000000000000000000010",
        "name": { "ar": "Arabic T-shirt", "en": "T-shirt" },
        "slug": "t-shirt",
        "basePrice": 500,
        "salePrice": 450,
        "images": [],
        "badges": ["new"],
        "ratingAvg": 0,
        "ratingCount": 0,
        "isActive": true
      }
    ]
  }
}
```

## Category APIs

`GET /categories` and `GET /categories/tree` return only active categories. The public
`GET /categories/:id` detail route loads by ID and can return an inactive category. Admin writes
require a Bearer admin token.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/categories` | Public | no body | `200`, `data: { categories }` |
| `GET` | `/categories/tree` | Public | no body | `200`, `data: { categories }` with `children` |
| `GET` | `/categories/:id` | Public | no body | `200`, `data: { category }` |
| `POST` | `/categories` | Admin | category body or multipart with `image` file | `201`, `data: { category }` |
| `PATCH` | `/categories/:id` | Admin | partial category body or multipart with `image` file | `200`, `data: { category }` |
| `DELETE` | `/categories/:id` | Admin | no body | `204 No Content`, soft deletes by `isActive=false` and deletes category image file |

Category create request:

```json
{
  "name": {
    "ar": "Arabic Men",
    "en": "Men"
  },
  "slug": "men",
  "image": {
    "url": "https://example.com/men.jpg",
    "publicId": "romz/categories/men"
  },
  "parent": null,
  "isActive": true,
  "order": 0
}
```

Category multipart upload:

```js
const form = new FormData();
form.append("name", JSON.stringify({ ar: "Arabic Men", en: "Men" }));
form.append("slug", "men");
form.append("image", fileInput.files[0]);
form.append("parent", "");
form.append("order", "0");

await fetch(`${API_URL}/categories`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form
});
```

Category photo workflow:

1. On create or update, send the category photo file as multipart field `image`.
2. If an update uploads a new category image, the previous local image file is deleted after the category update succeeds.
3. Editing category name, slug, parent, or order without an `image` file preserves the existing category image.
4. To remove a category image without uploading a new one, send `removeImage: true`; the previous local image file is deleted.
5. Deleting a category also removes its local image file from the server filesystem.
6. Multipart requests may send empty `parent` as `""`; the backend normalizes it to `null`.
7. A JSON `image: { url, publicId }` is accepted during category creation. During update, replacement
   is file-based: an `image` object without a file is ignored unless `removeImage: true` is also sent.

Category response:

```json
{
  "success": true,
  "message": "Category fetched",
  "data": {
    "category": {
      "_id": "64f000000000000000000020",
      "name": { "ar": "Arabic Men", "en": "Men" },
      "slug": "men",
      "image": {
        "url": "https://example.com/men.jpg",
        "publicId": "romz/categories/men"
      },
      "parent": null,
      "isActive": true,
      "order": 0,
      "createdAt": "2026-07-11T12:00:00.000Z",
      "updatedAt": "2026-07-11T12:00:00.000Z"
    }
  }
}
```

Validation rules:

| Field | Rules |
| --- | --- |
| `name.ar`, `name.en` | required on create, 1-120 chars |
| `slug` | optional, lowercase, max 140 chars; generated from name if omitted |
| `image` multipart file | optional category photo, max 15MB, image MIME only |
| `image.url` | optional URI, `/uploads/...`, or empty string |
| `image.publicId` | optional string |
| `removeImage` | optional boolean for update |
| `parent` | optional 24-char ObjectId, `null`, or empty string normalized to `null` |
| `isActive` | boolean, default `true` |
| `order` | integer, minimum `0`, default `0` |

## Settings APIs

Store settings are used by the storefront and admin dashboard for homepage/customization controls.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/settings/store` | Public | no body | `200`, `data: { settings }` |
| `PATCH` | `/settings/store` | Admin | settings body | `200`, `data: { settings }` |
| `GET` | `/storefront-settings` | Public | no body | `200`, `data: { settings }` |
| `PATCH` | `/admin/storefront-settings` | Admin | partial settings body | `200`, `data: { settings }` |

`GET /settings/store` and `GET /storefront-settings` create the default `{ key: "store" }` settings document if it does not exist.

Patch store settings request:

```json
{
  "storeName": "ROMZ",
  "promoBar": {
    "en": "Free shipping over EGP 1500",
    "ar": "شحن مجاني فوق 1500 جنيه",
    "active": true
  },
  "announcement": {
    "en": "New drop is live",
    "ar": "الكوليكشن الجديد متاح الآن"
  },
  "heroSlides": [
    {
      "title": { "en": "Summer Drop", "ar": "صيف جديد" },
      "subtitle": { "en": "Light layers", "ar": "ستايلات خفيفة" },
      "image": { "url": "/uploads/hero.jpg", "publicId": "uploads/hero.jpg" },
      "ctaLabel": { "en": "Shop now", "ar": "تسوق الآن" },
      "ctaHref": "/collections/summer",
      "isActive": true,
      "order": 0
    }
  ],
  "featuredCollections": ["64f000000000000000000020"],
  "socialLinks": {
    "facebook": "",
    "instagram": "",
    "tiktok": "",
    "whatsapp": ""
  },
  "payments": {
    "paymob": {
      "active": true
    }
  },
  "freeShippingThreshold": 1500,
  "lowStockThreshold": 5
}
```

Promo bar active state can be sent as either `promoBar.active` or top-level `promoBarActive`. The
normalized settings response always exposes this value as top-level `settings.promoBarActive`; it does
not return `settings.promoBar.active`.

Checkout payment methods:

```json
{
  "payments": {
    "paymob": {
      "active": false
    }
  }
}
```

The storefront should read `settings.payments.paymob.active`. When `false`, hide Paymob/card payment
during checkout. This is currently a storefront availability setting only: the order and payment
endpoints do not reject Paymob requests based on this flag, so the frontend must enforce the visibility.

Settings validation rules:

| Field | Rules |
| --- | --- |
| `storeName` | optional, 1-120 chars |
| `promoBar.en`, `promoBar.ar` | optional localized text |
| `promoBar.active` / `promoBarActive` | optional boolean |
| `announcement.en`, `announcement.ar` | optional localized text |
| `heroSlides[]` | optional array of slide objects |
| `featuredCollections[]` | optional Category ObjectIds; all must exist |
| `socialLinks` | optional facebook, instagram, tiktok, whatsapp strings |
| `payments.paymob.active` | optional boolean |
| `freeShippingThreshold` | optional number >= 0 or `null` |
| `lowStockThreshold` | optional integer >= 0 |

## Contact APIs

The contact form is public and stores every message in MongoDB. If SMTP is configured, the backend also sends an email notification to `CONTACT_EMAIL`; when `CONTACT_EMAIL` is empty it falls back to `ADMIN_EMAIL`. Email notification failure does not fail the form submission.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/contact` | Public, optional user Bearer | contact body | `201`, `data: { message }` |
| `GET` | `/contact` | Admin | query params | `200`, `data: { messages }`, `meta` |
| `GET` | `/contact/:id` | Admin | no body | `200`, `data: { message }` |
| `PATCH` | `/contact/:id` | Admin | status/admin notes | `200`, `data: { message }` |
| `DELETE` | `/contact/:id` | Admin | no body | `204 No Content` |

Public contact submit request:

```json
{
  "name": "ROMZ Customer",
  "email": "customer@example.com",
  "phone": "01000000000",
  "subject": "Question about delivery",
  "message": "I want to know when delivery is available for Cairo orders.",
  "source": "contact-page"
}
```

Public submit response intentionally returns only a safe receipt:

```json
{
  "success": true,
  "message": "Contact message submitted",
  "data": {
    "message": {
      "id": "64f000000000000000000050",
      "status": "new",
      "createdAt": "2026-07-17T12:00:00.000Z"
    }
  }
}
```

Contact validation rules:

| Field | Rules |
| --- | --- |
| `name` | required, 2-120 chars |
| `email` | required, valid email, lowercased |
| `phone` | optional, max 40 chars, can be empty string |
| `subject` | required, 2-160 chars |
| `message` | required, 10-3000 chars |
| `source` | optional, max 80 chars, defaults to `storefront` |

Admin list query params:

| Query | Type | Notes |
| --- | --- | --- |
| `page`, `limit` | number | Pagination |
| `status` | string | `new`, `read`, `replied`, or `archived` |
| `email` | string | Exact lowercase email match |
| `search` | string | Searches name, email, phone, subject, and message |
| `sort` | string | Default `-createdAt` |

Admin contact message shape:

```json
{
  "_id": "64f000000000000000000050",
  "name": "ROMZ Customer",
  "email": "customer@example.com",
  "phone": "01000000000",
  "subject": "Question about delivery",
  "message": "I want to know when delivery is available for Cairo orders.",
  "status": "new",
  "adminNotes": "",
  "source": "contact-page",
  "ipAddress": "::1",
  "userAgent": "Mozilla/5.0 ...",
  "user": null,
  "readAt": null,
  "repliedAt": null,
  "createdAt": "2026-07-17T12:00:00.000Z",
  "updatedAt": "2026-07-17T12:00:00.000Z"
}
```

Admin update request:

```json
{
  "status": "read",
  "adminNotes": "Needs WhatsApp follow-up"
}
```

Status behavior:

| Status | Backend behavior |
| --- | --- |
| `new` | Clears `readAt` and `repliedAt` |
| `read` | Sets `readAt` if it was empty |
| `replied` | Sets `repliedAt` if it was empty |
| `archived` | Keeps existing timestamps |

## Product APIs

Public reads only return active products. Admin writes require Bearer admin token.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/products` | Public | query params | `200`, `data: { products }`, `meta` |
| `GET` | `/products/home` | Public | no body | `200`, `data: { newArrivals, bestSellers, saleProducts }` |
| `GET` | `/products/:slug` | Public | no body | `200`, `data: { product }`, increments views |
| `GET` | `/products/:slug/related?limit=4` | Public | no body | `200`, `data: { products }` |
| `GET` | `/products/admin/:id` | Admin | no body | `200`, `data: { product }`, includes inactive products |
| `POST` | `/products` | Admin | product body or multipart form with photos | `201`, `data: { product }` |
| `PATCH` | `/products/:id` | Admin | partial product body or multipart form with photos | `200`, `data: { product }` |
| `DELETE` | `/products/:id` | Admin | no body | `204 No Content`, soft deletes by `isActive=false` |

Product list query params:

| Query | Type | Notes |
| --- | --- | --- |
| `page`, `limit` | number | Pagination |
| `category` | string | Category ObjectId or category slug. Matches either primary `category` or any item in `categories`. |
| `size` | CSV string | Example `S,M,L` |
| `color` | CSV string | Matches `variants.color.name` |
| `badge` | CSV string | Values: `new`, `best-seller`, `sale` |
| `search` | string | Text search over Arabic/English name and description |
| `minPrice` | number | Filters by `salePrice ?? basePrice`; variant `priceOverride` is not used by product-list filtering |
| `maxPrice` | number | Filters by `salePrice ?? basePrice`; variant `priceOverride` is not used by product-list filtering |
| `sort` | string | `newest`, `price-low`, `price-high`, `best-selling`, `rating`, or comma-separated Mongoose fields. `price-low` and `price-high` sort by `basePrice`, not effective price. |

`GET /products/home` returns up to 8 items per group. `newArrivals` sorts by newest,
`bestSellers` sorts by `sold`, and `saleProducts` includes products with the `sale` badge. A non-null
`salePrice` alone does not place a product in `saleProducts`.

Product create JSON request:

```json
{
  "name": {
    "ar": "Arabic Black T-shirt",
    "en": "Black T-shirt"
  },
  "slug": "black-t-shirt",
  "description": {
    "ar": "Arabic Cotton t-shirt",
    "en": "Cotton t-shirt"
  },
  "categories": [
    "64f000000000000000000020",
    "64f000000000000000000021"
  ],
  "collections": ["64f000000000000000000021"],
  "basePrice": 500,
  "salePrice": 450,
  "variants": [
    {
      "sku": "TEE-BLK-M",
      "size": "M",
      "color": {
        "name": "Black",
        "hex": "#000000"
      },
      "stock": 10,
      "priceOverride": null
    }
  ],
  "badges": ["new"],
  "isActive": true
}
```

Use JSON requests for product data without new photos. To upload product photos, use `multipart/form-data`.

Products support multiple categories through `categories`. The old `category` field is still accepted for backwards compatibility and becomes the primary category. When `categories` is sent, the backend also sets `category` to the first category unless `category` is explicitly provided.

Product multipart request fields:

| Field | Type | Notes |
| --- | --- | --- |
| `images` | file[] | Multer file field for product photos. Up to 8 image files, each max 15MB, image MIME only |
| `name` | JSON string | Example `{"ar":"Arabic T-shirt","en":"T-shirt"}` |
| `description` | JSON string | Same localized shape |
| `categories` | JSON string | Example `["64f...","64f..."]` |
| `collections` | JSON string | Example `["64f..."]` |
| `variants` | JSON string | Array of variant objects |
| `badges` | JSON string | Array of `new`, `best-seller`, `sale` |
| `imageColors` | JSON string | Optional array matched to uploaded file order, example `["Black","White"]` |
| `existingImageColors` | JSON string | Optional update-only array matched to `existingImages` order, example `["Black","White"]` |
| `existingImages` | JSON string | Update only. Array of current image objects to keep before appending newly uploaded files |
| `basePrice`, `salePrice`, `category`, `slug`, `isActive` | form fields | Normal scalar fields. `category` is optional when `categories` is sent. |

For multipart requests, omit `salePrice` entirely when creating a product with no sale. Empty string
and the string `"null"` are not valid numbers. To remove an existing sale, send a JSON PATCH with
`"salePrice": null`; multipart scalar parsing does not convert `"null"` to JavaScript `null`.

Product photo workflow:

1. On create, send product data plus photo files as `multipart/form-data`; backend uploads the original selected files to Cloudinary and stores the returned absolute `url` and `publicId`.
2. On update with only new photos, send files in `images`; backend appends them to the product's current images.
3. On update when removing/reordering old photos, send `existingImages` as the exact image objects to keep, then optionally send new files in `images`; backend saves `existingImages + uploadedImages`.
4. To edit selected colors for existing photos, either update each object in `existingImages` with its new `color`, or send `existingImageColors` as an array aligned to `existingImages`.
5. Any current product image omitted from `existingImages` is deleted from Cloudinary after the product update succeeds.
6. Deleting a product also removes all of its product photo files from Cloudinary.
7. Do not send external product photo links as the normal admin upload workflow. New photos should be sent as files.

Multipart upload example:

```js
const form = new FormData();
form.append("name", JSON.stringify({ ar: "Arabic Black T-shirt", en: "Black T-shirt" }));
form.append("description", JSON.stringify({ ar: "Arabic Cotton t-shirt", en: "Cotton t-shirt" }));
form.append("categories", JSON.stringify([
  "64f000000000000000000020",
  "64f000000000000000000021"
]));
form.append("collections", JSON.stringify(["64f000000000000000000021"]));
form.append("basePrice", "500");
form.append("salePrice", "450");
form.append("variants", JSON.stringify([
  {
    sku: "TEE-BLK-M",
    size: "M",
    color: { name: "Black", hex: "#000000" },
    stock: 10,
    priceOverride: null
  }
]));
form.append("badges", JSON.stringify(["new"]));
form.append("imageColors", JSON.stringify(["Black"]));
form.append("images", fileInput.files[0]);

await fetch(`${API_URL}/products`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form
});
```

Product list response:

```json
{
  "success": true,
  "message": "Products fetched",
  "data": {
    "products": [
      {
        "_id": "64f000000000000000000010",
        "name": { "ar": "Arabic Black T-shirt", "en": "Black T-shirt" },
        "slug": "black-t-shirt",
        "description": { "ar": "Arabic Cotton t-shirt", "en": "Cotton t-shirt" },
        "category": {
          "_id": "64f000000000000000000020",
          "name": { "ar": "Arabic Men", "en": "Men" },
          "slug": "men"
        },
        "categories": [
          {
            "_id": "64f000000000000000000020",
            "name": { "ar": "Arabic Men", "en": "Men" },
            "slug": "men"
          }
        ],
        "collections": [],
        "basePrice": 500,
        "salePrice": 450,
        "images": [],
        "variants": [],
        "badges": ["new"],
        "isActive": true,
        "sold": 0,
        "views": 0,
        "ratingAvg": 0,
        "ratingCount": 0
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "pages": 1
  }
}
```

Product validation rules:

| Field | Rules |
| --- | --- |
| `name.ar`, `name.en` | required on create, 1-180 chars |
| `description.ar`, `description.en` | required on create, 1-180 chars |
| `slug` | optional lowercase max 220 chars; generated from name if omitted |
| `category` | optional 24-char ObjectId when `categories` is sent; used as the primary category |
| `categories[]` | one or more 24-char ObjectIds on create unless `category` is sent |
| `collections[]` | optional 24-char ObjectIds |
| `basePrice` | required on create, number >= 0 |
| `salePrice` | number >= 0 or `null` |
| `variants[]` | required on create, at least 1 item |
| `variants[].sku` | required, max 80 chars |
| `variants[].size` | required, max 20 chars |
| `variants[].color.name` | required, max 80 chars |
| `variants[].stock` | integer >= 0, default `0` |
| `variants[].priceOverride` | number >= 0 or `null`, default `null` |
| `badges[]` | `new`, `best-seller`, `sale` |
| `images` multipart files | optional product photos, max 8 files, max 15MB each, image MIME only |
| `imageColors[]` | optional uploaded-photo colors, matched by file order |
| `existingImageColors[]` | optional update-only existing-photo colors, matched by `existingImages` order |
| `existingImages[]` | update only, current image objects to keep |

### Product Price Contract

The backend calculates the effective unit price for a selected variant in this exact priority order:

```js
effectiveUnitPrice = variant.priceOverride ?? product.salePrice ?? product.basePrice;
```

| Field | Meaning | When it becomes the charged price |
| --- | --- | --- |
| `basePrice` | Required regular/list price | Only when both `priceOverride` and `salePrice` are `null` or missing |
| `salePrice` | Optional product-wide selling price | When it is not `null`/missing and the variant has no override |
| `variants[].priceOverride` | Optional price for one specific variant | Whenever it is not `null`/missing; this has highest priority |

The operator is nullish coalescing, so `0` is a real price and does not fall back. To represent no sale,
send `salePrice: null` or omit `salePrice` during creation. On update, omitting `salePrice` preserves its
current value; send `salePrice: null` to remove a current sale. Sending `salePrice` equal to `basePrice`
produces the same charged price but still leaves a non-null sale price in the product data.

The backend does not currently require `salePrice < basePrice`, and it does not require
`priceOverride < basePrice`. The frontend may choose how to label a sale, but it must use the cart's
returned `unitPrice` for the amount shown at checkout.

For each cart line:

```text
lineTotal = roundTo2(effectiveUnitPrice * qty)
subtotal  = roundTo2(sum(lineTotal))
```

The selected variant must exist by `variantId` or `sku`; a product cannot be ordered without a valid
variant even when its base or sale price is present.

## Review APIs

Public product reviews only return approved reviews. Submitted reviews are created as unapproved and must be approved by an admin.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/reviews/product/:productId` | Public | pagination query | `200`, `data: { reviews }`, `meta` |
| `POST` | `/reviews/product/:productId` | Optional user | `{ guestName?, rating, comment? }` | `201`, `data: { review }` |
| `GET` | `/reviews/admin` | Admin | `page`, `limit`, `productId?`, `isApproved?` | `200`, `data: { reviews }`, `meta` |
| `PATCH` | `/reviews/:id/approve` | Admin | no body | `200`, `data: { review }`, recalculates product rating |
| `DELETE` | `/reviews/:id` | Admin | no body | `204 No Content`, recalculates product rating |

Create review request:

```json
{
  "guestName": "Guest Customer",
  "rating": 5,
  "comment": "Great quality."
}
```

If the user is authenticated, the backend uses `req.user.name` and ignores `guestName`. If the user is not authenticated, `guestName` is required.

Review response:

```json
{
  "success": true,
  "message": "Review submitted for approval",
  "data": {
    "review": {
      "_id": "64f000000000000000000050",
      "product": "64f000000000000000000010",
      "user": null,
      "guestName": "Guest Customer",
      "rating": 5,
      "comment": "Great quality.",
      "isVerifiedPurchase": false,
      "isApproved": false,
      "createdAt": "2026-07-11T12:00:00.000Z",
      "updatedAt": "2026-07-11T12:00:00.000Z"
    }
  }
}
```

Validation rules:

| Field | Rules |
| --- | --- |
| `rating` | required integer from `1` to `5` |
| `guestName` | 2-80 chars, required for guests |
| `comment` | optional max 1500 chars |

## Coupon APIs

`/coupons/validate` is public/optional-auth for storefront checkout. Coupon CRUD is admin-only.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/coupons/validate` | Optional user | `{ code, subtotal }` | `200`, `data: { coupon }` |
| `GET` | `/coupons` | Admin | `page`, `limit`, `isActive?`, `search?`, `sort?` | `200`, `data: { coupons }`, `meta` |
| `GET` | `/coupons/:id` | Admin | no body | `200`, `data: { coupon }` |
| `POST` | `/coupons` | Admin | coupon body | `201`, `data: { coupon }` |
| `PATCH` | `/coupons/:id` | Admin | partial coupon body | `200`, `data: { coupon }` |
| `DELETE` | `/coupons/:id` | Admin | no body | `204 No Content`, permanently deletes the coupon |

Create coupon request:

```json
{
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "minOrderTotal": 300,
  "maxDiscount": 150,
  "expiresAt": "2026-08-31T23:59:59.000Z",
  "usageLimit": 100,
  "isActive": true
}
```

Coupon write rules:

| Field | Rules |
| --- | --- |
| `code` | required on create, trimmed/uppercased, max 40 chars |
| `type` | required on create: `percent` or `fixed` |
| `value` | required on create, number >= 0; percent values are not capped at 100 by validation |
| `minOrderTotal` | number >= 0, default `0` |
| `maxDiscount` | number >= 0 or `null`, default `null` |
| `expiresAt` | ISO date or `null`, default `null` |
| `usageLimit` | integer >= 0 or `null`, default `null`; `0` makes the coupon immediately unavailable |
| `isActive` | boolean, default `true` |

`usedCount` and `usedBy` are maintained by order/payment workflows and are not accepted by coupon
create/update validation.

Pausing and deleting are separate operations. Use `PATCH /coupons/:id` with `isActive: false` to pause
a coupon while keeping it available to the admin API, and patch it back to `true` to resume it. Use
`DELETE /coupons/:id` for permanent deletion; afterward the coupon is absent from list/detail and
validation APIs, and its code can be created again.

Validate coupon request:

```json
{
  "code": "SUMMER20",
  "subtotal": 900
}
```

Validate coupon response:

```json
{
  "success": true,
  "message": "Coupon validated",
  "data": {
    "coupon": {
      "code": "SUMMER20",
      "type": "percent",
      "value": 20,
      "minOrderTotal": 300,
      "maxDiscount": 150,
      "discountAmount": 150,
      "totalAfterDiscount": 750
    }
  }
}
```

Coupon validation checks:

| Rule | Error |
| --- | --- |
| Coupon missing | `404 Coupon not found` |
| Inactive | `400 Coupon is inactive` |
| Expired | `400 Coupon has expired` |
| Usage limit reached | `400 Coupon usage limit reached` |
| Subtotal below minimum | `400 Minimum order total for this coupon is <amount>` |
| Authenticated user already used it | `400 Coupon was already used by this account` |

Coupon calculations use the supplied/backend-calculated subtotal before shipping:

```text
percent raw discount = subtotal * (value / 100)
fixed raw discount   = value
discountAmount       = roundTo2(min(raw discount, maxDiscount when set, subtotal))
totalAfterDiscount   = subtotal - discountAmount
```

`minOrderTotal` is compared with the subtotal after variant overrides and product sale prices have
been applied, but before the coupon discount and before shipping. For example, items with a combined
base price of `3500` but an effective sale-price subtotal of `900` fail a coupon whose
`minOrderTotal` is `1000`.

`POST /coupons/validate` uses the `subtotal` sent by the caller and is therefore only a preview helper.
It does not load products or recalculate cart prices. For checkout, use the subtotal and discount from
`POST /cart/validate`; `POST /orders` recalculates everything again and remains authoritative.

When the minimum is not met, the error includes machine-readable values:

```json
{
  "success": false,
  "message": "Minimum order total for this coupon is 1000",
  "data": {
    "couponCode": "SUMMER20",
    "subtotal": 900,
    "minOrderTotal": 1000
  }
}
```

Per-account reuse is checked only when an access token resolves to a user. The global `usageLimit`,
active state, and expiration checks apply to both guests and authenticated users.

## Cart APIs

Cart is not persisted. This endpoint validates current stock/pricing and optionally coupon discount.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/cart/validate` | Optional user | `{ items, couponCode? }` | `200`, `data: { cart }` |

Cart validation request:

```json
{
  "items": [
    {
      "product": "64f000000000000000000010",
      "variantId": "64f000000000000000000011",
      "qty": 2
    },
    {
      "product": "64f000000000000000000012",
      "sku": "HOODIE-BLK-L",
      "qty": 1
    }
  ],
  "couponCode": "SUMMER20"
}
```

Each item must include either `variantId` or `sku`.

Cart validation response:

```json
{
  "success": true,
  "message": "Cart validated",
  "data": {
    "cart": {
      "items": [
        {
          "product": "64f000000000000000000010",
          "productName": { "ar": "Arabic T-shirt", "en": "T-shirt" },
          "slug": "t-shirt",
          "image": null,
          "variantId": "64f000000000000000000011",
          "sku": "TEE-BLK-M",
          "size": "M",
          "color": { "name": "Black", "hex": "#000000" },
          "qty": 2,
          "availableQty": 8,
          "unitPrice": 450,
          "lineTotal": 900,
          "inStock": true
        }
      ],
      "unavailableItems": [],
      "subtotal": 900,
      "discount": {
        "couponCode": "SUMMER20",
        "amount": 150
      },
      "total": 750,
      "isValid": true
    }
  }
}
```

Unavailable item shape:

```json
{
  "product": "64f000000000000000000010",
  "productName": { "ar": "Arabic T-shirt", "en": "T-shirt" },
  "variantId": "64f000000000000000000011",
  "sku": "TEE-BLK-M",
  "size": "M",
  "color": { "name": "Black", "hex": "#000000" },
  "requestedQty": 10,
  "availableQty": 3,
  "reason": "Insufficient stock"
}
```

Cart pricing behavior:

1. The request sends only product identity, variant identity, and quantity. Client-supplied prices are
   not accepted.
2. If both `variantId` and `sku` are sent, the backend tries `variantId` first and falls back to `sku`
   when that ID is stale or no longer exists.
3. `unitPrice` follows `priceOverride ?? salePrice ?? basePrice`; `lineTotal` and `subtotal` are rounded
   to two decimal places.
4. A low-stock line is still present in `items` and the subtotal, but also appears in
   `unavailableItems`, making `isValid: false`. A missing/inactive product or missing variant appears
   only in `unavailableItems`.
5. A coupon error returns an HTTP error response; it does not return a successful cart with zero
   discount.
6. `cart.total` equals `subtotal - discount.amount`. It does not include shipping.

The frontend should replace its displayed checkout line prices, subtotal, discount, and cart total
with this response. Do not continue to order creation while `cart.isValid` is `false`.

## Order APIs

Checkout supports guest and authenticated users. If the frontend has an access token, send it so the order is linked to the user and coupon usage can be tracked per account.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/orders` | Optional user | order create body | `201`, `data: { order }` |
| `GET` | `/orders/track?orderNumber=&contact=` | Public | query params | `200`, `data: { order }` |
| `POST` | `/orders/:id/cancel` | Optional user | `{ contact?, reason? }` | `200`, `data: { order }` |
| `GET` | `/orders` | Admin | filters and pagination | `200`, `data: { orders }`, `meta` |
| `GET` | `/orders/:id` | Admin | no body | `200`, `data: { order }` |
| `PATCH` | `/orders/:id/status` | Admin | `{ status, note? }` | `200`, `data: { order }` |
| `PATCH` | `/orders/:id/courier` | Admin | `{ name?, trackingNumber?, trackingUrl? }` | `200`, `data: { order }` |

Create order request:

```json
{
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "01000000000"
  },
  "shippingAddress": {
    "governorate": "Cairo",
    "city": "Nasr City",
    "street": "Main Street",
    "apartment": "12A",
    "postal": ""
  },
  "items": [
    {
      "product": "64f000000000000000000010",
      "variantId": "64f000000000000000000011",
      "qty": 2
    }
  ],
  "couponCode": "SUMMER20",
  "paymentMethod": "cod"
}
```

Order create validation:

| Field | Rules |
| --- | --- |
| `customer.name` | required, 2-100 chars |
| `customer.email` | valid email or empty string, default `""` |
| `customer.phone` | required, 5-30 chars |
| `shippingAddress.governorate`, `city` | required, max 80 chars |
| `shippingAddress.street` | required, max 220 chars |
| `shippingAddress.apartment` | optional, max 80 chars, default `""` |
| `shippingAddress.postal` | optional, max 40 chars, default `""` |
| `items` | required non-empty array; each item needs a product ObjectId, `variantId` or `sku`, and `qty` from 1-99 |
| `couponCode` | optional, trimmed/uppercased, max 40 chars |
| `paymentMethod` | required: `cod` or `paymob` |

Client-calculated subtotal, discount, shipping fee, total, product name, and unit price are not
accepted in this request.

Create order behavior:

| Payment Method | Behavior |
| --- | --- |
| `cod` | Stock is decremented immediately. Coupon usage is incremented immediately. `paymentStatus` stays `pending`. |
| `paymob` | Stock and coupon usage are updated after successful Paymob webhook. Use `/payments/paymob/intent` after creating the order. |

Order total calculation is:

```text
effective unit price = variant.priceOverride ?? product.salePrice ?? product.basePrice
subtotal             = sum(roundTo2(effective unit price * qty))
discount             = coupon calculated from subtotal
cart total           = subtotal - discount
shipping fee         = 0 when freeShippingThreshold is set and cart total >= threshold;
                       otherwise the active governorate zone fee
order total          = roundTo2(cart total + shipping fee)
```

Free-shipping eligibility is therefore checked after the coupon discount, not against the original
subtotal. `freeShippingThreshold: null` means there is no free-shipping threshold and the zone fee is
charged. The shipping zone must be active and its governorate must match the submitted governorate
case-insensitively.

`POST /orders` repeats product, variant, stock, price, coupon, and shipping validation. Values shown by
an earlier cart validation can change before order creation, so the returned order is the final source
of truth. The order stores each effective `unitPrice` as a snapshot; later product price edits do not
change an existing order.

Create order response:

```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "order": {
      "_id": "64f000000000000000000040",
      "orderNumber": "RZ-2026-00001",
      "subtotal": 900,
      "shippingFee": 50,
      "discount": {
        "couponCode": "SUMMER20",
        "amount": 150
      },
      "total": 800,
      "paymentMethod": "cod",
      "paymentStatus": "pending",
      "status": "pending",
      "items": []
    }
  }
}
```

Track order request:

```http
GET /api/v1/orders/track?orderNumber=RZ-2026-00001&contact=01000000000
```

`contact` must match the order customer phone or email.

Cancel order request:

```json
{
  "contact": "01000000000",
  "reason": "Changed my mind"
}
```

Guests must provide matching `contact`. Authenticated owners and admins can cancel without contact. Only `pending` and `confirmed` orders can be cancelled.

Cancellation restores stock for COD orders and paid Paymob orders. COD cancellation also decrements
coupon usage. The current backend does not decrement coupon usage when a paid Paymob order is cancelled.

Admin order list query params:

| Query | Type | Notes |
| --- | --- | --- |
| `page`, `limit` | number | Pagination |
| `status` | string | Order status |
| `paymentStatus` | string | Payment status |
| `paymentMethod` | string | `cod` or `paymob` |
| `from` | ISO date | Start created date |
| `to` | ISO date | End created date |
| `search` | string | Matches order number, customer name, email, phone |

Admin status update request:

```json
{
  "status": "shipped",
  "note": "Handed to courier"
}
```

The admin status endpoint accepts any listed status regardless of the current status. It records a
history entry and sends a status email, but it does not change stock, coupon usage, or payment status.

Admin courier update request:

```json
{
  "name": "bosta",
  "trackingNumber": "BOSTA123",
  "trackingUrl": "https://tracking.example.com/BOSTA123"
}
```

## Shipping Zone APIs

Public list returns active shipping zones. Admin detail/write endpoints require Bearer admin token.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `GET` | `/shipping-zones` | Public | no body | `200`, `data: { zones }` |
| `GET` | `/shipping-zones/:id` | Admin | no body | `200`, `data: { zone }` |
| `POST` | `/shipping-zones` | Admin | zone body | `201`, `data: { zone }` |
| `PATCH` | `/shipping-zones/:id` | Admin | partial zone body | `200`, `data: { zone }` |
| `DELETE` | `/shipping-zones/:id` | Admin | no body | `204 No Content`, soft deletes by `isActive=false` |

Shipping zone request:

```json
{
  "governorate": "Cairo",
  "fee": 50,
  "estimatedDays": "1-3 working days",
  "isActive": true
}
```

Shipping zone response:

```json
{
  "success": true,
  "message": "Shipping zones fetched",
  "data": {
    "zones": [
      {
        "_id": "64f000000000000000000060",
        "governorate": "Cairo",
        "fee": 50,
        "estimatedDays": "1-3 working days",
        "isActive": true,
        "createdAt": "2026-07-11T12:00:00.000Z",
        "updatedAt": "2026-07-11T12:00:00.000Z"
      }
    ]
  }
}
```

Orders can only be created for active zones matching `shippingAddress.governorate` case-insensitively.

## Payment APIs

### `POST /payments/paymob/intent`

Creates a Paymob checkout intent for an existing `paymob` order.

Auth: optional user. Send Bearer token if the order belongs to a logged-in user. Guests should send a matching `contact` when available. For immediate guest checkout, the backend also allows payment intent creation by `orderId` when the order has no linked user, uses `paymentMethod: "paymob"`, has `paymentStatus: "pending"`, and status is `pending` or `confirmed`.

Request:

```json
{
  "orderId": "64f000000000000000000040",
  "contact": "01000000000",
  "redirectionUrl": "https://frontend.example.com/payment/callback",
  "notificationUrl": "https://api.example.com/api/v1/payments/paymob/webhook"
}
```

`redirectionUrl` and `notificationUrl` are sent to Paymob only for the unified checkout flow. The
legacy iframe flow ignores both fields and uses the callback URLs configured in the Paymob dashboard.

Unified checkout response:

```json
{
  "success": true,
  "message": "Paymob payment intent created",
  "data": {
    "payment": {
      "provider": "paymob",
      "flow": "unified_checkout",
      "orderId": "64f000000000000000000040",
      "orderNumber": "RZ-2026-00001",
      "paymobOrderId": "123456",
      "clientSecret": "paymob_client_secret",
      "publicKey": "paymob_public_key",
      "checkoutUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
      "redirectUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=..."
    }
  }
}
```

Legacy iframe response:

```json
{
  "success": true,
  "message": "Paymob payment intent created",
  "data": {
    "payment": {
      "provider": "paymob",
      "flow": "legacy_iframe",
      "orderId": "64f000000000000000000040",
      "orderNumber": "RZ-2026-00001",
      "paymobOrderId": "123456",
      "paymentKey": "paymob_payment_key",
      "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/<iframeId>?payment_token=<paymentKey>",
      "redirectUrl": "https://accept.paymob.com/api/acceptance/iframes/<iframeId>?payment_token=<paymentKey>"
    }
  }
}
```

Frontend flow:

1. Read `/storefront-settings` and show Paymob only when `settings.payments.paymob.active` is `true`.
2. Validate the cart, then create one order with `paymentMethod: "paymob"`. The new order is still
   `status: "pending"` and `paymentStatus: "pending"`.
3. Call `/payments/paymob/intent` once with the returned `order._id` and the matching guest contact when
   applicable.
4. Redirect the top-level browser window with `window.location.assign(payment.redirectUrl)`. Do not
   treat creation of the intent or a browser return as successful payment.
5. After return, call `/orders/track` with `orderNumber` and customer phone/email. Payment is confirmed
   only when the Paymob webhook has changed the order to `paymentStatus: "paid"` and
   `status: "confirmed"`.

Do not create another order when retrying the redirect for a still-pending order; request another
intent for the existing order. If Paymob sends a final failed transaction, the webhook changes the
order to `paymentStatus: "failed"` and `status: "cancelled"`.

Backend checkout mode is controlled by `PAYMOB_CHECKOUT_FLOW`:

| Value | Behavior |
| --- | --- |
| `auto` | Uses unified checkout when `PAYMOB_SECRET_KEY` and `PAYMOB_PUBLIC_KEY` exist; otherwise uses legacy iframe. |
| `legacy_iframe` | Forces legacy iframe even when unified checkout keys exist. Useful when Paymob test mode should open the card simulator iframe. |

### `POST /payments/paymob/webhook`

Paymob server-to-server webhook. This is not normally called by the frontend.

Auth: public, protected by Paymob HMAC in `?hmac=` query or body `hmac`.

Request:

```json
{
  "obj": {
    "id": "700000",
    "success": true,
    "pending": false,
    "order": {
      "id": "900000",
      "merchant_order_id": "RZ-2026-00001"
    },
    "amount_cents": 95000,
    "currency": "EGP"
  }
}
```

The real Paymob payload includes additional HMAC fields. The backend verifies all required fields before updating the order.

Response:

```json
{
  "success": true,
  "message": "Paymob webhook processed",
  "data": {
    "orderNumber": "RZ-2026-00001",
    "transactionId": "700000",
    "success": true
  }
}
```

Webhook behavior:

| Paymob Result | Backend Update |
| --- | --- |
| `success: true` | Decrements stock, increments coupon usage, sets `paymentStatus: "paid"`, sets order `status: "confirmed"` |
| Not success and not pending | Sets `paymentStatus: "failed"`, sets order `status: "cancelled"` |
| Duplicate success webhook | Idempotent for stock because stock decrements only if order is not already paid |

## Courier APIs

All courier endpoints require Bearer admin token.

| Method | Path | Request | Success Response |
| --- | --- | --- | --- |
| `GET` | `/couriers/providers` | no body | `200`, `data: { providers }` |
| `POST` | `/couriers/orders/:orderId/tracking` | tracking body | `200`, `data: { order }` |
| `GET` | `/couriers/mylerz/warehouses` | no body | `200`, `data: { warehouses }` |
| `GET` | `/couriers/mylerz/city-zones` | no body | `200`, `data: { zones }` |
| `POST` | `/couriers/mylerz/expected-charges` | charges body | `200`, `data: { charges }` |
| `POST` | `/couriers/mylerz/orders/:orderId/shipment` | shipment body | `200`, `data: { order, mylerz }` |
| `GET` | `/couriers/mylerz/packages/:awb/status` | no body | `200`, `data: { status }` |
| `GET` | `/couriers/mylerz/packages/:awb/details` | no body | `200`, `data: { details }` |
| `GET` | `/couriers/mylerz/packages/:awb/tracking` | no body | `200`, `data: { tracking }` |
| `GET` | `/couriers/mylerz/packages/:awb/tracking-url` | no body | `200`, `data: { trackingUrl }` |
| `POST` | `/couriers/mylerz/packages/:awb/cancel` | `{ referenceNumber? }` | `200`, `data: { result }` |

Providers response:

```json
{
  "success": true,
  "message": "Courier providers fetched",
  "data": {
    "providers": [
      { "id": "bosta", "label": "Bosta" },
      { "id": "mylerz", "label": "Mylerz" },
      { "id": "manual", "label": "Manual" }
    ]
  }
}
```

Assign tracking request:

```json
{
  "name": "bosta",
  "trackingNumber": "BOSTA123",
  "trackingUrl": "https://tracking.example.com/BOSTA123",
  "markAsShipped": true,
  "note": "Courier picked up the order"
}
```

If `markAsShipped` is `true`, the backend sets `status` to `shipped`, adds a status-history entry, and sends a status email.

### Mylerz Configuration

Mylerz credentials and defaults are configured through env vars:

```text
MYLERZ_BASE_URL=https://mylerzintegrationtest.mylerz.com
MYLERZ_USERNAME=
MYLERZ_PASSWORD=
MYLERZ_MERCHANT_ID=
MYLERZ_WAREHOUSE_NAME=
MYLERZ_DEFAULT_SERVICE_TYPE=DTD
MYLERZ_DEFAULT_SERVICE=ND
MYLERZ_DEFAULT_SERVICE_CATEGORY=DELIVERY
MYLERZ_DEFAULT_ADDRESS_CATEGORY=H
MYLERZ_DEFAULT_PRODUCT_CATEGORY=Fashion
MYLERZ_DEFAULT_WEIGHT_KG=1
MYLERZ_CURRENCY=EGP
```

Use the test URL for sandbox and switch `MYLERZ_BASE_URL` to `https://integration.mylerz.net` for production after Mylerz confirms live credentials.

### Mylerz Shipment Creation

Create a Mylerz shipment from an existing ROMZ order:

```http
POST /api/v1/couriers/mylerz/orders/:orderId/shipment
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

Minimal request:

```json
{
  "cityCode": "Cairo",
  "neighborhoodCode": "Maadi",
  "districtCode": ""
}
```

Useful optional fields:

```json
{
  "warehouseName": "Maadi",
  "pickupDueDate": "2026-07-13T10:00:00.000Z",
  "packageSerial": 1,
  "reference": "RZ-2026-00001",
  "description": "ROMZ fashion order",
  "totalWeight": 1,
  "serviceType": "DTD",
  "service": "ND",
  "serviceDate": null,
  "serviceCategory": "DELIVERY",
  "addressCategory": "H",
  "buildingNo": "5",
  "floorNo": "2",
  "apartmentNo": "4",
  "geolocation": "29.9602,31.2569",
  "productCategory": "Fashion",
  "dimensions": "20*30*40",
  "specialNotes": "Call before delivery",
  "pieces": [
    {
      "pieceNo": 1,
      "weight": 1,
      "itemCategory": "Fashion",
      "dimensions": "20*30*40",
      "specialNotes": ""
    }
  ]
}
```

All shipment body fields are optional at backend validation level. Missing warehouse/service/weight
values fall back to the corresponding `MYLERZ_*` environment values, pickup date defaults to tomorrow,
city falls back to the order city, and neighborhood falls back to the order governorate. Mylerz can
still reject the request when those fallback values do not match the merchant account's lookup data.

Expected charges request (`POST /couriers/mylerz/expected-charges`):

```json
{
  "codValue": 800,
  "warehouseName": "Maadi",
  "customerZoneCode": "CAI-MAADI",
  "packageWeight": 1,
  "isFulfillment": false,
  "packageServiceTypeCode": "DTD",
  "packageServiceCode": "ND",
  "paymentTypeCode": "COD",
  "serviceCategoryCode": "DELIVERY"
}
```

Every field in this expected-charges example is required except `isFulfillment`, which defaults to
`false`. Warehouse, zone, and service codes should come from the Mylerz lookup responses rather than
frontend labels.

Behavior:

| ROMZ Payment | Mylerz Payment |
| --- | --- |
| `cod` | Sends `Payment_Type: "COD"` and `COD_Value: order.total` |
| `paymob` | Sends `Payment_Type: "PP"` and `COD_Value: 0` |

On success, the backend stores Mylerz data on `order.courier`:

```json
{
  "name": "mylerz",
  "trackingNumber": "63745880428001",
  "pickupOrderCode": "63745880428",
  "reference": "RZ-2026-00001",
  "status": "Uploaded",
  "lastSyncedAt": "2026-07-12T20:00:00.000Z"
}
```

Before using shipment creation in production, the admin UI should call:

1. `GET /couriers/mylerz/warehouses` to select the exact `warehouseName`.
2. `GET /couriers/mylerz/city-zones` to map checkout governorate/city to Mylerz `cityCode`, `neighborhoodCode`, and optional `districtCode`.
3. `POST /couriers/mylerz/expected-charges` if you want to preview Mylerz charges before shipment creation.

## Analytics APIs

All analytics endpoints require Bearer admin token.

Common query params:

| Query | Type | Default | Notes |
| --- | --- | --- | --- |
| `from` | ISO date | 30 days before `to` | Range start |
| `to` | ISO date | now | Range end |
| `granularity` | string | `day` | `day`, `week`, `month`; used by revenue series |
| `limit` | number | `10` | 1-100; used by best sellers and low stock |

Analytics responses are cached for 5 minutes when Redis is configured. Revenue overview, revenue
series, items sold, average order value, and best sellers count paid Paymob orders and delivered COD
orders. Orders-by-status counts all orders in the date range. Coupon analytics counts all orders with a
coupon in the date range regardless of status. Payment split also counts and sums all orders regardless
of payment/order status; `codFailureReturnRate` is the percentage of COD orders that are cancelled or
returned.

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/analytics/overview` | `data: { range, revenue, orders, averageOrderValue, itemsSold, pendingOrders, lowStock }` |
| `GET` | `/analytics/revenue-series` | `data: { series }` |
| `GET` | `/analytics/orders-by-status` | `data: { statuses }` |
| `GET` | `/analytics/best-sellers` | `data: { products }` |
| `GET` | `/analytics/low-stock` | `data: { variants }` |
| `GET` | `/analytics/coupons` | `data: { coupons }` |
| `GET` | `/analytics/payment-split` | `data: { split, codFailureReturnRate }` |

Overview response:

```json
{
  "success": true,
  "message": "Analytics overview fetched",
  "data": {
    "range": {
      "from": "2026-06-11T00:00:00.000Z",
      "to": "2026-07-11T23:59:59.999Z"
    },
    "revenue": {
      "value": 12500,
      "changePercent": 20
    },
    "orders": {
      "value": 30,
      "changePercent": 15.5
    },
    "averageOrderValue": {
      "value": 416.67,
      "changePercent": 3
    },
    "itemsSold": {
      "value": 55,
      "changePercent": 18.2
    },
    "pendingOrders": {
      "value": 4
    },
    "lowStock": {
      "value": 6,
      "threshold": 5
    }
  }
}
```

Revenue series response:

```json
{
  "success": true,
  "message": "Revenue series fetched",
  "data": {
    "series": [
      {
        "period": "2026-07-11",
        "revenue": 1250,
        "orders": 3,
        "byPaymentMethod": [
          {
            "paymentMethod": "cod",
            "revenue": 750,
            "orders": 2
          },
          {
            "paymentMethod": "paymob",
            "revenue": 500,
            "orders": 1
          }
        ]
      }
    ]
  }
}
```

Orders by status response:

```json
{
  "success": true,
  "message": "Orders by status fetched",
  "data": {
    "statuses": [
      {
        "status": "pending",
        "count": 4
      }
    ]
  }
}
```

Best sellers response:

```json
{
  "success": true,
  "message": "Best sellers fetched",
  "data": {
    "products": [
      {
        "product": "64f000000000000000000010",
        "name": { "ar": "Arabic T-shirt", "en": "T-shirt" },
        "slug": "t-shirt",
        "image": null,
        "qty": 10,
        "revenue": 4500
      }
    ]
  }
}
```

Low stock response:

```json
{
  "success": true,
  "message": "Low stock fetched",
  "data": {
    "variants": [
      {
        "product": "64f000000000000000000010",
        "name": { "ar": "Arabic T-shirt", "en": "T-shirt" },
        "slug": "t-shirt",
        "sku": "TEE-BLK-M",
        "size": "M",
        "color": { "name": "Black", "hex": "#000000" },
        "stock": 3,
        "threshold": 5
      }
    ]
  }
}
```

Coupon analytics response:

```json
{
  "success": true,
  "message": "Coupon analytics fetched",
  "data": {
    "coupons": [
      {
        "code": "SUMMER20",
        "type": "percent",
        "value": 20,
        "uses": 5,
        "totalDiscountGiven": 600,
        "revenueGenerated": 3000
      }
    ]
  }
}
```

Payment split response:

```json
{
  "success": true,
  "message": "Payment split fetched",
  "data": {
    "split": [
      {
        "paymentMethod": "cod",
        "orders": 20,
        "revenue": 9000
      },
      {
        "paymentMethod": "paymob",
        "orders": 10,
        "revenue": 3500
      }
    ],
    "codFailureReturnRate": 5
  }
}
```

## Frontend Integration Checklist

1. Store `accessToken` after register/login/refresh. Use either the HTTP-only refresh cookie or the
   returned `refreshToken`; avoid sending conflicting values because the cookie has priority.
2. Enable `credentials: "include"` on register, login, refresh, and logout when using the cookie flow.
3. Add `Authorization: Bearer <accessToken>` for protected user/admin calls. Optional-auth endpoints
   behave as guest calls when the header is absent, but an invalid/expired Bearer token still returns
   `401`.
4. For product display, use the selected variant override first, then sale price, then base price. At
   checkout, replace frontend calculations with `/cart/validate` response values.
5. Treat no sale as `salePrice: null`/omitted. Do not send an empty string, and do not use `0` unless the
   product is intentionally free.
6. Pass the backend-priced subtotal to coupon preview UI. Remember that coupon minimums are checked
   after sale/variant pricing and before coupon discount/shipping.
7. Use `/shipping-zones` to limit governorates. Display the final shipping fee from the created order;
   free-shipping eligibility uses the post-coupon cart total.
8. Create the order once. For Paymob, call `/payments/paymob/intent`, redirect to `payment.redirectUrl`,
   and wait for webhook-updated order status before showing success.
9. Use `/orders/track` with exact order number and matching customer phone/email for guest status and
   payment-return pages.
10. Handle `204 No Content` without trying to parse JSON.
