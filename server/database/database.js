import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.SUPABASE_URL || process.env.DATABASE_URL;

const config = connectionString ? {
  connectionString,
  ssl: { rejectUnauthorized: false }
} : {
  user: 'postgres',
  host: 'localhost',
  database: 'truck_system',
  password: 'Asd123ah',
  port: 5432,
};

const db = new Pool(config);

db.connect()
  .then(() => console.log('📁 Connected to PostgreSQL database'))
  .catch(err => console.error('Error connecting to PostgreSQL:', err));

export default db;