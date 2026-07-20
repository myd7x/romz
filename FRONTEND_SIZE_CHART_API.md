# Size Chart — Frontend API Reference

A single **store‑wide** size chart, managed from the dashboard and shown on the website (e.g. a "Size Guide" button on product pages or a dedicated page). It lives inside **store settings**, so there is nothing new to fetch separately — it comes back with the storefront settings you already load.

The chart is **flexible**: any number of columns and rows. Cells are plain strings, so it works for Chest/Length today and anything else later.

---

## Data shape

```jsonc
"sizeChart": {
  "isActive": true,                 // false = hide it on the website
  "title": { "en": "Size Guide", "ar": "دليل المقاسات" },
  "note":  { "en": "", "ar": "" },  // optional line under the table
  "columns": [                      // header cells (localized)
    { "en": "Size",       "ar": "المقاس" },
    { "en": "Chest (cm)", "ar": "الصدر (سم)" },
    { "en": "Length (cm)","ar": "الطول (سم)" }
  ],
  "rows": [                         // one array of string cells per row, aligned to columns
    ["S",  "39",   "60"],
    ["M",  "42.5", "63"],
    ["L",  "45",   "67"],
    ["XL", "49.5", "67.5"]
  ]
}
```

**Limits** (enforced by the backend): max **12 columns**, max **50 rows**, each cell ≤ **120 chars**. Each `rows[i]` should have the same number of cells as `columns` (the UI should keep them aligned).

---

## 1. Read the size chart (public — website)

`GET /api/v1/storefront-settings`

No auth. The chart is at `data.settings.sizeChart`.

```js
const res = await fetch("/api/v1/storefront-settings");
const { data } = await res.json();
const chart = data.settings.sizeChart;
```

**Render (React example)** — pick the current language (`en` / `ar`):

```jsx
function SizeChart({ chart, lang = "en" }) {
  if (!chart?.isActive || !chart.rows?.length) return null;
  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"}>
      <h3>{chart.title?.[lang] || chart.title?.en}</h3>
      <table>
        <thead>
          <tr>{chart.columns.map((c, i) => <th key={i}>{c[lang] || c.en}</th>)}</tr>
        </thead>
        <tbody>
          {chart.rows.map((row, r) => (
            <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {chart.note?.[lang] && <p>{chart.note[lang]}</p>}
    </section>
  );
}
```

> Always guard on `isActive` and a non‑empty `rows` before rendering, so an admin can hide the chart or leave it empty.

---

## 2. Update the size chart (dashboard — admin only)

`PATCH /api/v1/admin/storefront-settings`

- **Auth:** `Authorization: Bearer <adminAccessToken>` (admin JWT; `401`/`403` otherwise).
- **Content-Type:** `application/json`.
- Send **only** `{ "sizeChart": { ... } }` — this endpoint patches store settings, so other settings are left untouched.

**Merge behavior:** the `sizeChart` object is shallow‑merged.
- Send `columns` **and** `rows` together to replace the table.
- Send just `{ "isActive": false }` to hide it **without** losing the table.
- Send just `{ "title": { "en": "..." } }` to change the heading only.

### Full replace (the table you provided)

```http
PATCH /api/v1/admin/storefront-settings
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

```json
{
  "sizeChart": {
    "isActive": true,
    "title": { "en": "Size Guide", "ar": "دليل المقاسات" },
    "columns": [
      { "en": "Size",        "ar": "المقاس" },
      { "en": "Chest (cm)",  "ar": "الصدر (سم)" },
      { "en": "Length (cm)", "ar": "الطول (سم)" }
    ],
    "rows": [
      ["S",  "39",   "60"],
      ["M",  "42.5", "63"],
      ["L",  "45",   "67"],
      ["XL", "49.5", "67.5"]
    ]
  }
}
```

### Hide it (keep the data)

```json
{ "sizeChart": { "isActive": false } }
```

**Response** (both cases) — the full updated settings, with the saved chart at `data.settings.sizeChart`:

```json
{
  "success": true,
  "message": "Store settings updated",
  "data": { "settings": { "sizeChart": { /* ... */ } } }
}
```

---

## Dashboard editor — suggested UI

Build a small editable grid bound to `columns` + `rows`:

1. **Header row:** one text input per `columns[i].en` (and `.ar` if you support Arabic). "Add column" pushes `{ en: "", ar: "" }` to `columns` and an empty cell to every `rows[i]`.
2. **Body:** one text input per cell in `rows[r][c]`. "Add row" pushes `new Array(columns.length).fill("")`. "Delete row" splices it.
3. **Title / note:** localized text inputs.
4. **Active toggle:** boolean → `isActive`.
5. **Save:** `PATCH` the whole `{ sizeChart }` object (send `columns` + `rows` together).

**Keep cells aligned:** whenever you add/remove a column, add/remove the cell at that index in every row so `rows[i].length === columns.length`.

---

## Notes

- The chart is **seeded automatically** with the S/M/L/XL Chest/Length data on first load — no manual setup needed. The dashboard can overwrite it any time.
- It's a **single global chart** for the whole store (not per product). Product pages can all show the same "Size Guide".
- Products also have their own optional `sizeChart` field (`columns` + `rows`, same idea) if you ever need a per‑product override — that's separate from this global one.
