export interface SubjectInput {
  subjectName: string;
  subjectNameArabic: string;
  score60: number; // Exam in standard, CA in Al-Qalam
  score20_1: number;
  score20_2: number;
  score40?: number; // Exam in Al-Qalam
  isGraded: boolean;
  section?: string;
  subjectPosition?: string;
  classAverage?: number;
  prevTermScore?: number;
  subjectRemarks?: string;
}

export interface CalculatedSubject {
  subjectName: string;
  subjectNameArabic: string;
  score60: number;
  score20_1: number;
  score20_2: number;
  score40?: number;
  score100: number;
  grade: string;
  isGraded: boolean;
  section?: string;
  subjectPosition?: string;
  classAverage?: number;
  prevTermScore?: number;
  subjectRemarks?: string;
}

/**
 * Calculates letter grade based on numeric total (standard)
 */
export const calculateLetterGrade = (total: number): string => {
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  return 'F';
};

/**
 * Calculates grade and remark based on numeric total for Al-Qalam Academy
 */
export const calculateAlQalamGradeAndRemark = (total: number): { grade: string; remark: string } => {
  const rounded = Math.round(total * 100) / 100;
  if (rounded >= 85) return { grade: 'A1', remark: 'EXCELLENT' };
  if (rounded >= 75) return { grade: 'B2', remark: 'VERY GOOD' };
  if (rounded >= 70) return { grade: 'B3', remark: 'GOOD' };
  if (rounded >= 65) return { grade: 'C4', remark: 'CREDIT' };
  if (rounded >= 60) return { grade: 'C5', remark: 'CREDIT' };
  if (rounded >= 50) return { grade: 'C6', remark: 'CREDIT' };
  if (rounded >= 45) return { grade: 'D7', remark: 'PASS' };
  if (rounded >= 40) return { grade: 'E8', remark: 'PASS' };
  return { grade: 'F9', remark: 'FAIL' };
};

/**
 * Computes grades for each subject and overall report card metrics.
 */
export const computeResultMetrics = (subjects: SubjectInput[], isAlQalam: boolean = false) => {
  let totalMark = 0;
  let gradedSubjectsCount = 0;

  const calculatedSubjects: CalculatedSubject[] = subjects.map((sub) => {
    if (!sub.isGraded) {
      return {
        ...sub,
        score100: 0,
        grade: '',
        subjectRemarks: '',
      };
    }

    let score100 = 0;
    let grade = '';
    let remark = '';

    if (isAlQalam) {
      const s60 = Math.min(60, Math.max(0, Number(sub.score60) || 0));
      const s40 = Math.min(40, Math.max(0, Number(sub.score40) || 0));
      score100 = s60 + s40;
      const res = calculateAlQalamGradeAndRemark(score100);
      grade = res.grade;
      remark = res.remark;

      totalMark += score100;
      gradedSubjectsCount += 1;

      return {
        ...sub,
        score60: s60,
        score40: s40,
        score100,
        grade,
        subjectRemarks: remark,
        isGraded: true,
      };
    } else {
      const s60 = Math.min(60, Math.max(0, Number(sub.score60) || 0));
      const s20_1 = Math.min(20, Math.max(0, Number(sub.score20_1) || 0));
      const s20_2 = Math.min(20, Math.max(0, Number(sub.score20_2) || 0));
      score100 = s60 + s20_1 + s20_2;
      grade = calculateLetterGrade(score100);

      totalMark += score100;
      gradedSubjectsCount += 1;

      return {
        ...sub,
        score60: s60,
        score20_1: s20_1,
        score20_2: s20_2,
        score100,
        grade,
        isGraded: true,
      };
    }
  });

  const finalAverage = gradedSubjectsCount > 0 ? Math.round((totalMark / gradedSubjectsCount) * 100) / 100 : 0;
  
  let generalGrade = '';
  if (isAlQalam) {
    generalGrade = calculateAlQalamGradeAndRemark(finalAverage).grade;
  } else {
    generalGrade = calculateLetterGrade(finalAverage);
  }

  return {
    subjects: calculatedSubjects,
    totalMark,
    finalAverage,
    generalGrade,
  };
};
