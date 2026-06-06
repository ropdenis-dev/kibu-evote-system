// backend/scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Admin Model (define it here to avoid dependency issues)
const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  permissions: Object,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected:'.green, conn.connection.host);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:'.red, error.message);
    process.exit(1);
  }
};

// Add colors if not available
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

const createAdmin = async () => {
  try {
    console.log(colors.cyan('\n📝 Connecting to database...'));
    
    // Connect to DB
    await connectDB();
    
    // Admin data
    const adminData = {
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@kibu.ac.ke',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'super_admin',
      permissions: {
        canCreateElections: true,
        canAddCandidates: true,
        canStartVoting: true,
        canEndVoting: true,
        canPublishResults: true,
        canManageAdmins: true,
        canViewAnalytics: true
      }
    };

    console.log(colors.yellow('🔍 Checking if admin exists...'));

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log(colors.green('\n✅ Admin already exists!'));
      console.log('=================================');
      console.log('📧 Email:', adminData.email);
      console.log('🔑 Password:', adminData.password);
      console.log('=================================');
      process.exit(0);
    }

    console.log(colors.yellow('🔐 Hashing password...'));

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    console.log(colors.yellow('💾 Creating admin in database...'));

    // Create admin
    const admin = await Admin.create({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
      permissions: adminData.permissions,
      isActive: true
    });

    console.log(colors.green('\n✅✅✅ ADMIN CREATED SUCCESSFULLY! ✅✅✅'));
    console.log('============================================');
    console.log('📧 Email:', colors.cyan(adminData.email));
    console.log('🔑 Password:', colors.yellow(adminData.password));
    console.log('👤 Role:', colors.cyan(adminData.role));
    console.log('============================================');
    console.log(colors.red('\n⚠️  IMPORTANT: Save these credentials!'));
    console.log(colors.yellow('You will need them to login to the admin panel.\n'));
    
    process.exit(0);
  } catch (error) {
    console.error(colors.red('\n❌ Error creating admin:'), error);
    process.exit(1);
  }
};

// Run the function
createAdmin();