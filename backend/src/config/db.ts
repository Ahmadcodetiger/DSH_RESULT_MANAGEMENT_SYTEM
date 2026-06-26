import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';

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
        console.error('FATAL ERROR: Could not connect to MongoDB after maximum attempts.');
        process.exit(1);
      }
      console.log('Retrying database connection in 3 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};
