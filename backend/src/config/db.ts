import mongoose from 'mongoose';
import dns from 'dns';

// Force DNS lookup to prefer IPv4 over IPv6 to resolve ENETUNREACH/ETIMEDOUT issues in some networks
dns.setDefaultResultOrder('ipv4first');

let connectionPromise: Promise<void> | null = null;

export const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection attempt is already in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = _connect();
  try {
    await connectionPromise;
  } finally {
    // Reset the promise so future calls can retry if it failed
    if (Number(mongoose.connection.readyState) !== 1) {
      connectionPromise = null;
    }
  }
};

async function _connect() {
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/smartschool_db';
  // Mask password in logs
  console.log(`Connecting to MongoDB at: ${connStr.replace(/:([^:@]+)@/, ':***@')}`);

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(connStr, {
        serverSelectionTimeoutMS: 20000, // 20 seconds timeout
        family: 4,                      // Force IPv4 only to avoid NAT64/IPv6 timeout issues
      });
      console.log('MongoDB connected successfully.');
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) {
        console.error('Could not connect to MongoDB after maximum attempts.');
        // Do NOT call process.exit() — in serverless, that kills the function entirely
        throw error;
      }
      console.log('Retrying database connection in 2 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
