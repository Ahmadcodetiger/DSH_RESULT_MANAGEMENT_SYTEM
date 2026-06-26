import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';

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
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/huffaz_db';
  // Mask password in logs
  console.log(`Connecting to MongoDB at: ${connStr.replace(/:([^:@]+)@/, ':***@')}`);

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(connStr, {
        serverSelectionTimeoutMS: 10000, // 10 seconds per attempt
      });
      console.log('MongoDB connected successfully.');

      // Run startup migrations to ensure historical invoices and expenses are term-scoped
      try {
        const invoiceMigration = await Invoice.updateMany(
          { term: { $exists: false } },
          { $set: { term: 'First Term', academicYear: '2025/2026' } }
        );
        if (invoiceMigration.modifiedCount > 0) {
          console.log(`Migration: Scoped ${invoiceMigration.modifiedCount} legacy invoices to "First Term" / "2025/2026".`);
        }

        const expenseMigration = await Expense.updateMany(
          { term: { $exists: false } },
          { $set: { term: 'First Term', academicYear: '2025/2026' } }
        );
        if (expenseMigration.modifiedCount > 0) {
          console.log(`Migration: Scoped ${expenseMigration.modifiedCount} legacy expenses to "First Term" / "2025/2026".`);
        }
      } catch (migrationErr: any) {
        console.error('Database migration check failed:', migrationErr.message);
      }

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
