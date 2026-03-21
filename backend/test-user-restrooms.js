import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restroom from './models/Restroom.js';
import User from './models/User.js';

dotenv.config();

async function testUserRestrooms() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the specific user
    const userId = '69be4e5f13d355f481fed290';
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return;
    }

    console.log('\n📋 User Info:');
    console.log('   ID:', user._id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Added Restrooms (array):', user.addedRestrooms);

    // Query restrooms created by this user
    console.log('\n🔍 Querying restrooms where createdBy = ' + userId);
    const restrooms = await Restroom.find({ createdBy: userId }).populate('createdBy', 'username email');
    
    console.log('   Found:', restrooms.length, 'restrooms');
    restrooms.forEach((r, i) => {
      console.log(`   [${i}]`, r._id, r.name);
    });

    if (restrooms.length === 0) {
      console.log('\n⚠️  No restrooms found for this user!');
      console.log('   Check if the user actually created any restrooms.');
    }

    console.log('\n✅ Test complete');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testUserRestrooms();
