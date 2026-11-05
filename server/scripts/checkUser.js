import db from '../database/database.js';
import bcrypt from 'bcryptjs';

const checkUser = async () => {
    try {
        console.log('🔍 Checking for admin user...');

        // 1. Check Company
        const companyRes = await db.query('SELECT * FROM companies WHERE code = $1', ['COMP001']);
        if (companyRes.rows.length === 0) {
            console.log('❌ Company COMP001 NOT FOUND');
            process.exit(1);
        }
        console.log('✅ Company found:', companyRes.rows[0].name);

        // 2. Check User
        const userRes = await db.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (userRes.rows.length === 0) {
            console.log('❌ User admin NOT FOUND');
            process.exit(1);
        }
        const user = userRes.rows[0];
        console.log('✅ User found:', user.username);
        console.log('   Company ID:', user.company_id);
        console.log('   Role:', user.role);

        // 3. Check Password — the password to test comes from the environment
        // (SEED_ADMIN_PASSWORD) or the first CLI argument; it is never
        // hardcoded in this file.
        const passwordToCheck = process.env.SEED_ADMIN_PASSWORD || process.argv[2];
        if (!passwordToCheck) {
            console.log('⚠️  No password supplied to check: set SEED_ADMIN_PASSWORD or pass it as an argument.');
            process.exit(0);
        }
        const isMatch = bcrypt.compareSync(passwordToCheck, user.password);
        console.log('🔑 Password check:', isMatch ? 'MATCH ✅' : 'FAIL ❌');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

checkUser();
