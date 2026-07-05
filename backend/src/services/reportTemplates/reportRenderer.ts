import { renderNurseryReport } from './nurseryReport';
import { renderLowerPrimaryReport } from './lowerPrimaryReport';
import { renderUpperPrimaryReport } from './upperPrimaryReport';
import { renderJssReport } from './jssReport';
import { renderSssReport } from './sssReport';
import { renderIslamicReport } from './islamicReport';

export const renderAlQalamReport = async (
  result: any,
  student: any,
  tenant: any,
  classPositionString: string = '',
  classRank: number = 0,
  classCount: number = 0,
  classAverage: number = 0,
  highestScore: number = 0,
  lowestScore: number = 0
) => {
  const section = ((result.section || student.section || '').toString()).trim().toUpperCase();
  const level = ((result.level || student.level || '').toString()).trim().toUpperCase();

  const isConventional = tenant.curriculumType === 'conventional';
  const isTahfeezOrIslamic = 
    section.includes('TAHFEEZ') || section.includes('ISLAMIC') || section.includes('QURAN') ||
    level.includes('TAHFEEZ') || level.includes('ISLAMIC') || level.includes('QURAN');

  // If student belongs to Tahfeez / Islamic / Quran section, route to the special Arabic report template
  if (isTahfeezOrIslamic) {
    return await renderIslamicReport(
      result,
      student,
      tenant,
      classPositionString,
      classRank,
      classCount,
      classAverage,
      highestScore,
      lowestScore
    );
  }

  // 1. Nursery Section Detection
  if (section.startsWith('NURS') || level.startsWith('NURS') || section.includes('HUB') || level.includes('HUB')) {
    return await renderNurseryReport(
      result,
      student,
      tenant,
      isTahfeezOrIslamic,
      classPositionString,
      classRank,
      classCount
    );
  }

  // 2. JSS Section Detection
  if (section.startsWith('JSS') || level.startsWith('JSS') || level.includes('JUNIOR')) {
    return await renderJssReport(
      result,
      student,
      tenant,
      classPositionString,
      classRank,
      classCount,
      classAverage,
      highestScore,
      lowestScore,
      isTahfeezOrIslamic
    );
  }

  // 3. SSS Section Detection
  if (section.startsWith('SSS') || level.startsWith('SSS') || level.includes('SENIOR')) {
    return await renderSssReport(
      result,
      student,
      tenant,
      classPositionString,
      classRank,
      classCount,
      classAverage,
      highestScore,
      lowestScore,
      isTahfeezOrIslamic
    );
  }

  // 4. Primary Section (Split between Lower Basic 1-3 vs Upper Basic 4-6)
  if (section.startsWith('PRIM') || level.startsWith('BASIC') || level.startsWith('CLASS') || level.startsWith('GRADE') || /^\d+$/.test(level)) {
    // Determine Lower (Basic 1-3) vs Upper (Basic 4-6)
    const isLower = level.includes('1') || level.includes('2') || level.includes('3') || section.includes('LOWER');
    const isUpper = level.includes('4') || level.includes('5') || level.includes('6') || section.includes('UPPER') || section.includes('ALLO');

    if (isLower && !isUpper) {
      return await renderLowerPrimaryReport(
        result,
        student,
        tenant,
        classPositionString,
        classRank,
        classCount,
        classAverage,
        highestScore,
        lowestScore,
        isTahfeezOrIslamic
      );
    } else {
      // Default Primary fallback is Upper Primary (e.g. Basic 4-6, including Al-Qalam's ALLO/5 section)
      return await renderUpperPrimaryReport(
        result,
        student,
        tenant,
        classPositionString,
        classRank,
        classCount,
        classAverage,
        highestScore,
        lowestScore,
        isTahfeezOrIslamic
      );
    }
  }

  // 5. Final Fallback (Default to modern upper primary report layout)
  return await renderUpperPrimaryReport(
    result,
    student,
    tenant,
    classPositionString,
    classRank,
    classCount,
    classAverage,
    highestScore,
    lowestScore,
    isTahfeezOrIslamic
  );
};
