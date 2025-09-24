const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    // Gracefully exit the process with failure code
    process.exit(1);
  }
};

// Optional: Handle graceful shutdowns
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('⏏️ MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;