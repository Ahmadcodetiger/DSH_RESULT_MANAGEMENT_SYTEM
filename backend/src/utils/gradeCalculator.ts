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
  score100?: number;
  grade?: string;
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

export { getNurserySubjectNames } from './nurseryCurriculum';

export const NURSERY_SUBJECT_NAMES = [
  // NUMERACY
  'Can do simple addition of numbers.',
  'Can do simple subtraction of numbers.',
  'Can identify and recognise money e.g 10naira.',
  'Can do addition and subtraction of money.',
  'Can write number 1 - 100 neatly.',
  'Can identify numbers 1 - 100.',

  // LITERACY
  'Can blend 3 letters word eg cat, rat e.t.c',
  'Can recognise 3 letter\'s word',
  'Can form 3 letters words',
  'Can used article "a"',
  'Can reads all the letters from A-Z neatly.',
  'Can makes simple sentences.',

  // CREATIVE ART
  'Can scribble neatly within limit',
  'Can identify both the primary and secondary colours. E.g. blue, green, red',
  'Can grip the crayon in a tripod position',
  'Can sit uprightly while colouring',
  'Can identify the object(s) to be coloured',
  'Can sit uprightly while writing.',
  'Can sit uprightly while colouring.',

  // SENSORIAL EDUCATION
  'Can define water and list their uses.',
  'Can define animals and list their parts.',
  'Can define creepy-crawlies animals and give their examples.',
  'Can list land and water animals.',
  'Can identify human body parts.',

  // RHYMES
  'Can recite the rhyme "layla layla .................."',
  'Can recite the rhyme "rain rain go away .................."',
  'Can recite the rhyme "If you hear your name .................."',
  'Can follow the rhymes "You want to know me .................."',
  'Can follow the rhymes "twinkle twinkle little star ............"',
  'Can recite other primary rhymes.',

  // SOCIAL & EMOTIONAL DEVELOPMENT
  'Can define clothes and list their examples.',
  'Can define transportation and the means of transportation.',
  'Can define plants with their parts.',
  'Can define flower and the types of flowers.',
  'Can define fruits and list the examples of fruits.',
  'Can express feelings and emotions.',

  // HANDWRITING
  'Can writes all the letters from A-Z in both cases',
  'Can writes from left-right and from top-bottom neatly',
  'Can copy from the whiteboard.',
  'Can hold the pencil in a tripod position.',
  'Can sit uprightly while writing.',
  'Can write numbers neatly.'
];

/**
 * Computes grades for each subject and overall report card metrics.
 */
export const isNurseryOrHub = (lvl: string = '', sec: string = ''): boolean => {
  const l = (lvl || '').toUpperCase();
  const s = (sec || '').toUpperCase();
  return l.includes('NURSERY') || s.includes('NURSERY') || 
         l.includes('PLAY') || s.includes('PLAY') || 
         l.includes('KINDERGARTEN') || s.includes('KINDERGARTEN') ||
         l.includes('LEARNING HUB') || s.includes('LEARNING HUB') ||
         l.includes('HUB') || s.includes('HUB') ||
         l.includes('NUR') || s.includes('NUR');
};

/**
 * Computes grades for each subject and overall report card metrics.
 */
export const computeResultMetrics = (subjects: SubjectInput[], isAlQalam: boolean = false, section?: string, level?: string) => {
  let totalMark = 0;
  let gradedSubjectsCount = 0;
  const isNursery = isNurseryOrHub(level, section);

  const calculatedSubjects: CalculatedSubject[] = subjects.map((sub) => {
    if (isNursery) {
      if (!sub.isGraded) {
        return {
          ...sub,
          score100: 0,
          grade: '',
          subjectRemarks: '',
        };
      }
      const score100 = sub.score100 || 0;
      let grade = sub.grade || '';
      if (!grade && score100) {
        if (score100 >= 80) grade = 'E';
        else if (score100 >= 50) grade = 'S';
        else grade = 'N';
      }
      totalMark += score100;
      gradedSubjectsCount += 1;

      return {
        ...sub,
        score100,
        grade,
        isGraded: true,
      };
    }

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
      const s20_1 = Math.min(30, Math.max(0, Number(sub.score20_1) || 0));
      const s20_2 = Math.min(30, Math.max(0, Number(sub.score20_2) || 0));
      const s40 = Math.min(40, Math.max(0, Number(sub.score40) || 0));
      score100 = s20_1 + s20_2 + s40;
      const res = calculateAlQalamGradeAndRemark(score100);
      grade = res.grade;
      remark = res.remark;

      totalMark += score100;
      gradedSubjectsCount += 1;

      return {
        ...sub,
        score20_1: s20_1,
        score20_2: s20_2,
        score60: s20_1 + s20_2, // Keep score60 as CA Total
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
  if (isNursery) {
    if (finalAverage >= 80) generalGrade = 'E';
    else if (finalAverage >= 50) generalGrade = 'S';
    else generalGrade = 'N';
  } else if (isAlQalam) {
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
