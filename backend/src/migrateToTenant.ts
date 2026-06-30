import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { connectDB } from './config/db';
import Tenant from './models/Tenant';
import Plan from './models/Plan';
import Subscription from './models/Subscription';
import User from './models/User';
import Student from './models/Student';
import Result from './models/Result';
import SchoolClass from './models/SchoolClass';
import Subject from './models/Subject';
import Invoice from './models/Invoice';
import Expense from './models/Expense';
import Salary from './models/Salary';
import Notification from './models/Notification';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

/**
 * Migration Script
 * 
 * 1. Connects to the database.
 * 2. Seeds standard billing plans if they don't exist yet.
 * 3. Creates the first "default" Tenant (representing the legacy school, e.g. Darul Hikmah / Huffaz Academy).
 * 4. Creates a Subscription for the default tenant.
 * 5. Migrates all orphan database records (User, Student, Result, class, subject, etc.)
 *    to belong to this default tenant by setting their `tenantId`.
 * 6. Drops the legacy `settings` collection if it exists.
 */
const runMigration = async () => {
  try {
    await connectDB();
    console.log('Starting migration to multi-tenant structure...\n');

    // --- STEP 1: Verify / Seed Plans ---
    console.log('[Step 1] Verifying subscription plans...');
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      console.log('No plans found. Please seed plans first using seedPlans.ts or wait for auto-seed...');
      // We will seed them inline here as well to ensure they exist
      const defaultPlans = [
        {
          planId: 'starter',
          name: 'Starter',
          priceMonthly: 20000,
          priceYearly: 200000,
          limits: { maxStudents: 200, maxTeachers: 15, maxAdmins: 2, maxStorageMB: 500, maxAiCallsPerMonth: 100 },
        },
        {
          planId: 'professional',
          name: 'Professional',
          priceMonthly: 50000,
          priceYearly: 500000,
          limits: { maxStudents: 500, maxTeachers: 50, maxAdmins: 5, maxStorageMB: 2000, maxAiCallsPerMonth: 500 },
        },
        {
          planId: 'enterprise',
          name: 'Enterprise',
          priceMonthly: 150000,
          priceYearly: 1500000,
          limits: { maxStudents: 99999, maxTeachers: 99999, maxAdmins: 99999, maxStorageMB: 50000, maxAiCallsPerMonth: 99999 },
        },
      ];
      for (const p of defaultPlans) {
        await Plan.findOneAndUpdate({ planId: p.planId }, p, { upsert: true });
      }
      console.log('✓ Standard plans created.');
    } else {
      console.log(`✓ ${planCount} plans verified.`);
    }

    // --- STEP 2: Create Default Tenant (Tenant 0) ---
    console.log('\n[Step 2] Creating default Tenant (Tenant 0) for legacy school...');
    
    // Find legacy settings to copy details if they exist
    let legacySettings: any = null;
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections({ name: 'settings' }).toArray();
        if (collections.length > 0) {
          legacySettings = await db.collection('settings').findOne({ key: 'school_info' });
          console.log('✓ Found legacy school settings database record.');
        }
      }
    } catch (err: any) {
      console.log('No legacy settings collection found or accessible. Using defaults.', err.message);
    }

    const defaultSlug = 'darulhikmah'; // default tenant slug
    let tenant = await Tenant.findOne({ slug: defaultSlug });

    if (!tenant) {
      tenant = new Tenant({
        slug: defaultSlug,
        name: legacySettings?.schoolName || 'Home of Young Huffaz Academy',
        nameArabic: legacySettings?.schoolNameArabic || 'أكاديمية دار صغار الحفاظ',
        subHeader: legacySettings?.schoolSubHeader || 'Early Years · Elementary · Islamic/Tahfeezh (Dual Curriculum)',
        status: 'active',
        domains: {
          subdomain: defaultSlug,
          customDomain: '',
        },
        branding: {
          logo: '',
          favicon: '',
          primaryColor: '#1a7a4c',
          secondaryColor: '#f0c14b',
        },
        contact: {
          address: legacySettings?.address || 'Address complex, Takushara, Abuja, Nigeria',
          phoneNumbers: legacySettings?.phoneNumbers || '+2348037322312, +2349033245467',
          email: legacySettings?.email || 'info@younghuffaz.com',
        },
        academicConfig: {
          currentAcademicYear: legacySettings?.currentAcademicYear || '2025/2026',
          currentTerm: legacySettings?.currentTerm || 'Second Term',
          annexes: legacySettings?.annexes || [],
          accountantWhatsApp: legacySettings?.accountantWhatsApp || '',
        },
        subscription: {
          planId: 'professional',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year active
        },
      });
      await tenant.save();
      console.log(`✓ Default Tenant "${tenant.name}" created successfully (slug: "${defaultSlug}").`);
    } else {
      console.log(`✓ Default Tenant "${tenant.name}" already exists.`);
    }

    const tenantId = tenant._id;

    // --- STEP 3: Create Default Subscription ---
    console.log('\n[Step 3] Checking subscription record...');
    let sub = await Subscription.findOne({ tenantId });
    if (!sub) {
      sub = new Subscription({
        tenantId,
        planId: 'professional',
        status: 'active',
        amount: 50000,
        currency: 'NGN',
        billingCycle: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await sub.save();
      console.log('✓ Subscription created.');
    } else {
      console.log('✓ Subscription already exists.');
    }

    // --- STEP 4: Scope all orphan records to this tenant ---
    console.log('\n[Step 4] Migrating orphan data records...');

    const modelsToMigrate = [
      { name: 'User', model: User },
      { name: 'Student', model: Student },
      { name: 'Result', model: Result },
      { name: 'SchoolClass', model: SchoolClass },
      { name: 'Subject', model: Subject },
      { name: 'Invoice', model: Invoice },
      { name: 'Expense', model: Expense },
      { name: 'Salary', model: Salary },
      { name: 'Notification', model: Notification },
    ];

    for (const item of modelsToMigrate) {
      // Find items that don't have tenantId field
      const orphansCount = await item.model.countDocuments({ tenantId: { $exists: false } });
      if (orphansCount > 0) {
        console.log(`  -> Migrating ${orphansCount} legacy ${item.name} records...`);
        const result = await item.model.updateMany(
          { tenantId: { $exists: false } },
          { $set: { tenantId } }
        );
        console.log(`  ✓ Updated ${result.modifiedCount} ${item.name} records.`);
      } else {
        console.log(`  ✓ All ${item.name} records are already scoped.`);
      }
    }

    // --- STEP 5: Drop Legacy Settings Collection ---
    console.log('\n[Step 5] Dropping legacy Settings collection...');
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections({ name: 'settings' }).toArray();
        if (collections.length > 0) {
          await db.dropCollection('settings');
          console.log('✓ Legacy Settings collection dropped successfully.');
        } else {
          console.log('✓ Legacy Settings collection does not exist.');
        }
      }
    } catch (err: any) {
      console.error('  ✕ Failed to drop settings collection:', err.message);
    }

    console.log('\n🎉 Multi-Tenant Migration Completed Successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('\n✕ Migration failed with error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

runMigration();
