require('dotenv').config();
const mongoose = require('mongoose');

const cleanupDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Get the default connection
    const db = mongoose.connection;
    
    // Drop the users collection if it exists
    try {
      console.log('Dropping users collection...');
      await db.collection('users').drop();
      console.log('Users collection dropped successfully');
    } catch (err) {
      if (err.code === 26) {
        console.log('Users collection does not exist, nothing to drop');
      } else {
        console.error('Error dropping users collection:', err);
      }
    }
    
    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Database cleanup error:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the cleanup function
cleanupDatabase(); 