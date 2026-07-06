import slugify from "slugify";

export const createSlug = (value) =>
  slugify(value || "", {
    lower: true,
    strict: true,
    trim: true
  });

export const ensureUniqueSlug = async (Model, baseSlug, currentId = null) => {
  const fallback = baseSlug || "item";
  let slug = fallback;
  let counter = 2;

  while (
    await Model.exists({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {})
    })
  ) {
    slug = `${fallback}-${counter}`;
    counter += 1;
  }

  return slug;
};
