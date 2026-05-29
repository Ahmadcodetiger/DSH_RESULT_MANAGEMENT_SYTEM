import { Schema, model, Types } from 'mongoose';

const ResultSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYear: {
      type: String,
      required: true, // e.g. "2025/2026"
    },
    term: {
      type: String,
      required: true, // e.g. "Second Term"
    },
    level: {
      type: String,
      required: true, // level when graded, e.g. "5"
    },
    section: {
      type: String,
      required: true, // e.g. "ALLO"
    },
    
    // Grades Table
    subjects: [
      {
        subjectName: { type: String, required: true },
        subjectNameArabic: { type: String, required: true },
        score60: { type: Number, default: 0 }, // Exam
        score20_1: { type: Number, default: 0 }, // Test 1
        score20_2: { type: Number, default: 0 }, // Test 2
        score100: { type: Number, default: 0 }, // Total (60 + 20 + 20)
        grade: { type: String, default: 'F' }, // A, B, C, D, F
        isGraded: { type: Boolean, default: true }, // If false, displays blank (for optional/not-taken subjects)
        section: { type: String, enum: ['tahfeezh', 'academic'], default: 'academic' }
      }
    ],

    // Tahfeezh Details (Lower middle section)
    tahfeezhDetails: {
      absenceOfHifz: { type: Number, default: 0 }, // count of missed sessions
      daysPresent: { type: Number, default: 0 },
      daysAbsent: { type: Number, default: 0 },
      fromSurah: { type: String, default: '' }, // Dropdown value
      toSurah: { type: String, default: '' }, // Dropdown value
      memorizedPages: { type: Number, default: 0 }
    },

    // Elements of Evaluation (Rating table)
    evaluationElements: [
      {
        elementLabel: { type: String, required: true },
        elementLabelArabic: { type: String, required: true },
        rating: { type: String, default: '' } // ممتاز جدا (Excellent), ممتاز (V.Good), جيد جدا (Good), مقبول (Pass), ضعيف (Poor)
      }
    ],

    // Total stats
    totalMark: { type: Number, default: 0 }, // Sum of scores for graded subjects
    finalAverage: { type: Number, default: 0 }, // Average of scores for graded subjects
    generalGrade: { type: String, default: 'F' }, // A, B, C, D, F based on finalAverage

    // Signatures and recommendations
    supervisorRecommendations: { type: String, default: '' },
    teacherRecommendations: { type: String, default: '' },
    headTeacherComments: { type: String, default: '' },
    
    teacherName: { type: String, required: true },
    
    dateIssued: { type: String, default: '' }, // e.g. "11-3-2026"
    nextTermBegins: { type: String, default: '' }, // e.g. "13-4-2026"

    status: {
      type: String,
      enum: ['draft', 'approved'],
      default: 'draft'
    }
  },
  {
    timestamps: true,
  }
);

export default model('Result', ResultSchema);
