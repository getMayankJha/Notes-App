const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri, { dbName: 'realtime-notes' });
  console.log('MongoDB connected');
}

module.exports = { connectDB };
