import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE company_id = $1 ORDER BY created_at DESC',
      [req.user.companyId]
    );
    const formattedUsers = rows.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      profileImage: user.profile_image,
      createdAt: user.created_at,
      truckId: user.truck_id
    }));
    res.json(formattedUsers);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get single user
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Users can only view their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.query(
    'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE id = $1 AND company_id = $2',
    [id, req.user.companyId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user.rows[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      const formattedUser = {
        id: user.rows[0].id,
        username: user.rows[0].username,
        name: user.rows[0].name,
        role: user.rows[0].role,
        email: user.rows[0].email,
        phone: user.rows[0].phone,
        profileImage: user.rows[0].profile_image,
        createdAt: user.rows[0].created_at,
        truckId: user.rows[0].truck_id || null
      };

      res.json(formattedUser);
    }
  );
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
    await db.query(
      'INSERT INTO users (id, company_id, username, password, name, role, email, phone, truck_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, req.user.companyId, username, hashedPassword, name, role, email, phone, truckId || null]
    );

    const newUser = {
      id,
      username,
      name,
      role,
      email,
      phone,
      truckId: truckId || null,
      profileImage: null
    };

    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// Update user
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, profileImage, password, truckId } = req.body;

  // Users can only update their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  let query = `UPDATE users SET 
               name = COALESCE($1, name),
               email = COALESCE($2, email),
               phone = COALESCE($3, phone),
               profile_image = COALESCE($4, profile_image),
               updated_at = CURRENT_TIMESTAMP`;
  
  let params = [name, email, phone, profileImage];

  // Only update password if provided
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    query += ', password = $5';
    params.push(hashedPassword);
  }

  // Update truckId if provided
  if (typeof truckId !== 'undefined') {
    query += ', truck_id = $6';
    params.push(truckId || null);
  }

  query += ' WHERE id = $7 AND company_id = $8';
  params.push(id, req.user.companyId);

  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update user', details: err.message });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user
    db.query(
      'SELECT id, username, name, role, email, phone, profile_image, created_at, truck_id FROM users WHERE id = $1 AND company_id = $2',
      [id, req.user.companyId],
      (err, user) => {
        if (err || !user.rows[0]) {
          return res.json({ message: 'User updated, but failed to fetch updated data' });
        }
        const formattedUser = {
          id: user.rows[0].id,
          username: user.rows[0].username,
          name: user.rows[0].name,
          role: user.rows[0].role,
          email: user.rows[0].email,
          phone: user.rows[0].phone,
          profileImage: user.rows[0].profile_image,
          createdAt: user.rows[0].created_at,
          truckId: user.rows[0].truck_id || null
        };
        res.json(formattedUser);
      }
    );
  });
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.query('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, req.user.companyId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

export default router;