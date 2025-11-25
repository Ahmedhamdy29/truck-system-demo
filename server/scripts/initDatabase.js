import db from '../database/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const initDatabase = async () => {
  try {
    // Create companies table
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'driver')) NOT NULL,
        email TEXT,
        phone TEXT,
        profile_image TEXT,
        truck_id TEXT REFERENCES trucks(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, username),
        UNIQUE(truck_id)
      )
    `);

    // Create trucks table with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS trucks (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        number TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        plate_number TEXT NOT NULL,
        engine_number TEXT NOT NULL,
        chassis_number TEXT NOT NULL,
        load_capacity REAL NOT NULL,
        status TEXT CHECK(status IN ('available', 'in-trip', 'maintenance')) DEFAULT 'available',
        last_maintenance DATE,
        next_maintenance DATE,
        driver_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, number),
        UNIQUE(company_id, plate_number),
        UNIQUE(company_id, engine_number),
        UNIQUE(company_id, chassis_number)
      )
    `);

    // Create trips table with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
        destination TEXT NOT NULL,
        direction TEXT CHECK(direction IN ('outbound', 'return')) NOT NULL,
        start_date DATE NOT NULL,
        expected_end_date DATE NOT NULL,
        actual_end_date DATE,
        status TEXT CHECK(status IN ('active', 'completed', 'delayed')) DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        delay_reason TEXT,
        revenue REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('fuel', 'maintenance', 'fees', 'other')) NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'SAR',
        date DATE NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        receipt_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create maintenance_records table with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('periodic', 'tire-check', 'oil-change', 'comprehensive')) NOT NULL,
        date DATE NOT NULL,
        cost REAL NOT NULL,
        description TEXT NOT NULL,
        next_due DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default company and admin user if not exists
    const companyId = uuidv4();
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    await db.query(`
      INSERT INTO companies (id, name, code, email)
      VALUES ($1, 'شركة النقل العامة', 'COMP001', 'admin@company.com')
      ON CONFLICT (id) DO NOTHING
    `, [companyId]);

    await db.query(`
      INSERT INTO users (id, company_id, username, password, name, role, email)
      VALUES ($1, $2, 'admin', $3, 'المدير العام', 'admin', 'admin@company.com')
      ON CONFLICT (id) DO NOTHING
    `, [adminId, companyId, hashedPassword]);

    console.log('✅ PostgreSQL database initialized successfully');
    console.log('🏢 Default company created: شركة النقل العامة (COMP001)');
    console.log('👤 Default admin user created (username: admin, password: admin123)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  }
};

initDatabase();