export const parseJsonFields = (fields) => (req, res, next) => {
  for (const field of fields) {
    if (typeof req.body?.[field] !== "string") continue;

    try {
      req.body[field] = JSON.parse(req.body[field]);
    } catch {
      // Leave non-JSON strings untouched so Joi can report a useful validation error.
    }
  }

  next();
};
