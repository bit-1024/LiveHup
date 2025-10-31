const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
  console.log('🔧 Creating admin account...\n');

  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'live_points'
    });

    console.log('✅ Database connected successfully\n');

    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing admin if present
    await connection.execute('DELETE FROM admins WHERE username = ?', ['admin']);
    console.log('🗑️  Removed existing admin account (if any)\n');

    // Insert new admin
    const [result] = await connection.execute(
      `INSERT INTO admins (username, password, real_name, role, email, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', hashedPassword, '系统管理员', 'super_admin', 'admin@example.com', true]
    );

    console.log('✅ Admin account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Please change the password after first login!\n');

    // Verify the account
    const [admin] = await connection.execute(
      'SELECT id, username, role, is_active, created_at FROM admins WHERE username = ?',
      ['admin']
    );

    if (admin && admin.length > 0) {
      console.log('✅ Verification successful:');
      console.log('   ID:', admin[0].id);
      console.log('   Role:', admin[0].role);
      console.log('   Active:', admin[0].is_active ? 'Yes' : 'No');
      console.log('   Created:', new Date(admin[0].created_at).toLocaleString());
    }

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Solution: Make sure MySQL is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Solution: Check your database credentials in .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Solution: Database "live_points" does not exist. Run schema.sql first.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the function
createAdmin();