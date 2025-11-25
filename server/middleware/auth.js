import jwt from 'jsonwebtoken';
import db from '../database/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const userPayload = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    const result = await db.query(
      'SELECT id, username, name, role, email, phone, profile_image, truck_id, company_id FROM users WHERE id = $1',
      [userPayload.id]
    );
    const dbUser = result.rows[0];
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (dbUser.company_id !== userPayload.companyId) {
      return res.status(403).json({ error: 'Access denied: invalid company' });
    }
    req.user = {
      ...dbUser,
      companyId: dbUser.company_id,
      truckId: dbUser.truck_id
    };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireCompanyAccess = (req, res, next) => {
  const companyId = req.params.companyId || req.body.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID required' });
  }
  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied: not your company' });
  }
  next();
};

export const getUserFromToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
  } catch (error) {
    return null;
  }
};