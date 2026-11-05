// Wait until Postgres accepts connections, then exit 0.
// Retries for up to ~30 seconds, then exits 1.
// Uses `pg`, which is already a server dependency — no extra tools
// (nc, pg_isready, ...) are needed inside the container.
//
// Reads the connection from DATABASE_URL (set by docker-compose.yml).
// If DATABASE_URL is missing, falls back to the individual DB_* variables
// in the same way server/database/database.js does.
import pkg from 'pg';
const { Pool } = pkg;

const MAX_ATTEMPTS = 30;
const DELAY_MS = 1000;

function poolConfig() {
  const connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return { connectionString };
  return {
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'truck_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pool = new Pool(poolConfig());

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    await pool.query('SELECT 1');
    console.log(`Postgres is ready (attempt ${attempt}/${MAX_ATTEMPTS}).`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.log(`Postgres not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
    if (attempt < MAX_ATTEMPTS) await sleep(DELAY_MS);
  }
}

console.error(`Postgres did not become ready after ${MAX_ATTEMPTS} attempts.`);
await pool.end();
process.exit(1);
