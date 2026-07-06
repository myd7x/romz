export const buildPagination = (query) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 12), 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildSort = (query, fallback = "-createdAt") => {
  if (!query.sort) {
    return fallback;
  }

  return String(query.sort)
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .join(" ");
};

export const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 0
});
