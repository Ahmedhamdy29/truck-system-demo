import pkg from 'pg';
const { Pool } = pkg;

// Connection comes ONLY from the environment — there are no hardcoded
// credentials or local defaults here.
// Priority: DATABASE_URL / SUPABASE_URL (full connection string), otherwise
// the individual DB_* variables. SSL is enabled only when DB_SSL=true is set
// explicitly in the environment.
const connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL;

let config;
if (connectionString) {
  config = { connectionString };
  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }
} else {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new Error(
      `Database configuration missing: set DATABASE_URL (or SUPABASE_URL) or all of ${missing.join(', ')} in the environment. ` +
      'See server/.env.example. No default credentials are used.'
    );
  }
  config = {
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 5432,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  };
  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }
}

const db = new Pool(config);

// Never let an idle-client error crash the process silently; log it.
db.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export default db;
