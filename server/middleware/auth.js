import jwt from 'jsonwebtoken';
import db from '../database/database.js';

/**
 * JWT_SECRET must come from the environment. There is no fallback secret:
 * a missing secret is a startup error (checked in server.js) and throws here
 * so a token can never be signed/verified with a known value.
 */
export function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in the environment. Set it before starting the server (see server/.env.example).');
  }
  return secret;
}

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const userPayload = jwt.verify(token, requireJwtSecret());
    const result = await db.query(
      `SELECT u.id, u.username, u.name, u.role, u.email, u.phone, u.profile_image,
              u.truck_id, u.company_id, c.name AS company_name
       FROM users u JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [userPayload.id]
    );
    const dbUser = result.rows[0];
    if (!dbUser) {
      // Token is structurally valid but the user no longer exists.
      return res.status(401).json({ error: 'User not found' });
    }
    if (dbUser.company_id !== userPayload.companyId) {
      return res.status(403).json({ error: 'Access denied: invalid company' });
    }
    req.user = {
      ...dbUser,
      companyId: dbUser.company_id,
      companyName: dbUser.company_name,
      truckId: dbUser.truck_id
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Authentication error:', err);
    return res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
