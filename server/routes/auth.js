import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken, requireJwtSecret } from '../middleware/auth.js';
import { handleDbError, isUniqueViolation, connectClient } from '../middleware/validate.js';

const router = express.Router();

// Login with company code
router.post('/login', async (req, res) => {
  const { username, password, companyCode } = req.body;

  if (!username || !password || !companyCode) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور وكود الشركة مطلوبة' });
  }

  try {
    // First, find the company
    const companyResult = await db.query('SELECT id, name FROM companies WHERE code = $1', [companyCode]);
    const company = companyResult.rows[0];
    if (!company) {
      return res.status(401).json({ error: 'كود الشركة غير صحيح' });
    }

    // Then, find the user within that company
    const userResult = await db.query('SELECT * FROM users WHERE username = $1 AND company_id = $2', [username, company.id]);
    const user = userResult.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: user.company_id,
        companyName: company.name
      },
      requireJwtSecret(),
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      profileImage: user.profile_image,
      truckId: user.truck_id || null,
      companyId: user.company_id,
      companyName: company.name
    };

    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Register new company (public registration — kept as-is by design).
// The company + its admin are created inside one transaction, so a failure
// can never leave a company without an admin (or vice versa).
router.post('/register-company', async (req, res) => {
  const { name, code, email, phone, address, adminUsername, adminPassword, adminName, adminEmail } = req.body;

  if (!name || !code || !adminUsername || !adminPassword || !adminName) {
    return res.status(400).json({ error: 'جميع الحقول المطلوبة يجب ملؤها' });
  }
  if (typeof adminPassword !== 'string' || adminPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة مرور الآدمن يجب أن تكون 6 أحرف على الأقل' });
  }
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return res.status(400).json({ error: 'البريد الإلكتروني للآدمن غير صالح' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'البريد الإلكتروني للشركة غير صالح' });
  }

  const client = await connectClient(db, res);
  if (!client) return;
  try {
    await client.query('BEGIN');

    // Company code must be unique (also enforced by UNIQUE(code)).
    const existingCompany = await client.query('SELECT id FROM companies WHERE code = $1', [code]);
    if (existingCompany.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'كود الشركة موجود مسبقاً' });
    }

    const companyId = uuidv4();
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    await client.query(
      'INSERT INTO companies (id, name, code, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6)',
      [companyId, name, code, email || null, phone || null, address || null]
    );

    // Username uniqueness is scoped to the company: UNIQUE(company_id, username).
    // The company is brand new, so a clash here can only come from a race;
    // the unique constraint still guards it (23505 -> 400 below).
    await client.query(
      'INSERT INTO users (id, company_id, username, password, name, role, email) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [adminId, companyId, adminUsername, hashedPassword, adminName, 'admin', adminEmail || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'تم إنشاء الشركة بنجاح',
      company: { id: companyId, name, code },
      admin: { username: adminUsername, name: adminName }
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (isUniqueViolation(err)) {
      // Either the company code or the admin username (within this company).
      return res.status(400).json({ error: 'كود الشركة أو اسم مستخدم الآدمن موجود مسبقاً' });
    }
    return handleDbError(res, err);
  } finally {
    client.release();
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT u.*, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    const userResponse = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      profileImage: user.profile_image,
      truckId: user.truck_id || null,
      companyId: user.company_id,
      companyName: user.company_name
    };

    res.json(userResponse);
  } catch (err) {
    return handleDbError(res, err);
  }
});

// Update user profile — COALESCE keeps any field that was not sent, so a
// partial update never wipes the other fields.
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [name ?? null, email ?? null, phone ?? null, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }
    res.json({ message: 'تم تحديث الملف الشخصي بنجاح' });
  } catch (err) {
    return handleDbError(res, err, 'تعذّر تحديث الملف الشخصي');
  }
});

// Verify token — companyName comes from the JOIN in authenticateToken,
// so it is the real company name, not a value copied from the token.
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      companyId: req.user.companyId,
      companyName: req.user.companyName
    }
  });
});

export default router;
