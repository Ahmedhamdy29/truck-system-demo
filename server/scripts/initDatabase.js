import db from '../database/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Idempotent seed: running this script twice must not fail and must not
// create duplicate companies or users.
//
// Money uses NUMERIC(12,2) (never REAL — floating point loses cents) and
// load_capacity uses NUMERIC(10,2).
//
// NOTE: CREATE TABLE IF NOT EXISTS does not alter tables that already exist.
// If the database was created by the old script, the REAL columns stay REAL
// until migrated manually, e.g.:
//   ALTER TABLE trips ALTER COLUMN revenue TYPE NUMERIC(12,2);
//   ALTER TABLE expenses ALTER COLUMN amount TYPE NUMERIC(12,2);
//   ALTER TABLE maintenance_records ALTER COLUMN cost TYPE NUMERIC(12,2);
//   ALTER TABLE trucks ALTER COLUMN load_capacity TYPE NUMERIC(10,2);

const SEED_COMPANY_CODE = 'COMP001';
// Fixed id so ON CONFLICT (code) DO NOTHING can match the same row on
// every run instead of generating a new uuid each time (the old bug:
// a fresh uuid + ON CONFLICT (id) could never conflict, so the insert
// failed on the code unique constraint on the second run).
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

const initDatabase = async () => {
  try {
    // 1. Create companies table (No dependencies)
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

    // 2. Create trucks table (Depends on companies)
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
        load_capacity NUMERIC(10,2) NOT NULL,
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

    // 3. Create users table (Depends on companies AND trucks)
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

    // 4. Create trips table (Depends on companies and trucks)
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
        revenue NUMERIC(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create expenses table (Depends on companies and trucks)
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('fuel', 'maintenance', 'fees', 'other')) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT DEFAULT 'SAR',
        date DATE NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        receipt_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create maintenance_records table (Depends on companies and trucks)
    await db.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('periodic', 'tire-check', 'oil-change', 'comprehensive')) NOT NULL,
        date DATE NOT NULL,
        cost NUMERIC(12,2) NOT NULL,
        description TEXT NOT NULL,
        next_due DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Trigger: keep updated_at fresh on every UPDATE, for every table.
    await db.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    for (const table of ['companies', 'trucks', 'users', 'trips', 'expenses', 'maintenance_records']) {
      await db.query(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table}`);
      await db.query(`
        CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
      `);
    }

    // Indexes on the foreign keys used by almost every query.
    await db.query('CREATE INDEX IF NOT EXISTS idx_trucks_company_id ON trucks (company_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_truck_id ON users (truck_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_trips_company_id ON trips (company_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_trips_truck_id ON trips (truck_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses (company_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_expenses_truck_id ON expenses (truck_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_records (company_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_maintenance_truck_id ON maintenance_records (truck_id)');

    // Seed company — idempotent: check first, insert only if missing.
    const existingCompany = await db.query(
      'SELECT id FROM companies WHERE code = $1',
      [SEED_COMPANY_CODE]
    );
    let companyId;
    if (existingCompany.rows.length > 0) {
      companyId = existingCompany.rows[0].id;
      console.log(`ℹ️  Company ${SEED_COMPANY_CODE} already exists — skipping seed company creation.`);
    } else {
      await db.query(
        `INSERT INTO companies (id, name, code, email)
         VALUES ($1, 'شركة النقل العامة', $2, 'admin@company.com')
         ON CONFLICT (code) DO NOTHING`,
        [SEED_COMPANY_ID, SEED_COMPANY_CODE]
      );
      const created = await db.query('SELECT id FROM companies WHERE code = $1', [SEED_COMPANY_CODE]);
      companyId = created.rows[0].id;
      console.log(`🏢 Seed company created: شركة النقل العامة (${SEED_COMPANY_CODE})`);
    }

    // Seed admin — only if it does not already exist, and only when the
    // password is supplied via the environment. There is NO default password
    // in this file: if SEED_ADMIN_PASSWORD is missing, the admin is NOT
    // created and the script exits with a clear error instead of silently
    // using a well-known password.
    const existingAdmin = await db.query(
      'SELECT id FROM users WHERE company_id = $1 AND username = $2',
      [companyId, 'admin']
    );
    if (existingAdmin.rows.length > 0) {
      console.log('ℹ️  Default admin user already exists — skipping seed admin creation.');
    } else if (!process.env.SEED_ADMIN_PASSWORD) {
      console.error(
        '❌ SEED_ADMIN_PASSWORD is not set. The default admin user was NOT created. ' +
        'Set SEED_ADMIN_PASSWORD in the environment and re-run this script to create it.'
      );
      process.exit(1);
    } else {
      const hashedPassword = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD, 10);
      await db.query(
        `INSERT INTO users (id, company_id, username, password, name, role, email)
         VALUES ($1, $2, 'admin', $3, 'المدير العام', 'admin', 'admin@company.com')
         ON CONFLICT (company_id, username) DO NOTHING`,
        [uuidv4(), companyId, hashedPassword]
      );
      console.log('👤 Default admin user created (username: admin).');
      console.log('⚠️  Change the default admin password immediately after first login.');
    }

    console.log('✅ PostgreSQL database initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    process.exit(1);
  }
};

initDatabase();
