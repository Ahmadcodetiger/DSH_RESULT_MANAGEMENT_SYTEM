export interface SubjectInput {
  subjectName: string;
  subjectNameArabic: string;
  score60: number;
  score20_1: number;
  score20_2: number;
  isGraded: boolean;
}

export interface CalculatedSubject {
  subjectName: string;
  subjectNameArabic: string;
  score60: number;
  score20_1: number;
  score20_2: number;
  score100: number;
  grade: string;
  isGraded: boolean;
}

/**
 * Calculates letter grade based on numeric total
 */
export const calculateLetterGrade = (total: number): string => {
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  return 'F';
};

/**
 * Computes grades for each subject and overall report card metrics.
 */
export const computeResultMetrics = (subjects: SubjectInput[]) => {
  let totalMark = 0;
  let gradedSubjectsCount = 0;

  const calculatedSubjects: CalculatedSubject[] = subjects.map((sub) => {
    if (!sub.isGraded) {
      return {
        ...sub,
        score100: 0,
        grade: '',
      };
    }

    // Ensure values are within expected boundaries
    const s60 = Math.min(60, Math.max(0, Number(sub.score60) || 0));
    const s20_1 = Math.min(20, Math.max(0, Number(sub.score20_1) || 0));
    const s20_2 = Math.min(20, Math.max(0, Number(sub.score20_2) || 0));

    const score100 = s60 + s20_1 + s20_2;
    const grade = calculateLetterGrade(score100);

    totalMark += score100;
    gradedSubjectsCount += 1;

    return {
      subjectName: sub.subjectName,
      subjectNameArabic: sub.subjectNameArabic,
      score60: s60,
      score20_1: s20_1,
      score20_2: s20_2,
      score100,
      grade,
      isGraded: true,
    };
  });

  const finalAverage = gradedSubjectsCount > 0 ? Math.round(totalMark / gradedSubjectsCount) : 0;
  const generalGrade = calculateLetterGrade(finalAverage);

  return {
    subjects: calculatedSubjects,
    totalMark,
    finalAverage,
    generalGrade,
  };
};
