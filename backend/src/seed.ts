import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Student from './models/Student';
import Result from './models/Result';
import Tenant from './models/Tenant';
import { connectDB } from './config/db';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    // 1. Resolve or create a tenant for seeding
    console.log('Resolving tenant for seeding...');
    let tenant = await Tenant.findOne();
    if (!tenant) {
      tenant = new Tenant({
        slug: 'alqalam',
        name: 'Al-Qalam Academy',
        nameArabic: 'أكاديمية القلم',
        status: 'active',
        domains: { subdomain: 'alqalam' },
        contact: { email: 'admin@alqalam.com' }
      });
      await tenant.save();
      console.log('✓ Created default Al-Qalam tenant for seeding');
    }
    const tenantId = tenant._id;

    // 2. Clear database users, students, results
    console.log('Clearing existing data (Users, Students, Results)...');
    await User.deleteMany({ tenantId });
    await Student.deleteMany({ tenantId });
    await Result.deleteMany({ tenantId });

    console.log('Generating seed accounts...');

    // 3. Create Super Admin
    const superAdminSalt = await bcrypt.genSalt(10);
    const superAdminPassword = await bcrypt.hash('superadmin123', superAdminSalt);
    const superAdmin = new User({
      tenantId,
      username: 'superadmin',
      password: superAdminPassword,
      name: 'SaaS Platform Operator',
      role: 'SUPER_ADMIN'
    });
    await superAdmin.save();
    console.log('✓ Super Admin created: username="superadmin", password="superadmin123"');

    // 4. Create Admin
    const adminSalt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('adminpassword123', adminSalt);
    const admin = new User({
      tenantId,
      username: 'admin',
      password: adminPassword,
      name: 'Academy Administrator',
      role: 'ADMIN'
    });
    await admin.save();
    console.log('✓ Admin created: username="admin", password="adminpassword123"');

    // 5. Create Teacher
    const teacherSalt = await bcrypt.genSalt(10);
    const teacherPassword = await bcrypt.hash('teacherpassword123', teacherSalt);
    const teacher = new User({
      tenantId,
      username: 'khansau',
      password: teacherPassword,
      name: 'Khansau Abdullahi',
      role: 'TEACHER',
      assignedClasses: [
        { level: '5', section: 'ALLO', subjectName: "Al-Qur'an Karem (Hifz)" }
      ]
    });
    await teacher.save();
    console.log('✓ Teacher created: username="khansau", password="teacherpassword123"');

    // 6. Create Accountant
    const accountantSalt = await bcrypt.genSalt(10);
    const accountantPassword = await bcrypt.hash('accountantpassword123', accountantSalt);
    const accountant = new User({
      tenantId,
      username: 'accountant',
      password: accountantPassword,
      name: 'Academy Accountant',
      role: 'ACCOUNTANT'
    });
    await accountant.save();
    console.log('✓ Accountant created: username="accountant", password="accountantpassword123"');

    // 7. Create Director/Proprietor
    const directorSalt = await bcrypt.genSalt(10);
    const directorPassword = await bcrypt.hash('directorpassword123', directorSalt);
    const director = new User({
      tenantId,
      username: 'director',
      password: directorPassword,
      name: 'Academy Director',
      role: 'DIRECTOR'
    });
    await director.save();
    console.log('✓ Director created: username="director", password="directorpassword123"');

    // 8. Create Student (matching the reference photo)
    const student = new Student({
      tenantId,
      admissionNumber: 'DSH/015',
      name: 'AMAANI YAHUZA',
      level: '5',
      section: 'ALLO',
      academicYear: '2025/2026',
      parentPin: '1234', // Will be hashed, plain PIN is "1234"
      dob: 'Thu, 15-Jul-2010',
      gender: 'FEMALE',
      house: 'Yellow House',
      club: 'Press Club'
    });
    await student.save();
    console.log('✓ Student created: admissionNumber="DSH/015", parentPin="1234"');

    // 9. Create Result (matching the exact values in the reference photo)
    const result = new Result({
      tenantId,
      studentId: student._id,
      academicYear: '2025/2026',
      term: 'Second Term',
      level: '5',
      section: 'ALLO',
      subjects: [
        {
          subjectName: "Al-Qur'an Karem (Hifz)",
          subjectNameArabic: "القرآن الكريم ( حفظ )",
          score60: 55,
          score40: 38,
          score100: 93,
          grade: 'A1',
          isGraded: true,
          section: 'tahfeezh',
          subjectPosition: '1st',
          classAverage: 88,
          subjectRemarks: 'EXCELLENT'
        },
        {
          subjectName: "Al-Qur'an (Writing)",
          subjectNameArabic: "القرآن كتابة",
          score60: 0,
          score40: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'tahfeezh',
          subjectPosition: '',
          classAverage: 0,
          subjectRemarks: ''
        },
        {
          subjectName: "Arabic",
          subjectNameArabic: "العربية",
          score60: 52,
          score40: 35,
          score100: 87,
          grade: 'A1',
          isGraded: true,
          section: 'tahfeezh',
          subjectPosition: '2nd',
          classAverage: 82,
          subjectRemarks: 'EXCELLENT'
        },
        {
          subjectName: "Grammar VERBAL",
          subjectNameArabic: "القواعد",
          score60: 48,
          score40: 32,
          score100: 80,
          grade: 'B2',
          isGraded: true,
          section: 'tahfeezh',
          subjectPosition: '3rd',
          classAverage: 78,
          subjectRemarks: 'VERY GOOD'
        },
        {
          subjectName: "Islamic Subjects",
          subjectNameArabic: "المواد الإسلامية",
          score60: 50,
          score40: 35,
          score100: 85,
          grade: 'A1',
          isGraded: true,
          section: 'tahfeezh',
          subjectPosition: '1st',
          classAverage: 80,
          subjectRemarks: 'EXCELLENT'
        },
        {
          subjectName: "Science",
          subjectNameArabic: "علوم",
          score60: 52,
          score40: 36,
          score100: 88,
          grade: 'A1',
          isGraded: true,
          section: 'academic',
          subjectPosition: '1st',
          classAverage: 82,
          subjectRemarks: 'EXCELLENT'
        },
        {
          subjectName: "Literacy",
          subjectNameArabic: "معرفة القراءة والكتابة",
          score60: 55,
          score40: 38,
          score100: 93,
          grade: 'A1',
          isGraded: true,
          section: 'academic',
          subjectPosition: '2nd',
          classAverage: 85,
          subjectRemarks: 'EXCELLENT'
        },
        {
          subjectName: "Numeracy",
          subjectNameArabic: "الحساب",
          score60: 45,
          score40: 30,
          score100: 75,
          grade: 'B2',
          isGraded: true,
          section: 'academic',
          subjectPosition: '4th',
          classAverage: 76,
          subjectRemarks: 'VERY GOOD'
        },
        {
          subjectName: "Phonics",
          subjectNameArabic: "سماع الصوت",
          score60: 0,
          score40: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'academic',
          subjectPosition: '',
          classAverage: 0,
          subjectRemarks: ''
        },
        {
          subjectName: "Social Habits",
          subjectNameArabic: "العادات الاجتماعية",
          score60: 0,
          score40: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'academic',
          subjectPosition: '',
          classAverage: 0,
          subjectRemarks: ''
        }
      ],
      tahfeezhDetails: {
        absenceOfHifz: 2,
        daysPresent: 0,
        daysAbsent: 2,
        fromSurah: 'البقرة',
        toSurah: 'الكهف',
        memorizedPages: 0
      },
      evaluationElements: [
        {
          elementLabel: 'Correctness of recitation & Tajweed Practicing',
          elementLabelArabic: 'صحة التلاوة وتطبيق التجويد',
          rating: 'ممتاز جدا'
        },
        {
          elementLabel: 'Excellent Sound and Performance',
          elementLabelArabic: 'جودة الصوت والأداء المتميز',
          rating: 'ممتاز جدا'
        },
        {
          elementLabel: 'Emotional Stability & Honesty',
          elementLabelArabic: 'الاستقرار العاطفي والصدق والأمانة',
          rating: 'ممتاز جدا'
        },
        {
          elementLabel: 'Perseverance and Relationship with Students',
          elementLabelArabic: 'المثابرة والعلاقة مع الطلاب',
          rating: 'ممتاز جدا'
        },
        {
          elementLabel: 'Language Skills (Reading, Listening and Oral)',
          elementLabelArabic: 'المهارات اللغوية (مهارة القراءة والكتابة والاستماع والتعبير الشفهي)',
          rating: 'ممتاز'
        },
        {
          elementLabel: 'Group & School Activities',
          elementLabelArabic: 'الأنشطة الأسرية والمدرسية',
          rating: 'ممتاز'
        }
      ],
      attendanceSummary: {
        timesOpened: 90,
        timesPresent: 88,
        timesAbsent: 2
      },
      affectiveDomain: {
        attentiveness: 5,
        honesty: 5,
        neatness: 5,
        politeness: 5,
        punctuality: 5,
        selfControl: 5,
        obedience: 5,
        reliability: 5,
        responsibility: 5,
        relationship: 5
      },
      psychomotorSkills: {
        handlingTools: 5,
        drawingPainting: 5,
        handwriting: 5,
        publicSpeaking: 5,
        speechFluency: 5,
        sportsGames: 5
      },
      totalMark: 596,
      finalAverage: 85,
      generalGrade: 'Distinction',
      supervisorRecommendations: 'Masha Allah Barakallah Feeki',
      teacherRecommendations: 'A good and disciplined student. Allah bless you...',
      headTeacherComments: 'An Outstanding Performance. Keep it up.',
      teacherName: 'Khansau Abdullahi',
      dateIssued: '11-3-2026',
      nextTermBegins: '13-4-2026'
    });

    await result.save();
    console.log('✓ Mock Result sheet created matching reference sheet photo!');

    console.log('\nDatabase seeding completed successfully.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
  }
};

seed();
