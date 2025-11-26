import db from '../database/database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resetDatabase = async () => {
    console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
    console.log('🔄 Starting database reset...');

    try {
        // Drop all tables in correct order (child tables first)
        await db.query('DROP TABLE IF EXISTS maintenance_records CASCADE');
        await db.query('DROP TABLE IF EXISTS expenses CASCADE');
        await db.query('DROP TABLE IF EXISTS trips CASCADE');
        await db.query('DROP TABLE IF EXISTS trucks CASCADE');
        await db.query('DROP TABLE IF EXISTS users CASCADE');
        await db.query('DROP TABLE IF EXISTS companies CASCADE');

        console.log('🗑️  All tables dropped successfully.');

        // Run initDatabase script
        const initScript = path.join(__dirname, 'initDatabase.js');
        const child = fork(initScript);

        child.on('exit', (code) => {
            if (code === 0) {
                console.log('✨ Database reset and initialized successfully!');
                process.exit(0);
            } else {
                console.error('❌ Failed to initialize database after drop.');
                process.exit(1);
            }
        });

    } catch (err) {
        console.error('❌ Database reset failed:', err);
        process.exit(1);
    }
};

resetDatabase();
