const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  throw new Error('FATAL FAULT: MONGODB_URI is missing from your environment.');
}

let cached = global.__hackclockMongo;

if (!cached) {
  cached = global.__hackclockMongo = {
    conn: null,
    promise: null,
  };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, { dbName: 'HackTime' }).then((mongooseInstance) => {
      console.log('MongoDB Secure Cluster Connection Established');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

module.exports = connectDB;
