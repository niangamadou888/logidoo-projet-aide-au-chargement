require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding');

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@logidoo.com',
      password: 'Admin@123',  // Will be hashed by the pre-save hook
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the seed function
seedAdminUser(); 