# ROMZ Frontend API Documentation

This document describes every mounted API in the ROMZ backend for frontend integration.

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

For refresh-token requests, send browser credentials/cookies:

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

Product photos are uploaded with Multer using `multipart/form-data`. Send product photo files in the `images` field, up to 8 files per request. Category photos are uploaded with a single `image` file field. When using multipart, send structured fields such as `name`, `description`, `categories`, `collections`, `variants`, `badges`, `existingImages`, and `imageColors` as JSON strings.

CORS is open. The API reflects the request origin and allows credentials, so browser clients on localhost, tunnels, or deployed domains can call the API without adding their origin to `CLIENT_ORIGINS`.

## Response Envelope

All JSON success responses use:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {}
}
```

`meta` appears on paginated endpoints. Delete/logout endpoints may return `204 No Content` with no body.

All JSON errors use:
هةش
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

Rate-limited endpoints:

| Area | Limit |
| --- | --- |
| Register/login | 20 requests per 15 minutes |
| Verify/resend OTP | 8 requests per 15 minutes |
| Forgot/reset password | 5 requests per 60 minutes |
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
  "url": "/uploads/products/product.jpg",
  "publicId": "uploads/products/product.jpg",
  "color": "Black"
}
```

Product and category image `url` and `publicId` are created by the backend after Multer receives the file and saves it under `/uploads`. `color` exists on product images and can be set for uploaded files with `imageColors`. Category images only use `url` and `publicId`.

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

Refresh tokens are set as HTTP-only cookies named by `JWT_REFRESH_COOKIE_NAME`, default `romz_refresh`. They are intentionally not returned in JSON. Access tokens are returned in JSON and should be sent in `Authorization: Bearer <accessToken>`.

Cookie defaults are environment-aware:

| Environment | Default Cookie Settings |
| --- | --- |
| development | `HttpOnly`, `SameSite=Lax`, not `Secure`, works on local HTTP |
| production | `HttpOnly`, `Secure`, `SameSite=None`, `Partitioned`, for deployed HTTPS/cross-site clients |

You can override with `JWT_REFRESH_COOKIE_SECURE`, `JWT_REFRESH_COOKIE_SAME_SITE`, and `JWT_REFRESH_COOKIE_PARTITIONED`.

| Method | Path | Auth | Request | Success Response |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | `{ name, email, password, phone? }` | `201`, `data: { user, accessToken }`, sets refresh cookie |
| `POST` | `/auth/login` | Public | `{ email, password }` | `200`, `data: { user, accessToken }`, sets refresh cookie |
| `POST` | `/auth/verify-email` | Public | `{ email, code }` where `code` is 6 digits | `200`, `data: { user }` |
| `POST` | `/auth/resend-otp` | Public | `{ email }` | `200`, `data: null` |
| `POST` | `/auth/refresh` | Refresh cookie | no body | `200`, `data: { user, accessToken }`, rotates refresh cookie |
| `POST` | `/auth/logout` | Refresh cookie optional | no body | `204 No Content`, clears refresh cookie |
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
    "accessToken": "<jwt>"
  }
}
```

Validation rules:

| Field | Rules |
| --- | --- |
| `name` | required for register, 2-80 chars |
| `email` | required, valid email, normalized lowercase |
| `password` | required, 8-128 chars |
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

Public reads return active categories. Admin writes require Bearer admin token.

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

`GET /settings/store` creates the default `{ key: "store" }` settings document if it does not exist.

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
  "freeShippingThreshold": 1500,
  "lowStockThreshold": 5
}
```

Promo bar active state can be sent as either `promoBar.active` or top-level `promoBarActive`.

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
| `freeShippingThreshold` | optional number >= 0 or `null` |
| `lowStockThreshold` | optional integer >= 0 |

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
| `minPrice` | number | Uses sale price when present, otherwise base price |
| `maxPrice` | number | Uses sale price when present, otherwise base price |
| `sort` | string | `newest`, `price-low`, `price-high`, `best-selling`, `rating`, or comma-separated mongoose fields |

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

Product photo workflow:

1. On create, send product data plus photo files as `multipart/form-data`; backend compresses images, saves them locally under `uploads/products`, and stores the returned `/uploads/products/...` `url` and `publicId`.
2. On update with only new photos, send files in `images`; backend appends them to the product's current images.
3. On update when removing/reordering old photos, send `existingImages` as the exact image objects to keep, then optionally send new files in `images`; backend saves `existingImages + uploadedImages`.
4. To edit selected colors for existing photos, either update each object in `existingImages` with its new `color`, or send `existingImageColors` as an array aligned to `existingImages`.
5. Any current product image omitted from `existingImages` is deleted from the server filesystem after the product update succeeds.
6. Deleting a product also removes all of its product photo files from the server filesystem.
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
| `badges[]` | `new`, `best-seller`, `sale` |
| `images` multipart files | optional product photos, max 8 files, max 15MB each, image MIME only |
| `imageColors[]` | optional uploaded-photo colors, matched by file order |
| `existingImageColors[]` | optional update-only existing-photo colors, matched by `existingImages` order |
| `existingImages[]` | update only, current image objects to keep |

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
| `DELETE` | `/coupons/:id` | Admin | no body | `204 No Content`, soft deletes by `isActive=false` |

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

Create order behavior:

| Payment Method | Behavior |
| --- | --- |
| `cod` | Stock is decremented immediately. Coupon usage is incremented immediately. `paymentStatus` stays `pending`. |
| `paymob` | Stock and coupon usage are updated after successful Paymob webhook. Use `/payments/paymob/intent` after creating the order. |

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

Auth: optional user. Send Bearer token if the order belongs to a logged-in user. Guests must send a matching `contact`.

Request:

```json
{
  "orderId": "64f000000000000000000040",
  "contact": "01000000000",
  "redirectionUrl": "https://frontend.example.com/payment/callback",
  "notificationUrl": "https://api.example.com/api/v1/payments/paymob/webhook"
}
```

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
      "checkoutUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=..."
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
      "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/<iframeId>?payment_token=<paymentKey>"
    }
  }
}
```

Frontend flow:

1. Create order with `paymentMethod: "paymob"`.
2. Call `/payments/paymob/intent` with the returned `order._id`.
3. Redirect/open `payment.checkoutUrl` for unified checkout, or `payment.iframeUrl` for legacy iframe.
4. Use `/orders/track` or an authenticated/admin order endpoint to refresh order status after payment.

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
  "reference": "RZ-2026-00001",
  "description": "ROMZ fashion order",
  "totalWeight": 1,
  "serviceType": "DTD",
  "service": "ND",
  "serviceCategory": "DELIVERY",
  "addressCategory": "H",
  "buildingNo": "5",
  "floorNo": "2",
  "apartmentNo": "4",
  "productCategory": "Fashion",
  "dimensions": "20*30*40",
  "specialNotes": "Call before delivery"
}
```

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

Revenue analytics count paid Paymob orders and delivered COD orders.

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

1. Store `accessToken` in frontend state after register/login/refresh.
2. Enable `credentials: "include"` for register, login, refresh, logout, and any refresh-cookie flow if the frontend and API are on different origins.
3. Add `Authorization: Bearer <accessToken>` for protected user/admin calls.
4. Call `/cart/validate` before checkout to show stock, price, and coupon issues.
5. Create the order with `/orders`; for Paymob orders, call `/payments/paymob/intent` next.
6. Use `/shipping-zones` to limit available governorates before checkout.
7. Use `/orders/track` for guest order status pages.
8. Handle `204 No Content` responses without trying to parse JSON.
