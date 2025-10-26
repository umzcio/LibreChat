const mongoose = require('mongoose');
const { logger } = require('@librechat/data-schemas');

// Simple user schema for migration
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  isEnabled: Boolean,
});

async function migrateUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Update all users that don't have isEnabled field or have it set to false
    const result = await User.updateMany(
      {
        $or: [
          { isEnabled: { $exists: false } },
          { isEnabled: null }
        ]
      },
      {
        $set: { isEnabled: true }
      }
    );

    logger.info(`Migration complete: ${result.modifiedCount} users updated with isEnabled: true`);

    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
