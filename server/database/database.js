import pkg from 'pg';
const { Pool } = pkg;

const db = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'truck_system',
  password: 'Asd123ah',
  port: 5432,
});

db.connect()
  .then(() => console.log('📁 Connected to PostgreSQL database'))
  .catch(err => console.error('Error connecting to PostgreSQL:', err));

export default db;