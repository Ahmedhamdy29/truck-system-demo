import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login with company code
router.post('/login', async (req, res) => {
  const { username, password, companyCode } = req.body;
  console.log(`📥 Login Attempt: User=${username}, Company=${companyCode}`); // Log the attempt

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
      process.env.JWT_SECRET || 'your-super-secret-jwt-key',
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
    console.error('Login Error:', err); // <--- Log the error to console
    res.status(500).json({ error: 'خطأ في قاعدة البيانات', details: err.message });
  }
});

// Register new company (Admin only)
router.post('/register-company', async (req, res) => {
  const { name, code, email, phone, address, adminUsername, adminPassword, adminName, adminEmail } = req.body;

  if (!name || !code || !adminUsername || !adminPassword || !adminName) {
    return res.status(400).json({ error: 'جميع الحقول المطلوبة يجب ملؤها' });
  }

  try {
    // Check if company code already exists
    const existingCompany = await db.query('SELECT id FROM companies WHERE code = $1', [code]);
    if (existingCompany.rows.length > 0) {
      return res.status(400).json({ error: 'كود الشركة موجود مسبقاً' });
    }

    // Check if admin username exists globally
    const existingUser = await db.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }

    const companyId = uuidv4();
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    // Create company
    await db.query(
      'INSERT INTO companies (id, name, code, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6)',
      [companyId, name, code, email, phone, address]
    );

    // Create admin user for the company
    await db.query(
      'INSERT INTO users (id, company_id, username, password, name, role, email) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [adminId, companyId, adminUsername, hashedPassword, adminName, 'admin', adminEmail]
    );

    res.status(201).json({
      message: 'تم إنشاء الشركة بنجاح',
      company: { id: companyId, name, code },
      admin: { username: adminUsername, name: adminName }
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات', details: err.message });
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
      return res.status(404).json({ error: 'المستخدم غير موجود' });
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات', details: err.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [name, email, phone, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    res.json({ message: 'تم تحديث الملف الشخصي بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث الملف الشخصي', details: err.message });
  }
});

// Verify token
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