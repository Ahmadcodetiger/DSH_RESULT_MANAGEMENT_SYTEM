import QRCode from 'qrcode';
import { SCHOOL_LOGO_BASE64 } from '../../controllers/logoBase64';
import { getThemeColors } from './theme';

const escapeHtml = (unsafe: any): string => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const calculateAge = (dobString: string): string => {
  if (!dobString) return '—';
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) {
      const clean = dobString.replace(/^[A-Za-z]+,\s*/, '').replace(/-/g, ' ');
      const parsed = new Date(clean);
      if (isNaN(parsed.getTime())) return '—';
      const ageDiff = Date.now() - parsed.getTime();
      const ageDate = new Date(ageDiff);
      return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + ' yrs';
    }
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + ' yrs';
  } catch {
    return '—';
  }
};
const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const renderSssReport = async (
  result: any,
  student: any,
  tenant: any,
  classPositionString: string = '',
  classRank: number = 0,
  classCount: number = 0,
  classAverage: number = 0,
  highestScore: number = 0,
  lowestScore: number = 0,
  isTahfeezOrIslamic: boolean = false
) => {
  const colors = getThemeColors(tenant);
  const primaryColor = colors.primary;
  const headerColor = colors.headerColor;

  // Generate verification QR code - larger size with high error correction for reliable phone scanning
  let qrCodeDataUrl = '';
  try {
    const verificationUrl = `https://${tenant?.slug || 'alqalam'}.smartschool.africa/verify-result/${result._id}`;
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 4,
      width: 200,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate verification QR code:', err);
  }
  const secondaryColor = colors.secondary;
  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'AL-QALAM ACADEMY';
  const schoolNameArabic = tenant.nameArabic || '';
  const subHeader = tenant.subHeader || 'AL-QALAM ACADEMY KADUNA';
  const address = tenant.contact?.address || 'No. 2, Al-Qalam Street by Garba Rabah Road Makarfi Road Rigasa, Kaduna.';
  const phoneNumbers = tenant.contact?.phoneNumbers || tenant.contact?.phone || '08035120756, 08184610450, 08148070775';
  const email = tenant.contact?.email || 'aakaduna@gmail.com';
  const website = tenant.contact?.website || '';

  const term = result.term || '';
  const session = result.academicYear || '';

  const allSubjects = result.subjects || [];
  const academicSubjects = allSubjects;

  const isAlQalam = tenant?.slug === 'alqalam' || 
                    schoolName?.toLowerCase().includes('qalam') || 
                    (allSubjects && allSubjects.some((s: any) => s.grade === 'A1' || s.grade === 'B2'));

  const gradesList = isAlQalam 
    ? ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']
    : ['A', 'B', 'C', 'D', 'F'];

  const counts: Record<string, number> = {};
  gradesList.forEach(g => { counts[g] = 0; });

  const gradedSubjects = allSubjects.filter((s: any) => s.isGraded);
  gradedSubjects.forEach((s: any) => {
    const grade = s.grade?.toString().trim().toUpperCase() || '';
    if (counts[grade] !== undefined) {
      counts[grade]++;
    }
  });

  const totalSubjects = gradedSubjects.length;
  const totalObtainable = totalSubjects * 100;
  
  const totalObtained = result.totalMark !== undefined ? Number(result.totalMark) : 
    gradedSubjects.reduce((acc: number, curr: any) => acc + (Number(curr.score100) || 0), 0);

  const percentage = result.finalAverage !== undefined ? Number(result.finalAverage) :
    (totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0);

  const overallGrade = result.generalGrade || '—';

  const timesOpened = Number(result.attendanceSummary?.timesOpened) || 0;
  const timesPresent = Number(result.attendanceSummary?.timesPresent) || 0;
  const timesAbsent = Number(result.attendanceSummary?.timesAbsent) || 0;

  const calculateAge = (dobString: string): string => {
    if (!dobString) return '—';
    try {
      const dob = new Date(dobString);
      if (isNaN(dob.getTime())) {
        const clean = dobString.replace(/^[A-Za-z]+,\s*/, '').replace(/-/g, ' ');
        const parsed = new Date(clean);
        if (isNaN(parsed.getTime())) return dobString;
        const ageDiff = Date.now() - parsed.getTime();
        const ageDate = new Date(ageDiff);
        return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + 'yrs';
      }
      const ageDiff = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiff);
      return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + 'yrs';
    } catch {
      return dobString;
    }
  };

  const age = calculateAge(student.dob || result.studentId?.dob);

  const aff = result.affectiveDomain || {};
  const psych = result.psychomotorSkills || {};
  const cog = result.cognitiveDomain || {};

  const renderRatingRow = (label: string, ratingValue: number) => {
    const r = Number(ratingValue) || 5;
    return `
      <tr>
        <td style="padding: 2.2px 4px; color: #334155; font-weight: 600; border-bottom: 1px solid #cbd5e1; text-align: left;">${label}</td>
        ${[5, 4, 3, 2, 1].map(col => `
          <td style="padding: 2px; font-weight: bold; font-size: 8.5px; text-align: center; border-left: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: ${primaryColor};">
            ${r === col ? '✓' : ''}
          </td>
        `).join('')}
      </tr>
    `;
  };

  const renderSubjectRowsHtml = () => {
    return academicSubjects.map((s: any, idx: number) => {
      const isOdd = idx % 2 === 1;
      const totalScore = s.isGraded ? s.score100 : '—';
      const scoreCa1 = s.isGraded ? (s.score20_1 ?? '—') : '—';
      const scoreCa2 = s.isGraded ? (s.score20_2 ?? '—') : '—';
      const scoreExam = s.isGraded ? (isAlQalam ? (s.score40 ?? '—') : (s.score60 ?? '—')) : '—';
      const gradeVal = s.isGraded ? (s.grade || '—') : '—';
      const classAvgVal = s.isGraded ? (s.classAverage || s.score100) : '—';
      const prevTermScoreVal = s.isGraded ? (s.prevTermScore || '—') : '—';

      return `
        <tr style="border-bottom: 1px solid #cbd5e1; background-color: ${isOdd ? '#f8fafc' : '#ffffff'}; font-size: 8.5px;">
          <td style="padding: 3.5px 5px; font-weight: bold; color: #334155; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${escapeHtml(s.subjectName)}</span>
              ${isTahfeezOrIslamic && s.subjectNameArabic ? `<span style="font-family: 'Amiri', 'Cairo', serif; font-size: 8px; color: #64748b; font-weight: normal;">${escapeHtml(s.subjectNameArabic)}</span>` : ''}
            </div>
          </td>
          <td style="padding: 3.5px; text-align: center; color: #475569;">${scoreCa1}</td>
          <td style="padding: 3.5px; text-align: center; color: #475569;">${scoreCa2}</td>
          <td style="padding: 3.5px; text-align: center; color: #475569;">${scoreExam}</td>
          <td style="padding: 3.5px; text-align: center; font-weight: bold; color: ${secondaryColor}; background-color: ${secondaryColor}0A; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">${totalScore}</td>
          <td style="padding: 3.5px; text-align: center; color: #475569;">${s.isGraded ? (s.subjectPosition || '—') : '—'}</td>
          <td style="padding: 3.5px; text-align: center; font-weight: bold; color: ${secondaryColor}; background-color: ${secondaryColor}0A;">${gradeVal}</td>
          <td style="padding: 3.5px; text-align: center; color: #64748b;">${classAvgVal}</td>
          <td style="padding: 3.5px; text-align: center; color: #475569;">${prevTermScoreVal}</td>
        </tr>
      `;
    }).join('');
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Report Card - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri&family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          background: #ffffff;
          font-size: 8.2px;
          line-height: 1.25;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3.5px double ${primaryColor};
          padding: 10px;
          width: 100%;
          min-height: calc(297mm - 12mm);
          height: auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        tr {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        <div>
          <!-- 1. Header -->
          <table style="width: 100%; border-collapse: collapse; padding-bottom: 8px; margin-bottom: 8px;">
            <tr>
              <td style="width: 95px; vertical-align: middle;">
                <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" style="max-width: 90px; max-height: 90px; object-fit: contain;" alt="Logo" />
              </td>
              <td style="text-align: center; vertical-align: middle; padding: 0 10px;">
                <h1 style="font-size: 26px; font-weight: 800; color: #800020; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; font-family: 'Times New Roman', Times, serif;">
                  ${escapeHtml(schoolName)}
                </h1>
                <p style="font-size: 11px; color: #0a235c; margin: 2px 0 0 0; font-weight: 700;">
                  ${escapeHtml(address)}
                </p>
                ${phoneNumbers ? `<p style="font-size: 10.5px; color: #0a235c; margin: 2px 0 0 0; font-weight: 700;"><b>Tel:</b> <span style="color: #800020;">${escapeHtml(phoneNumbers)}</span></p>` : ''}
                ${email ? `<p style="font-size: 10.5px; color: #0a235c; margin: 2px 0 0 0; font-weight: 700;"><b>Email:</b> <span style="color: #800020;">${escapeHtml(email)}</span></p>` : ''}
                ${website ? `<p style="font-size: 10.5px; color: #0a235c; margin: 2px 0 0 0; font-weight: 700;"><b>Web:</b> <span style="color: #800020;">${escapeHtml(website)}</span></p>` : ''}
                <div style="margin-top: 8px; margin-bottom: 6px; font-size: 11px; font-weight: 800; padding: 4px 14px; letter-spacing: 0.5px; text-transform: uppercase; background: ${primaryColor}; color: #ffffff; display: inline-block; border-radius: 3px;">
                  ${escapeHtml(term.toLowerCase().includes('term') ? term : `${term} Term`)} Student's Performance Report
                </div>
              </td>
              <td style="width: 95px; text-align: right; vertical-align: middle;">
                ${student.picture ? `
                  <img src="${escapeHtml(student.picture)}" style="width: 80px; height: 96px; border: 2px solid ${primaryColor}; border-radius: 3px; object-fit: cover;" alt="Student" />
                ` : `
                  <div style="width: 80px; height: 96px; border: 1.5px dashed ${primaryColor}; border-radius: 3px; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; color: #94a3b8; font-size: 7px; font-weight: bold; text-align: center; padding: 4px;">
                    PASSPORT PHOTO
                  </div>
                `}
              </td>
            </tr>
          </table>
          <div style="border-top: 2.5px solid ${primaryColor}; margin-bottom: 10px;"></div>

          <!-- 2. Student Info Grid -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #cbd5e1; margin-bottom: 16px; font-size: 8.5px;">
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; width: 40%;"><span style="color: ${primaryColor}; font-weight: bold;">NAME:</span> <strong>${escapeHtml(student.name)}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; width: 30%;"><span style="color: ${primaryColor}; font-weight: bold;">CLASS:</span> <strong>${escapeHtml(student.level || result.level)}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; width: 30%;"><span style="color: ${primaryColor}; font-weight: bold;">SESSION:</span> <strong>${escapeHtml(result.academicYear)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;"><span style="color: ${primaryColor}; font-weight: bold;">ADMISSION NO:</span> <strong>${escapeHtml(student.admissionNumber)}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;"><span style="color: ${primaryColor}; font-weight: bold;">D.O.B:</span> <strong>${escapeHtml(student.dob || '—')}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;"><span style="color: ${primaryColor}; font-weight: bold;">AGE:</span> <strong>${escapeHtml(age)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;"><span style="color: ${primaryColor}; font-weight: bold;">GENDER:</span> <strong>${escapeHtml(student.gender || '—')}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;"><span style="color: ${primaryColor}; font-weight: bold;">NO. IN CLASS:</span> <strong>${classCount || '—'}</strong></td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; background: #fff8f8;"><span style="color: #800020; font-weight: bold;">CLASS POSITION:</span> <span style="color: #800020; font-weight: bold; font-size: 10px;">${classRank ? getOrdinal(classRank) : '—'}</span><span style="color: #1a1a1a; font-weight: bold; font-size: 10px;"> of ${classCount || '—'}</span></td>
            </tr>
          </table>

          <!-- 3. Main assessment grids layout -->
          <div style="display: grid; grid-template-columns: 2.15fr 1fr; gap: 8px; margin-bottom: 8px;">
            <!-- Left Column: Cognitive Domain table + Grade Analysis + Rating Indices -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                <div style="background-color: ${primaryColor}; color: #ffffff; padding: 2px 5px; font-weight: bold; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; border-radius: 2px; text-align: center;">
                  Cognitive Domain (Subjects Assessment)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.8px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #cbd5e1; color: #475569; font-weight: bold;">
                      <th style="padding: 3px 5px; text-align: left; border: 1px solid #cbd5e1;">SUBJECTS</th>
                      <th style="padding: 3px; text-align: center; width: 45px; border: 1px solid #cbd5e1;">CA1<br><span style="font-size: 6.5px; font-weight: normal; color: #64748b;">${isAlQalam ? '30' : '20'}</span></th>
                      <th style="padding: 3px; text-align: center; width: 45px; border: 1px solid #cbd5e1;">CA2<br><span style="font-size: 6.5px; font-weight: normal; color: #64748b;">${isAlQalam ? '30' : '20'}</span></th>
                      <th style="padding: 3px; text-align: center; width: 45px; border: 1px solid #cbd5e1;">EXAM<br><span style="font-size: 6.5px; font-weight: normal; color: #64748b;">${isAlQalam ? '40' : '60'}</span></th>
                      <th style="padding: 3px; text-align: center; width: 55px; background-color: ${secondaryColor}; color: #ffffff; border: 1px solid #cbd5e1;">TOTAL<br><span style="font-size: 6.5px; font-weight: normal; color: rgba(255,255,255,0.85);">100</span></th>
                      <th style="padding: 3px; text-align: center; width: 45px; border: 1px solid #cbd5e1;">POSN</th>
                      <th style="padding: 3px; text-align: center; width: 45px; background-color: ${secondaryColor}10; color: ${secondaryColor}; border: 1px solid #cbd5e1;">GRADE</th>
                      <th style="padding: 3px; text-align: center; width: 55px; border: 1px solid #cbd5e1;">CLASS<br>AVERAGE</th>
                      <th style="padding: 3px; text-align: center; width: 50px; border: 1px solid #cbd5e1;">PREV<br>TERM</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderSubjectRowsHtml()}
                  </tbody>
                </table>
              </div>

              <!-- Grade Analysis -->
              <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: #ffffff;">
                <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Analysis</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.5px; text-align: center; border: 1px solid #cbd5e1;">
                  <thead>
                    <tr style="background: #f8fafc; color: ${primaryColor}; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
                      <th style="padding: 2px; border-right: 1px solid #cbd5e1;">GRADE</th>
                      ${gradesList.map(g => `<th style="padding: 2px; border-right: 1px solid #cbd5e1;">${g}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 2px; font-weight: bold; border-right: 1px solid #cbd5e1; background: #fafbfa; color: #64748b;">NO.</td>
                      ${gradesList.map(g => `
                        <td style="padding: 2px; border-right: 1px solid #cbd5e1; font-weight: ${counts[g] > 0 ? 'bold' : 'normal'}; color: ${counts[g] > 0 ? primaryColor : '#cbd5e1'};">
                          ${counts[g] > 0 ? counts[g] : '—'}
                        </td>
                      `).join('')}
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Rating Indices -->
              <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px; background: #f8fafc; font-size: 6.5px; line-height: 1.35; color: #475569;">
                <div style="font-weight: bold; color: ${primaryColor}; margin-bottom: 3px; font-size: 7.5px; text-transform: uppercase;">Rating Indices</div>
                <div>5 - Maintains an Excellent degree of observable traits</div>
                <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
                  <span>4 - Maintains a High level of observable traits</span>
                  <span>3 - Acceptable level of observable traits</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 1.5px;">
                  <span>2 - Shows Minimal regard for observable traits</span>
                  <span>1 - Shows No regard for observable traits</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Attendance & Checklist Domains -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Attendance Summary -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff;">
                <thead>
                  <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 7.5px;">
                    <th colspan="2" style="padding: 2.5px 5px; text-transform: uppercase; text-align: center;">Attendance Summary</th>
                  </tr>
                </thead>
                <tbody style="font-size: 7.2px; color: #475569;">
                  <tr>
                    <td style="padding: 2px 5px; border-bottom: 1px solid #cbd5e1; text-align: left;">Times School Opened</td>
                    <td style="padding: 2px 5px; border-bottom: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0f172a; width: 40px;">${timesOpened}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 5px; border-bottom: 1px solid #cbd5e1; text-align: left;">Times Present</td>
                    <td style="padding: 2px 5px; border-bottom: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0f172a;">${timesPresent}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 5px; text-align: left;">Times Absent</td>
                    <td style="padding: 2px 5px; text-align: center; font-weight: bold; color: #0f172a;">${timesAbsent}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Affective Domain Table -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff;">
                <thead>
                  <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 7.5px;">
                    <th style="padding: 2.5px 5px; text-align: left;">AFFECTIVE DOMAIN</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">5</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">4</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">3</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">2</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">1</th>
                  </tr>
                </thead>
                <tbody style="font-size: 6.8px;">
                  ${renderRatingRow('Attentiveness', aff.attentiveness)}
                  ${renderRatingRow('Honesty', aff.honesty)}
                  ${renderRatingRow('Neatness', aff.neatness)}
                  ${renderRatingRow('Politeness', aff.politeness)}
                  ${renderRatingRow('Punctuality', aff.punctuality)}
                  ${renderRatingRow('Self Control', aff.selfControl)}
                  ${renderRatingRow('Obedience', aff.obedience)}
                  ${renderRatingRow('Reliability', aff.reliability)}
                  ${renderRatingRow('Sense Of Responsibility', aff.responsibility)}
                  ${renderRatingRow('Relationship With Others', aff.relationship)}
                </tbody>
              </table>

              <!-- Psychomotor Skills Table -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff;">
                <thead>
                  <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 7.5px;">
                    <th style="padding: 2.5px 5px; text-align: left;">PSYCHOMOTOR - SKILLS</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">5</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">4</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">3</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">2</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">1</th>
                  </tr>
                </thead>
                <tbody style="font-size: 6.8px;">
                  ${renderRatingRow('Handling Of Tools', psych.handlingTools)}
                  ${renderRatingRow('Drawing & Painting', psych.drawingPainting)}
                  ${renderRatingRow('Handwriting', psych.handwriting)}
                  ${renderRatingRow('Public Speaking', psych.publicSpeaking)}
                  ${renderRatingRow('Speech Fluency', psych.speechFluency)}
                  ${renderRatingRow('Sports & Games', psych.sportsGames)}
                </tbody>
              </table>

              <!-- Cognitive Domain -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff;">
                <thead>
                  <tr style="background: ${primaryColor}; color: white; font-weight: bold; font-size: 7.5px;">
                    <th style="padding: 2.5px 5px; text-align: left;">COGNITIVE DOMAIN</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">5</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">4</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">3</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">2</th>
                    <th style="width: 14px; text-align: center; border-left: 1px solid #cbd5e1;">1</th>
                  </tr>
                </thead>
                <tbody style="font-size: 6.8px;">
                  ${renderRatingRow('Verbal Skills', cog.verbalSkills)}
                  ${renderRatingRow('Writing Skills', cog.writingSkills)}
                  ${renderRatingRow('Reading Skills', cog.readingSkills)}
                  ${renderRatingRow('Calculation Skills', cog.calculationSkills)}
                  ${renderRatingRow('Memory Recall', cog.memoryRecall)}
                  ${renderRatingRow('Creativity', cog.creativity)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 4. Bottom Statistics section -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; margin-bottom: 8px;">
          <!-- Column 1: Performance Summary -->
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: #ffffff;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Performance Summary</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px; line-height: 1.45;">
              <tr><td>Total Obtained:</td><td style="font-weight: bold; text-align: right; color: ${primaryColor};">${totalObtained.toFixed(1)}</td></tr>
              <tr><td>Total Obtainable:</td><td style="font-weight: bold; text-align: right;">${totalObtainable}</td></tr>
              <tr><td>Total Subjects:</td><td style="font-weight: bold; text-align: right;">${totalSubjects}</td></tr>
              <tr><td>Percentage:</td><td style="font-weight: bold; text-align: right; color: ${primaryColor};">${percentage.toFixed(2)}%</td></tr>
              <tr><td>Grade:</td><td style="font-weight: bold; text-align: right; color: ${primaryColor};">${overallGrade}</td></tr>
            </table>
          </div>

          <!-- Column 2: Grade Scale -->
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: #ffffff;">
            <div style="font-weight: bold; border-bottom: 1.5px solid ${primaryColor}; padding-bottom: 2px; margin-bottom: 4px; color: ${primaryColor}; text-align: center; font-size: 8.5px; text-transform: uppercase;">Grade Scale</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 7px; line-height: 1.35; color: #475569;">
              ${isAlQalam ? `
                <tr><td class="font-bold" style="color: ${primaryColor};">A1</td><td>85 - 100%</td><td class="font-bold">EXCELLENT</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">B2/B3</td><td>70 - 84%</td><td class="font-bold">VERY GOOD / GOOD</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">C4-C6</td><td>50 - 69%</td><td class="font-bold">CREDIT</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">D7/E8</td><td>40 - 49%</td><td class="font-bold">PASS</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">F9</td><td>0 - 39%</td><td class="font-bold">FAIL</td></tr>
              ` : `
                <tr><td class="font-bold" style="color: ${primaryColor};">A</td><td>80 - 100%</td><td class="font-bold">EXCELLENT</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">B</td><td>70 - 79%</td><td class="font-bold">VERY GOOD</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">C</td><td>60 - 69%</td><td class="font-bold">GOOD</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">D</td><td>50 - 59%</td><td class="font-bold">PASS</td></tr>
                <tr><td class="font-bold" style="color: ${primaryColor};">F</td><td>0 - 49%</td><td class="font-bold">FAIL</td></tr>
              `}
            </table>
          </div>
        </div>

        <!-- 5. Remarks Section -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${primaryColor}; font-size: 8px; line-height: 1.35; margin-bottom: 8px;">
          <tr style="border-bottom: 1.5px solid ${primaryColor};">
            <td style="width: 18%; padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafbfa; border-right: 1px solid #cbd5e1; text-transform: uppercase;">Class Teacher's Remark</td>
            <td style="width: 57%; padding: 4px 6px; font-style: italic;">"${escapeHtml(result.teacherRecommendations || 'A good result. Keep striving for improvement.')}"</td>
            <td style="width: 25%; padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #cbd5e1; vertical-align: middle;">
              <div style="font-size: 6px; color: #64748b; text-transform: uppercase;">Teacher Name</div>
              <div style="font-size: 8px; color: ${primaryColor}; font-weight: bold; margin-top: 1px;">${escapeHtml(result.teacherName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafbfa; border-right: 1px solid #cbd5e1; text-transform: uppercase;">Principal's Remark</td>
            <td style="padding: 4px 6px; font-style: italic;">"${escapeHtml(result.headTeacherComments || 'An encouraging result. Good job.')}"</td>
            <td style="padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #cbd5e1; vertical-align: middle;">
              ${tenant.branding?.principalSignature ? `
                <img src="${tenant.branding.principalSignature}" style="max-height: 22px; object-fit: contain; display: block; margin-left: auto; margin-bottom: 1px;" alt="Signature" />
              ` : `
                <div style="font-family: 'Times New Roman', 'Times', serif; font-size: 9px; font-style: italic; color: ${primaryColor}; font-weight: bold; line-height: 1;">Principal</div>
              `}
              <div style="font-size: 6px; color: #64748b; text-transform: uppercase; margin-top: 1px;">Principal Signature</div>
            </td>
          </tr>
        </table>

        <!-- 6. Next Term Resumption Date & QR Verification -->
        <table style="width: 100%; border-collapse: collapse; border-top: 2px solid ${primaryColor}; border-bottom: 2px solid ${primaryColor}; font-size: 8px; margin-bottom: 8px; background: #fafbfa;">
          <tr>
            <td style="padding: 6px 8px; font-weight: bold; color: ${primaryColor}; width: 38%; vertical-align: middle;">
              NEXT TERM BEGINS: <span style="color: #334155; margin-left: 4px;">${escapeHtml(result.nextTermBegins || '—')}</span>
            </td>
            <td style="padding: 4px 6px; text-align: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; width: 24%; vertical-align: middle;">
              <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width: 56px; height: 56px;" alt="QR Verification Code" />` : ''}
                <div style="text-align: left;">
                  <span style="font-size: 6px; font-weight: 800; color: ${secondaryColor}; text-transform: uppercase; line-height: 1.2; display: block;">
                    Scan to<br>Verify Result
                  </span>
                  <span style="font-size: 5px; color: #64748b; display: block; margin-top: 2px;">SmartSchool</span>
                </div>
              </div>
            </td>
            <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${primaryColor}; width: 38%; vertical-align: middle;">
              DATE: <span style="color: #334155; margin-left: 4px;">${escapeHtml(result.dateIssued || new Date().toLocaleDateString('en-GB'))}</span>
            </td>
          </tr>
        </table>

        <!-- 7. Footer -->
        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 6.5px; color: #64748b; margin-top: 4px;">
          <tr>
            <td>Generated by <strong>Smart School Management System</strong> • ${new Date().toLocaleString()}</td>
            <td style="text-align: center; text-transform: uppercase; font-weight: 700; color: ${primaryColor};">
              ${schoolName.toUpperCase()} Kaduna
            </td>
            <td style="text-align: right;"><strong>Report ID:</strong> <code>${result._id}</code></td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
};
