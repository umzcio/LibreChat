require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Script to grant admin role to a user
 * Usage: node config/make-admin.js <email>
 * Example: node config/make-admin.js admin@umontana.edu
 */
async function makeAdmin(email) {
  if (!email) {
    console.error('Usage: node config/make-admin.js <email>');
    console.error('Example: node config/make-admin.js admin@umontana.edu');
    process.exit(1);
  }

  try {
    // Connect directly to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
    });
    console.log('✓ Connected to MongoDB');

    // Define User schema inline (minimal version)
    const userSchema = new mongoose.Schema({
      email: String,
      username: String,
      role: String,
    }, { collection: 'users' });

    const User = mongoose.model('User', userSchema);

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`\n❌ User not found with email: ${email}`);
      console.error('Make sure the user has registered in LibreChat first.\n');
      await mongoose.connection.close();
      process.exit(1);
    }

    if (user.role === 'ADMIN') {
      console.log(`\n✅ User ${email} is already an ADMIN\n`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Update user to admin
    await User.updateOne(
      { _id: user._id },
      { $set: { role: 'ADMIN' } }
    );

    console.log(`\n✅ Successfully granted ADMIN role to ${email}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ADMIN`);
    console.log(`\n   You can now login to the admin dashboard at /admin\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('Could not connect to MongoDB. Check your MONGO_URI in .env\n');
    }
    process.exit(1);
  }
}

const email = process.argv[2];
makeAdmin(email);
