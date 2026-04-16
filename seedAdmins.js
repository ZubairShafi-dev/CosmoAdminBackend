require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdmins = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI missing in .env');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Create Superadmin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cosmoorbit.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        name: 'Superadmin',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
      });
      console.log(`✅ Superadmin created: ${adminEmail}`);
    } else {
      console.log(`⚠️ Superadmin already exists: ${adminEmail}`);
    }

    // 2. Create Viewer Admin
    const viewerEmail = 'viewer@cosmoorbit.com';
    const viewerExists = await User.findOne({ email: viewerEmail });
    if (!viewerExists) {
      await User.create({
        name: 'Stats Viewer',
        email: viewerEmail,
        password: 'Viewer@123',
        role: 'viewer',
      });
      console.log(`✅ Viewer created: ${viewerEmail}`);
    } else {
      console.log(`⚠️ Viewer already exists: ${viewerEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  }
};

seedAdmins();
