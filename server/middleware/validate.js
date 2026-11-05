// Shared validation / pagination / error helpers — no new dependencies.
// All messages are Arabic so the frontend can show them directly.

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 50;

/**
 * Parse ?limit=&offset= for list endpoints.
 * Default limit 50, max 100, offset >= 0. Invalid values fall back to defaults.
 */
export function parsePagination(req) {
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const rawOffset = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
  return { limit, offset };
}

/** Build LIMIT/OFFSET clause from already-parsed values (preferred helper). */
export function paginate(query, params, { limit, offset }) {
  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  params.push(limit, offset);
  return `${query} LIMIT $${limitParam} OFFSET $${offsetParam}`;
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function isNonNegativeNumber(value) {
  const n = Number(value);
  return value !== '' && value !== null && value !== undefined && Number.isFinite(n) && n >= 0;
}

export function isValidProgress(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

/**
 * Validate one enum field. Returns an Arabic error string, or null when OK.
 * `undefined`/`null` means "not sent" and is allowed (partial updates).
 */
export function validateEnum(value, allowed, fieldName) {
  if (value === undefined || value === null) return null;
  if (!allowed.includes(value)) {
    return `قيمة غير صالحة للحقل ${fieldName}: يجب أن تكون إحدى ${allowed.join('، ')}`;
  }
  return null;
}

/** Validate a required-or-optional date field. Returns error string or null. */
export function validateDate(value, fieldName, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? `الحقل ${fieldName} مطلوب` : null;
  }
  if (!isValidDateString(value)) return `التاريخ في الحقل ${fieldName} غير صالح`;
  return null;
}

/** Validate a required-or-optional non-negative number. Returns error or null. */
export function validateNonNegative(value, fieldName, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? `الحقل ${fieldName} مطلوب` : null;
  }
  if (!isNonNegativeNumber(value)) return `الحقل ${fieldName} يجب أن يكون رقماً غير سالب`;
  return null;
}

/** Validate progress 0-100. Returns error string or null. */
export function validateProgress(value, fieldName = 'progress') {
  if (value === undefined || value === null) return null;
  if (!isValidProgress(value)) return `الحقل ${fieldName} يجب أن يكون بين 0 و 100`;
  return null;
}

/** First validation error in the list, or null. */
export function firstError(...errors) {
  return errors.find((e) => e) || null;
}

/** True when the pg error is a unique-constraint violation (code 23505). */
export function isUniqueViolation(err) {
  return err && err.code === '23505';
}

/**
 * Send a DB error response: unique violations become 400 with a clear Arabic
 * message; everything else becomes a generic 500 (details go to console only,
 * never to the client).
 */
export function handleDbError(res, err, uniqueMessage = 'القيمة موجودة مسبقاً') {
  console.error('Database error:', err);
  if (isUniqueViolation(err)) {
    return res.status(400).json({ error: uniqueMessage });
  }
  return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
}

/** Generic 500: log the details server-side, send only a generic message. */
export function handleServerError(res, err, message = 'خطأ في الخادم') {
  console.error(message, err);
  return res.status(500).json({ error: message });
}

/**
 * Check that a truck exists and belongs to the user's company.
 * Returns the truck row, or sends 404 and returns null.
 */
export async function requireCompanyTruck(db, res, truckId, companyId) {
  const { rows } = await db.query(
    'SELECT id, status FROM trucks WHERE id = $1 AND company_id = $2',
    [truckId, companyId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'الشاحنة غير موجودة' });
    return null;
  }
  return rows[0];
}

/**
 * Get a pooled client for a transaction. On failure (DB down) sends a
 * generic 500 and returns null, so callers can `if (!client) return;`
 * instead of letting the rejection escape an async Express 4 handler.
 */
export async function connectClient(db, res) {
  try {
    return await db.connect();
  } catch (err) {
    handleDbError(res, err);
    return null;
  }
}
