const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Admin schema (simplified to avoid requiring the actual model file)
const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    permissions: Object,
    isActive: { type: Boolean, default: true }
});

const Admin = mongoose.model('Admin', adminSchema);

async function fixAdmin() {
    try {
        await mongoose.connect('mongodb://localhost:27017/blockchain_voting');
        console.log('Connected to MongoDB');
        
        // Delete existing admin
        await Admin.deleteOne({ email: 'admin@kibu.ac.ke' });
        console.log('Deleted existing admin (if any)');
        
        // Create new admin with fresh password
        const hash = await bcrypt.hash('Admin@123', 10);
        const admin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@kibu.ac.ke',
            password: hash,
            role: 'super_admin',
            permissions: {
                canCreateElections: true,
                canAddCandidates: true,
                canStartVoting: true,
                canEndVoting: true,
                canPublishResults: true,
                canManageAdmins: true,
                canViewAnalytics: true
            },
            isActive: true
        });
        
        console.log(' Admin created successfully!');
        console.log('Email:', admin.email);
        console.log('Password: Admin@123');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixAdmin();