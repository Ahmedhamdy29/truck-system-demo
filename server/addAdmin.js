import db from './database/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const addAdmin = () => {
  return new Promise((resolve, reject) => {
    // Check if admin already exists
    db.get('SELECT id FROM users WHERE role = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking for admin:', err);
        reject(err);
        return;
      }

      if (row) {
        console.log('✅ Admin user already exists');
        resolve();
        return;
      }

      // Create new admin user
      const adminId = uuidv4();
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      db.run(`
        INSERT INTO users (id, username, password, name, role, email)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [adminId, 'admin', hashedPassword, 'المدير العام', 'admin', 'admin@company.com'], (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
          reject(err);
        } else {
          console.log('✅ Admin user created successfully');
          console.log('👤 Username: admin');
          console.log('🔑 Password: admin123');
          resolve();
        }
      });
    });
  });
};

// Run the script
addAdmin()
  .then(() => {
    console.log('🎉 Admin setup complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Admin setup failed:', err);
    process.exit(1);
  }); 