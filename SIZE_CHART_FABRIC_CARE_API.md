# Size Chart & Fabric / Care — API Guide (Frontend)

Two new **per-product** fields were added to the Product resource:

- `sizeChart` — a flexible, localized measurement **table** (columns + rows).
- `fabricCare` — localized **Fabric** (composition) and **Care** (instructions) text.

There are **no new endpoints**. Both fields live on the existing product endpoints. Admins manage them through the normal product create/update calls; the storefront reads them from the normal product read calls.

Base URL: `{{API_BASE}}` = `http://<host>/api/v1`

All responses use the standard envelope:

```json
{ "success": true, "message": "...", "data": { "product": { /* ... */ } } }
```

---

## 1. Data shapes

### `sizeChart`

```jsonc
{
  "columns": [                         // localized header cells (max 20)
    { "ar": "المقاس", "en": "Size" },
    { "ar": "الصدر",  "en": "Chest" },
    { "ar": "الطول",  "en": "Length" }
  ],
  "rows": [                            // array of rows; each row is an array of strings (max 60 rows, 20 cells each)
    ["S", "90", "66"],
    ["M", "96", "68"],
    ["L", "102", "70"]
  ],
  "note": { "ar": "القياس بالسم", "en": "Measurements in cm" }  // optional caption
}
```

Notes:
- `rows` cells are **strings** (send `"90"`, not `90`) so you can put ranges like `"90-94"`.
- Each row should have the same number of cells as `columns.length` (the API does not force this — render defensively).
- All fields are optional. An empty chart is `{ "columns": [], "rows": [], "note": { "ar": "", "en": "" } }`.

### `fabricCare`

```jsonc
{
  "fabric": { "ar": "100% قطن", "en": "100% Cotton" },        // composition
  "care":   { "ar": "غسيل بارد", "en": "Machine wash cold" }   // care instructions
}
```

Both `fabric` and `care` are optional localized strings (up to 4000 chars each). Empty means `{ "ar": "", "en": "" }`.

---

## 2. Reading (storefront)

Both fields are included on every product object returned by:

| Method | Path | Auth |
|--------|------|------|
| GET | `{{API_BASE}}/products/:slug` | public |
| GET | `{{API_BASE}}/products` (list) | public |
| GET | `{{API_BASE}}/products/:slug/related` | public |
| GET | `{{API_BASE}}/products/admin/:id` | admin |

**Example — `GET /api/v1/products/classic-shirt`**

```json
{
  "success": true,
  "message": "Product fetched",
  "data": {
    "product": {
      "_id": "66f0a1...",
      "name": { "ar": "قميص كلاسيك", "en": "Classic Shirt" },
      "slug": "classic-shirt",
      "basePrice": 450,
      "images": [ /* ... */ ],
      "variants": [ /* ... */ ],
      "sizeChart": {
        "columns": [
          { "ar": "المقاس", "en": "Size" },
          { "ar": "الصدر",  "en": "Chest" },
          { "ar": "الطول",  "en": "Length" }
        ],
        "rows": [ ["S","90","66"], ["M","96","68"], ["L","102","70"] ],
        "note": { "ar": "القياس بالسم", "en": "Measurements in cm" }
      },
      "fabricCare": {
        "fabric": { "ar": "100% قطن", "en": "100% Cotton" },
        "care":   { "ar": "غسيل بارد", "en": "Machine wash cold" }
      }
    }
  }
}
```

### Rendering the size chart (example)

```jsx
const { columns = [], rows = [], note } = product.sizeChart || {};
const hasChart = columns.length > 0 && rows.length > 0;

{hasChart && (
  <table>
    <thead>
      <tr>{columns.map((c, i) => <th key={i}>{c[lang]}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((row, r) => (
        <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
      ))}
    </tbody>
  </table>
)}
{note?.[lang] && <p className="size-note">{note[lang]}</p>}
```

### Rendering fabric & care

```jsx
const fc = product.fabricCare || {};
{fc.fabric?.[lang] && <p><strong>Fabric:</strong> {fc.fabric[lang]}</p>}
{fc.care?.[lang]   && <p><strong>Care:</strong> {fc.care[lang]}</p>}
```

> `lang` is `"ar"` or `"en"`. Always guard with `|| {}` / `|| []` — older products may not have these fields set.

---

## 3. Writing (dashboard, admin only)

Products are created/updated as **`multipart/form-data`** (because images are uploaded in the same request). Object/array fields must be sent as **JSON strings** — exactly like the existing `name`, `description`, and `variants` fields. The backend `JSON.parse`s them.

Auth: send the admin access token — `Authorization: Bearer <accessToken>`.

### Create — `POST {{API_BASE}}/products`

Send `sizeChart` and `fabricCare` as JSON strings alongside the other form fields:

```js
const form = new FormData();
form.append("name", JSON.stringify({ ar: "قميص كلاسيك", en: "Classic Shirt" }));
form.append("description", JSON.stringify({ ar: "...", en: "..." }));
form.append("category", "66e0...");
form.append("basePrice", "450");
form.append("variants", JSON.stringify([
  { sku: "SH-BLK-M", size: "M", color: { name: "Black", hex: "#000" }, stock: 10 }
]));

// NEW fields:
form.append("sizeChart", JSON.stringify({
  columns: [
    { ar: "المقاس", en: "Size" },
    { ar: "الصدر",  en: "Chest" },
    { ar: "الطول",  en: "Length" }
  ],
  rows: [ ["S","90","66"], ["M","96","68"], ["L","102","70"] ],
  note: { ar: "القياس بالسم", en: "Measurements in cm" }
}));
form.append("fabricCare", JSON.stringify({
  fabric: { ar: "100% قطن", en: "100% Cotton" },
  care:   { ar: "غسيل بارد", en: "Machine wash cold" }
}));

// images (optional)
imageFiles.forEach((file) => form.append("images", file));

await fetch(`${API_BASE}/products`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}` }, // do NOT set Content-Type; the browser sets the multipart boundary
  body: form
});
```

Response: `201 Created` with `data.product` (the full product, including the saved `sizeChart` / `fabricCare`).

### Update — `PATCH {{API_BASE}}/products/:id`

Only send the fields you want to change. To change just the size chart:

```js
const form = new FormData();
form.append("sizeChart", JSON.stringify({
  columns: [ { ar: "المقاس", en: "Size" }, { ar: "الصدر", en: "Chest" } ],
  rows: [ ["S","90"], ["M","96"] ],
  note: { ar: "", en: "" }
}));

await fetch(`${API_BASE}/products/${id}`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form
});
```

To update **fabric & care** only, send just `fabricCare`. You can send both in one request too.

> The update endpoint requires at least one field to change; sending an empty body returns `400 "No product updates provided"`.

### Clearing a field

Send it with empty contents:

```js
// remove the size chart
form.append("sizeChart", JSON.stringify({ columns: [], rows: [], note: { ar: "", en: "" } }));

// remove fabric & care
form.append("fabricCare", JSON.stringify({ fabric: { ar: "", en: "" }, care: { ar: "", en: "" } }));
```

---

## 4. Validation rules (so the dashboard can validate before submit)

**`sizeChart`**
| Field | Rule |
|-------|------|
| `columns` | array, max 20 items; each item `{ ar, en }`, each string ≤ 4000 chars, may be `""` |
| `rows` | array, max 60 rows; each row array of ≤ 20 strings; each cell ≤ 120 chars, may be `""` |
| `note` | `{ ar, en }`, each ≤ 4000 chars, optional |

**`fabricCare`**
| Field | Rule |
|-------|------|
| `fabric` | `{ ar, en }`, each ≤ 4000 chars, may be `""` |
| `care` | `{ ar, en }`, each ≤ 4000 chars, may be `""` |

Both `sizeChart` and `fabricCare` are **optional** on create and update. Unknown extra keys are stripped by the server.

On validation failure the API returns:

```json
{ "success": false, "message": "Validation failed", "errors": [ "\"sizeChart.rows[0]\" must be ..." ] }
```
