export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tasks are scoped to an anonymous per-device id so visitors of the public deploy never see each other's lists. */
export function requireClient(req, _res, next) {
  const id = req.get('x-client-id');
  if (!id || !UUID.test(id)) return next(new HttpError(400, 'Missing or invalid X-Client-Id header'));
  req.owner = id.toLowerCase();
  next();
}

export function parseTimeZone(tz) {
  const zone = tz || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    throw new HttpError(400, `Unknown time zone: ${zone}`);
  }
}
