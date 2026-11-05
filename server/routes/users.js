import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  parsePagination, paginate, handleDbError, requireCompanyTruck
} from '../middleware/validate.js';

const router = express.Router();

const formatUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
  email: user.email,
  phone: user.phone,
  profileImage: user.profile_image,
  createdAt: user.created_at,
  truckId: user.truck_id || null
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const { limit, offset } = parsePagination(req);
  try {
    let query = 'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE company_id = $1 ORDER BY created_at DESC';
    const params = [req.user.companyId];
    query = paginate(query, params, { limit, offset });
    const { rows } = await db.query(query, params);
    res.json(rows.map(formatUser));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Get single user
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Users can only view their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await db.query(
      'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUser(result.rows[0]));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, name, role, email, phone, truckId } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Username, password, name, and role are required' });
  }
  if (!['admin', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either admin or driver' });
  }
  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    if (truckId) {
      const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
      if (!truck) return;
    }

    await db.query(
      'INSERT INTO users (id, company_id, username, password, name, role, email, phone, truck_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, username, hashedPassword, name, role, email || null, phone || null, truckId || null]
    );
    res.status(201).json({
      id, username, name, role, email: email || null, phone: phone || null,
      truckId: truckId || null, profileImage: null
    });
  } catch (err) {
    return handleDbError(res, err, 'اسم المستخدم موجود مسبقاً في هذه الشركة');
  }
});

// Update user.
//
// The old code appended ", password = $5" and ", truck_id = $6" conditionally
// but always ended with "WHERE id = $7 AND company_id = $8", so the
// placeholders were wrong whenever only one of the two was sent:
//   - password only: truck_id was never added, but WHERE used $7/$8 while
//     only 6 params existed -> the query failed / bound the wrong values.
//   - truckId only: password was skipped, so "$6" for truck_id was actually
//     param 5 and WHERE $7/$8 were off by one.
// The query below is rebuilt dynamically: every placeholder number is
// derived from the params array as fields are added, so all four
// combinations (neither / password only / truckId only / both) bind
// correctly. Verified by construction: params.length is the next $n.
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, profileImage, password, truckId } = req.body;

  // Users can only update their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Only an admin may change a user's truck assignment; a normal user
  // (including a driver updating their own profile) cannot change truck_id.
  if (truckId !== undefined && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'فقط الآدمن يمكنه تغيير الشاحنة المخصصة للمستخدم' });
  }

  const sets = [];
  const params = [];
  const addSet = (column, value) => {
    params.push(value);
    // COALESCE keeps the current value when the field was not sent.
    sets.push(`${column} = COALESCE($${params.length}, ${column})`);
  };

  // COALESCE keeps fields that were not sent (partial update).
  addSet('name', name ?? null);
  addSet('email', email ?? null);
  addSet('phone', phone ?? null);
  addSet('profile_image', profileImage ?? null);
  if (password) {
    addSet('password', bcrypt.hashSync(password, 10));
  }
  if (truckId !== undefined) {
    addSet('truck_id', truckId || null);
  }
  sets.push('updated_at = CURRENT_TIMESTAMP');

  params.push(id, req.user.companyId);
  const query =
    `UPDATE users SET ${sets.join(', ')} ` +
    `WHERE id = $${params.length - 1} AND company_id = $${params.length}`;

  try {
    if (truckId) {
      const truck = await requireCompanyTruck(db, res, truckId, req.user.companyId);
      if (!truck) return;
    }
    const result = await db.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await db.query(
      'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (!user.rows[0]) {
      return res.json({ message: 'User updated, but failed to fetch updated data' });
    }
    res.json(formatUser(user.rows[0]));
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    return handleDbError(res, err);
  }
});

export default router;
