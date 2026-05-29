import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Student from './models/Student';
import Result from './models/Result';
import { connectDB } from './config/db';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    // 1. Clear database
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Result.deleteMany({});

    console.log('Generating seed accounts...');

    // 2. Create Admin
    const adminSalt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('adminpassword123', adminSalt);
    const admin = new User({
      username: 'admin',
      password: adminPassword,
      name: 'Academy Administrator',
      role: 'ADMIN'
    });
    await admin.save();
    console.log('✓ Admin created: username="admin", password="adminpassword123"');

    // 3. Create Teacher
    const teacherSalt = await bcrypt.genSalt(10);
    const teacherPassword = await bcrypt.hash('teacherpassword123', teacherSalt);
    const teacher = new User({
      username: 'khansau',
      password: teacherPassword,
      name: 'Khansau Abdullahi',
      role: 'TEACHER',
      assignedClasses: [
        { level: '5', section: 'ALLO' }
      ]
    });
    await teacher.save();
    console.log('✓ Teacher created: username="khansau", password="teacherpassword123"');

    // 4. Create Student (matching the reference photo)
    const student = new Student({
      admissionNumber: 'DSH/015',
      name: 'AMAANI YAHUZA',
      level: '5',
      section: 'ALLO',
      academicYear: '2025/2026',
      parentPin: '1234' // Will be hashed, plain PIN is "1234"
    });
    await student.save();
    console.log('✓ Student created: admissionNumber="DSH/015", parentPin="1234"');

    // 5. Create Result (matching the exact values in the reference photo)
    const result = new Result({
      studentId: student._id,
      academicYear: '2025/2026',
      term: 'Second Term',
      level: '5',
      section: 'ALLO',
      subjects: [
        {
          subjectName: "Al-Qur'an Karem (Hifz)",
          subjectNameArabic: "القرآن الكريم ( حفظ )",
          score60: 60,
          score20_1: 20,
          score20_2: 20,
          score100: 100,
          grade: 'A',
          isGraded: true,
          section: 'tahfeezh'
        },
        {
          subjectName: "Al-Qur'an (Writing)",
          subjectNameArabic: "القرآن كتابة",
          score60: 0,
          score20_1: 0,
          score20_2: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'tahfeezh'
        },
        {
          subjectName: "Arabic",
          subjectNameArabic: "العربية",
          score60: 60,
          score20_1: 20,
          score20_2: 20,
          score100: 100,
          grade: 'A',
          isGraded: true,
          section: 'tahfeezh'
        },
        {
          subjectName: "Grammar VERBAL",
          subjectNameArabic: "القواعد",
          score60: 58,
          score20_1: 20,
          score20_2: 20,
          score100: 98,
          grade: 'A',
          isGraded: true,
          section: 'tahfeezh'
        },
        {
          subjectName: "Islamic Subjects",
          subjectNameArabic: "المواد الإسلامية",
          score60: 55,
          score20_1: 20,
          score20_2: 20,
          score100: 95,
          grade: 'A',
          isGraded: true,
          section: 'tahfeezh'
        },
        {
          subjectName: "Science",
          subjectNameArabic: "علوم",
          score60: 60,
          score20_1: 20,
          score20_2: 20,
          score100: 100,
          grade: 'A',
          isGraded: true,
          section: 'academic'
        },
        {
          subjectName: "Literacy",
          subjectNameArabic: "معرفة القراءة والكتابة",
          score60: 60,
          score20_1: 20,
          score20_2: 20,
          score100: 100,
          grade: 'A',
          isGraded: true,
          section: 'academic'
        },
        {
          subjectName: "Numeracy",
          subjectNameArabic: "الحساب",
          score60: 50,
          score20_1: 20,
          score20_2: 20,
          score100: 90,
          grade: 'A',
          isGraded: true,
          section: 'academic'
        },
        {
          subjectName: "Phonics",
          subjectNameArabic: "سماع الصوت",
          score60: 0,
          score20_1: 0,
          score20_2: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'academic'
        },
        {
          subjectName: "Social Habits",
          subjectNameArabic: "العادات الاجتماعية",
          score60: 0,
          score20_1: 0,
          score20_2: 0,
          score100: 0,
          grade: '',
          isGraded: false,
          section: 'academic'
        }
      ],
      tahfeezhDetails: {
        absenceOfHifz: 2,
        daysPresent: 0, // not specified in original
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
      totalMark: 683,
      finalAverage: 98,
      generalGrade: 'A',
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
