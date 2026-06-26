import mongoose from 'mongoose';

export const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huffaz_db';
  console.log(`Connecting to MongoDB at: ${connStr.replace(/:([^:@]+)@/, ':***@')}`);

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(connStr, {
        serverSelectionTimeoutMS: 5000 // Fail fast in 5 seconds
      });
      console.log('MongoDB connected successfully.');
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) {
        console.error('FATAL ERROR: Could not connect to MongoDB after maximum attempts.');
        process.exit(1);
      }
      console.log('Retrying database connection in 3 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};
