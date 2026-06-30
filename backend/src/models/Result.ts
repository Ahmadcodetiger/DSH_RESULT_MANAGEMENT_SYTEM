import { Schema, model, Types } from 'mongoose';

const ResultSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
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
        subjectNameArabic: { type: String, default: '' },
        score60: { type: Number, default: 0 }, // Exam (standard mode) / CA (Al-Qalam)
        score20_1: { type: Number, default: 0 }, // Test 1
        score20_2: { type: Number, default: 0 }, // Test 2
        score40: { type: Number, default: 0 }, // Exam (Al-Qalam)
        score100: { type: Number, default: 0 }, // Total
        grade: { type: String, default: 'F' }, // A, B, C, D, F
        isGraded: { type: Boolean, default: true }, // If false, displays blank
        section: { type: String, enum: ['tahfeezh', 'academic', 'islamic'], default: 'academic' },
        subjectPosition: { type: String, default: '' },
        classAverage: { type: Number, default: 0 },
        prevTermScore: { type: Number, default: 0 },
        subjectRemarks: { type: String, default: '' }
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

    // Attendance Summary (Al-Qalam)
    attendanceSummary: {
      timesOpened: { type: Number, default: 0 },
      timesPresent: { type: Number, default: 0 },
      timesAbsent: { type: Number, default: 0 }
    },

    // Affective Domain (Al-Qalam)
    affectiveDomain: {
      attentiveness: { type: Number, default: 5 },
      honesty: { type: Number, default: 5 },
      neatness: { type: Number, default: 5 },
      politeness: { type: Number, default: 5 },
      punctuality: { type: Number, default: 5 },
      selfControl: { type: Number, default: 5 },
      obedience: { type: Number, default: 5 },
      reliability: { type: Number, default: 5 },
      responsibility: { type: Number, default: 5 },
      relationship: { type: Number, default: 5 }
    },

    // Psychomotor Skills (Al-Qalam)
    psychomotorSkills: {
      handlingTools: { type: Number, default: 5 },
      drawingPainting: { type: Number, default: 5 },
      handwriting: { type: Number, default: 5 },
      publicSpeaking: { type: Number, default: 5 },
      speechFluency: { type: Number, default: 5 },
      sportsGames: { type: Number, default: 5 }
    },
    
    // Cognitive Domain (Conventional / Al-Qalam)
    cognitiveDomain: {
      verbalSkills: { type: Number, default: 5 },
      writingSkills: { type: Number, default: 5 },
      readingSkills: { type: Number, default: 5 },
      calculationSkills: { type: Number, default: 5 },
      memoryRecall: { type: Number, default: 5 },
      creativity: { type: Number, default: 5 }
    },

    // Elements of Evaluation (Rating table)
    evaluationElements: [
      {
        elementLabel: { type: String, required: true },
        elementLabelArabic: { type: String, default: '' },
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
    nextTermSchoolFees: { type: String, default: '' },

    status: {
      type: String,
      enum: ['draft', 'approved'],
      default: 'draft'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

ResultSchema.virtual('isApproved').get(function(this: any) {
  return this.status === 'approved';
});

// Compound indexes for tenant-scoped queries
ResultSchema.index({ tenantId: 1, studentId: 1, academicYear: 1, term: 1 }, { unique: true });
ResultSchema.index({ tenantId: 1, term: 1, academicYear: 1 });
ResultSchema.index({ tenantId: 1, status: 1 });

export default model('Result', ResultSchema);
