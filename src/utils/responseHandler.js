export const sendResponse = (
  res,
  { statusCode = 200, success = true, message = "OK", data = null, meta = undefined }
) => {
  const body = { success, message, data };

  if (meta !== undefined) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
};

export const ok = (res, { message = "OK", data = null, meta } = {}) =>
  sendResponse(res, { statusCode: 200, message, data, meta });

export const created = (res, { message = "Created", data = null, meta } = {}) =>
  sendResponse(res, { statusCode: 201, message, data, meta });

export const noContent = (res) => res.status(204).send();
