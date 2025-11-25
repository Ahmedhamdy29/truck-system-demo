import db from '../database/database.js';

const addTruckIdColumn = async () => {
  try {
    // Check if truck_id column exists
    const result = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='truck_id'`);
    if (result.rows.length > 0) {
      console.log('truck_id column already exists in users table.');
      process.exit(0);
    } else {
      await db.query(`ALTER TABLE users ADD COLUMN truck_id TEXT;`);
      console.log('truck_id column added to users table successfully.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error adding truck_id column:', err);
    process.exit(1);
  }
};

addTruckIdColumn(); 