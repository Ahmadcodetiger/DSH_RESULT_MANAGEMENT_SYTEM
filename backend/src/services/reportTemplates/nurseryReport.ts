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

const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${weekday}, ${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

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
      return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + ' yrs';
    }
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    return String(Math.abs(ageDate.getUTCFullYear() - 1970)) + ' yrs';
  } catch {
    return dobString;
  }
};

const getCategoryOfSubject = (subjectName: string): string => {
  const name = subjectName.toLowerCase();
  
  if (
    name.includes('addition') || 
    name.includes('subtraction') || 
    name.includes('number') || 
    name.includes('money') || 
    name.includes('numeracy') || 
    name.includes('count') || 
    name.includes('math') ||
    name.includes('greater than') || 
    name.includes('less than sign') || 
    name.includes('appropriate sign') || 
    name.includes('fraction') || 
    name.includes('longer and shorter') || 
    name.includes('faces of clock') || 
    name.includes('heavy and light') || 
    name.includes('capacity') || 
    name.includes('3-dimensional') || 
    name.includes('flat shapes')
  ) {
    return 'NUMERACY';
  }
  
  if (
    name.includes('blend') || 
    name.includes('letter') || 
    name.includes('word') || 
    name.includes('article') || 
    name.includes('literacy') || 
    name.includes('sound') || 
    name.includes('read') || 
    name.includes('english') || 
    name.includes('phonics') ||
    name.includes('vowel & consonant') || 
    name.includes('vowel and consonant') || 
    name.includes('sentence') || 
    name.includes('opposite of some word') || 
    name.includes('noun') || 
    name.includes('plural of some words') || 
    name.includes('present and past') || 
    name.includes('his and her') || 
    name.includes('verb')
  ) {
    return 'LITERACY';
  }
  
  if (
    name.includes('scribble') || 
    name.includes('colour') || 
    name.includes('crayon') || 
    name.includes('creative') || 
    name.includes('art') || 
    name.includes('craft') ||
    name.includes('draw and colour')
  ) {
    return 'CREATIVE ART';
  }
  
  if (
    name.includes('water') || 
    name.includes('animal') || 
    name.includes('creepy') || 
    name.includes('sensorial') || 
    name.includes('science') || 
    name.includes('body') ||
    name.includes('sense organ') || 
    name.includes('root plant') || 
    name.includes('diet') || 
    name.includes('cleanliness') || 
    name.includes('healthy habit') || 
    name.includes('appliances') || 
    name.includes('disease') || 
    name.includes('immunisation') || 
    name.includes('road sign') || 
    name.includes('first aid')
  ) {
    return 'SENSORIAL EDUCATION';
  }
  
  if (
    name.includes('recite') || 
    name.includes('rhyme') || 
    name.includes('song') || 
    name.includes('twinkle') || 
    name.includes('rain') ||
    name.includes('jolly jolly') || 
    name.includes('how do you do') || 
    name.includes('buckle my shoe') || 
    name.includes('wheel on the bus') || 
    name.includes('caught a fish') || 
    name.includes('private parts') || 
    name.includes('black sheep') || 
    name.includes('no play') || 
    name.includes('little teapot')
  ) {
    return 'RHYMES';
  }
  
  if (
    name.includes('clothes') || 
    name.includes('transport') || 
    name.includes('plant') || 
    name.includes('flower') || 
    name.includes('fruit') || 
    name.includes('social') || 
    name.includes('emotional') || 
    name.includes('habit') || 
    name.includes('behav') ||
    name.includes('greetings') || 
    name.includes('found in the home') || 
    name.includes('action') || 
    name.includes('birds') || 
    name.includes('soil') || 
    name.includes('landform') || 
    name.includes('public places') || 
    name.includes('community helpers') || 
    name.includes('nigerian flag') || 
    name.includes('country') || 
    name.includes('anthem') || 
    name.includes('drug abuse')
  ) {
    return 'SOCIAL & EMOTIONAL DEVELOPMENT';
  }
  
  if (
    name.includes('write') || 
    name.includes('writing') || 
    name.includes('handwriting') || 
    name.includes('pencil') || 
    name.includes('whiteboard') ||
    name.includes('copy from the board') || 
    name.includes('space between') ||
    name.includes('copy')
  ) {
    return 'HANDWRITING';
  }
  
  return 'LITERACY'; // Default fallback
};

const getRatingChecked = (s: any): 'E' | 'S' | 'N' | '' => {
  if (!s.isGraded) return '';
  const score = Number(s.score100);
  const grade = String(s.grade || '').toUpperCase();
  
  if (grade === 'E' || grade === 'EXCELLENT' || score >= 80 || s.score60 >= 4.5) return 'E';
  if (grade === 'N' || grade === 'NEEDS IMPROVEMENT' || grade === 'F' || (score > 0 && score < 50) || (s.score60 > 0 && s.score60 <= 2.5)) return 'N';
  if (grade === 'S' || grade === 'SATISFACTORY' || (score >= 50 && score < 80) || (s.score60 >= 3 && s.score60 < 4.5)) return 'S';
  
  return 'S'; // default fallback
};

const padRows = (subjectsInCategory: any[], count: number) => {
  const padded = [...subjectsInCategory];
  while (padded.length < count) {
    padded.push({ subjectName: '', isGraded: false });
  }
  return padded;
};

export const renderNurseryReport = async (
  result: any,
  student: any,
  tenant: any,
  isTahfeezOrIslamic: boolean = false,
  classPositionString: string = '',
  classRank: number = 0,
  classCount: number = 0
) => {
  const colors = getThemeColors(tenant);
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;
  const headerColor = colors.headerColor;
  
  // Generate verification QR code
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

  const logo = tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName = tenant.name || 'AL-QALAM ACADEMY';
  const subHeader = tenant.subHeader || 'MOTTO: SUCCESS THROUGH HARDWORK';
  const address = tenant.contact?.address || 'No. 2, Al-Qalam Street by Garba Rabah Road Makarfi Road Rigasa, Kaduna.';
  const phoneNumbers = tenant.contact?.phoneNumbers || tenant.contact?.phone || '08035120756, 08184610450, 08148070775';
  const email = tenant.contact?.email || 'aakaduna@gmail.com';

  const isAlQalam = schoolName.toLowerCase().includes('qalam') || tenant.slug === 'al-qalam-academy' || tenant.slug === 'alqalam';
  const displaySchoolName = isAlQalam 
    ? 'AL-QALAM ACADEMY KADUNA' 
    : schoolName.toUpperCase() + ' KADUNA';
  const displayAddress = isAlQalam 
    ? 'No. 2, Al-Qalam Street by Garba Rabah Road Makarfi Road, Rigasa, Kaduna.' 
    : address;
  const displayEmail = isAlQalam ? 'aakaduna@gmail.com' : email;
  const displayPhone = isAlQalam ? '08035120756, 08184610450, 08148070775' : phoneNumbers;

  const allSubjects = result.subjects || [];
  
  // Grouping subjects
  const grouped: Record<string, any[]> = {
    'NUMERACY': [],
    'LITERACY': [],
    'CREATIVE ART': [],
    'SENSORIAL EDUCATION': [],
    'RHYMES': [],
    'SOCIAL & EMOTIONAL DEVELOPMENT': [],
    'HANDWRITING': []
  };

  allSubjects.forEach((s: any) => {
    const category = getCategoryOfSubject(s.subjectName);
    if (grouped[category]) {
      grouped[category].push(s);
    } else {
      grouped['LITERACY'].push(s);
    }
  });

  // Target rows per table (Numeracy: 6, Literacy: 6, Creative Art: 7, Sensorial: 5, Rhymes: 6, Social: 6, Handwriting: 6)
  const numPadded = padRows(grouped['NUMERACY'], 6);
  const litPadded = padRows(grouped['LITERACY'], 6);
  const artPadded = padRows(grouped['CREATIVE ART'], 7);
  const senPadded = padRows(grouped['SENSORIAL EDUCATION'], 5);
  const rhyPadded = padRows(grouped['RHYMES'], 6);
  const socPadded = padRows(grouped['SOCIAL & EMOTIONAL DEVELOPMENT'], 6);
  const hanPadded = padRows(grouped['HANDWRITING'], 6);

  const timesOpened = Number(result.attendanceSummary?.timesOpened) || 0;
  const timesPresent = Number(result.attendanceSummary?.timesPresent) || 0;
  const timesAbsent = Number(result.attendanceSummary?.timesAbsent) || 0;
  const attendanceRate = timesOpened ? ((timesPresent / timesOpened) * 100).toFixed(1) : '0.0';

  const age = calculateAge(student.dob || result.studentId?.dob);
  const formattedDob = formatDate(student.dob || result.studentId?.dob);

  const renderChecklistTable = (title: string, index: number, subjects: any[]) => {
    return `
      <div style="border: 1px solid #000000; margin-bottom: 8px; border-radius: 4px; overflow: hidden; background: #ffffff;">
        <table style="width: 100%; border-collapse: collapse; font-size: 7.2px;">
          <thead>
            <tr style="background: ${primaryColor}; color: #ffffff;">
              <th style="padding: 3px 5px; text-align: left; font-weight: bold; text-transform: uppercase; font-size: 8px; border-bottom: 1px solid #000000;">
                ${index}. ${title}
              </th>
              <th style="width: 18px; text-align: center; font-weight: bold; border-left: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 8px;">E</th>
              <th style="width: 18px; text-align: center; font-weight: bold; border-left: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 8px;">S</th>
              <th style="width: 18px; text-align: center; font-weight: bold; border-left: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 8px;">N</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.map(s => {
              const checked = getRatingChecked(s);
              return `
                <tr style="border-bottom: 1px solid #e2e8f0; height: 16px;">
                  <td style="padding: 2px 5px; color: #1a202c; font-weight: 500;">
                    ${escapeHtml(s.subjectName)}
                  </td>
                  <td style="width: 18px; text-align: center; border-left: 1px solid #000000; font-weight: bold; color: ${primaryColor}; font-size: 8.5px;">
                    ${checked === 'E' ? '✓' : ''}
                  </td>
                  <td style="width: 18px; text-align: center; border-left: 1px solid #000000; font-weight: bold; color: ${primaryColor}; font-size: 8.5px;">
                    ${checked === 'S' ? '✓' : ''}
                  </td>
                  <td style="width: 18px; text-align: center; border-left: 1px solid #000000; font-weight: bold; color: ${primaryColor}; font-size: 8.5px;">
                    ${checked === 'N' ? '✓' : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Pupil Report Card - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        @page {
          size: A4 portrait;
          margin: 5mm 6mm;
        }
        body {
          font-family: 'Poppins', sans-serif;
          color: #1a202c;
          background: #ffffff;
          font-size: 8px;
          line-height: 1.2;
          -webkit-print-color-adjust: exact;
        }
        .outer-border {
          border: 3.5px double ${primaryColor};
          padding: 8px;
          width: 100%;
          height: calc(297mm - 10mm);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="outer-border">
        <div>
          <!-- Header -->
          <table style="width: 100%; border-collapse: collapse; padding-bottom: 8px; margin-bottom: 8px;">
            <tr>
              <td style="width: 95px; vertical-align: middle;">
                <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" style="max-width: 90px; max-height: 90px; object-fit: contain;" alt="Logo" />
              </td>
              <td style="text-align: center; vertical-align: middle; padding: 0 10px;">
                <h1 style="font-size: 26px; font-weight: 800; color: ${headerColor}; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; font-family: 'Times New Roman', Times, serif;">
                  ${escapeHtml(schoolName)}
                </h1>
                <p style="font-size: 11px; color: ${headerColor}; margin: 2px 0 0 0; font-weight: 700;">
                  ${escapeHtml(displayAddress)}
                </p>
                ${displayPhone ? `<p style="font-size: 10.5px; color: ${headerColor}; margin: 2px 0 0 0; font-weight: 700;"><b>Tel:</b> ${escapeHtml(displayPhone)}</p>` : ''}
                ${displayEmail ? `<p style="font-size: 10.5px; color: ${headerColor}; margin: 2px 0 0 0; font-weight: 700;"><b>Email:</b> ${escapeHtml(displayEmail)}</p>` : ''}
                <div style="margin-top: 8px; margin-bottom: 6px; font-size: 11px; font-weight: 800; padding: 4px 14px; letter-spacing: 0.5px; text-transform: uppercase; background: ${primaryColor}; color: #ffffff; display: inline-block; border-radius: 3px;">
                  ${escapeHtml(result.term.toLowerCase().includes('term') ? result.term : `${result.term} Term`)} Pupil's Performance Report
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

          <!-- Personal Data, Class Data & Attendance -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <!-- Left: Personal Data -->
            <div style="border: 1px solid #000000; border-radius: 4px; overflow: hidden; background: #ffffff;">
              <div style="background: ${headerColor}; color: #ffffff; text-align: center; font-weight: bold; font-size: 8px; padding: 3px; text-transform: uppercase;">
                Personal Data
              </div>
              <div style="padding: 4px; font-size: 7.5px;">
                <div style="font-size: 9px; font-weight: 800; color: ${headerColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase;">
                  ${escapeHtml(student.name)}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
                  <tr style="height: 14px;"><td style="font-weight: bold; width: 40%;">GENDER:</td><td>${escapeHtml(student.gender || '—')}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold;">ADM/SN NO:</td><td><code>${escapeHtml(student.admissionNumber)}</code></td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold;">D.O.B:</td><td>${escapeHtml(formattedDob)}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold;">AGE:</td><td>${escapeHtml(age)}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold;">WEIGHT:</td><td>${escapeHtml(result.weight || '—')} kg</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold;">HEIGHT:</td><td>${escapeHtml(result.height || '—')} cm</td></tr>
                </table>
              </div>
            </div>

            <!-- Right: Class Data & Attendance stacked -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="border: 1px solid #000000; border-radius: 4px; overflow: hidden; background: #ffffff;">
                <div style="background: ${headerColor}; color: #ffffff; text-align: center; font-weight: bold; font-size: 8px; padding: 3px; text-transform: uppercase;">
                  Class Data
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.5px; padding: 3px;">
                  <tr style="height: 14px;"><td style="font-weight: bold; padding-left: 4px; width: 45%;">CLASS:</td><td>${escapeHtml(student.level || result.level)} ${escapeHtml(student.section || '')}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold; padding-left: 4px;">SESSION:</td><td>${escapeHtml(result.academicYear)}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold; padding-left: 4px;">CLASS SIZE:</td><td>${classCount || '—'}</td></tr>
                </table>
              </div>
              <div style="border: 1px solid #000000; border-radius: 4px; overflow: hidden; background: #ffffff;">
                <div style="background: ${headerColor}; color: #ffffff; text-align: center; font-weight: bold; font-size: 8px; padding: 3px; text-transform: uppercase;">
                  Attendance Summary
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7.5px; padding: 3px;">
                  <tr style="height: 14px;"><td style="font-weight: bold; padding-left: 4px; width: 65%;">Times Opened:</td><td>${timesOpened}</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold; padding-left: 4px;">Times Present:</td><td>${timesPresent} (${attendanceRate}%)</td></tr>
                  <tr style="height: 14px; border-top: 1px solid #e2e8f0;"><td style="font-weight: bold; padding-left: 4px;">Times Absent:</td><td>${timesAbsent}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <!-- Checklist grid in 2 columns -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <!-- Left column -->
            <div>
              ${renderChecklistTable('NUMERACY', 1, numPadded)}
              ${renderChecklistTable('LITERACY', 2, litPadded)}
              ${renderChecklistTable('CREATIVE ART', 3, artPadded)}
              ${renderChecklistTable('SENSORIAL EDUCATION', 4, senPadded)}
            </div>

            <!-- Right column -->
            <div>
              ${renderChecklistTable('RHYMES', 5, rhyPadded)}
              ${renderChecklistTable('SOCIAL & EMOTIONAL DEVELOPMENT', 6, socPadded)}
              ${renderChecklistTable('HANDWRITING', 7, hanPadded)}

              <!-- 8. Grading Key -->
              <div style="border: 1px solid #000000; border-radius: 4px; overflow: hidden; background: #ffffff;">
                <div style="background: ${primaryColor}; color: #ffffff; text-align: center; font-weight: bold; font-size: 8px; padding: 3px; text-transform: uppercase;">
                  8. Grading Key
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 7px; text-align: center;">
                  <tr style="height: 14px; font-weight: bold; background: #f7fafc;">
                    <td style="border-right: 1px solid #cbd5e0; width: 33%;">E</td>
                    <td style="border-right: 1px solid #cbd5e0; width: 33%;">S</td>
                    <td style="width: 34%;">N</td>
                  </tr>
                  <tr style="height: 16px;">
                    <td style="border-right: 1px solid #cbd5e0; border-top: 1px solid #cbd5e0; font-size: 7.5px;">EXCELLENT</td>
                    <td style="border-right: 1px solid #cbd5e0; border-top: 1px solid #cbd5e0; font-size: 7.5px;">SATISFACTORY</td>
                    <td style="border-top: 1px solid #cbd5e0; font-size: 7.5px;">NEEDS IMPROVEMENT</td>
                  </tr>
                  <tr style="height: 12px; background: #fff5f5;">
                    <td colspan="3" style="border-top: 1px solid #cbd5e0; color: #e53e3e; font-size: 6.8px; font-weight: 800; text-transform: uppercase;">
                      OBJECTIVES ARE RATED BASED ON THE GRADES ABOVE
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Remarks & Resumption Footer -->
        <div>
          <!-- Remarks -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 8px; margin-bottom: 6px;">
            <tr style="border-bottom: 1px solid #000000;">
              <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafafa; border-right: 1px solid #cbd5e1; width: 18%; text-transform: uppercase;">Class Teacher's Remark</td>
              <td style="padding: 4px 6px; font-style: italic;">"${escapeHtml(result.teacherRecommendations || 'Steady progress. Active participant.')}"</td>
              <td style="padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #cbd5e1; width: 25%; vertical-align: middle;">
                <div style="font-size: 6px; color: #718096; text-transform: uppercase;">Sign:</div>
                <div style="font-size: 8px; color: ${primaryColor}; font-weight: bold; margin-top: 1px;">${escapeHtml(result.teacherName)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; background: #fafafa; border-right: 1px solid #cbd5e1; text-transform: uppercase;">Head Teacher's Remark</td>
              <td style="padding: 4px 6px; font-style: italic;">"${escapeHtml(result.headTeacherComments || 'An encouraging result. Keep it up.')}"</td>
              <td style="padding: 4px 6px; font-weight: bold; text-align: right; border-left: 1px solid #cbd5e1; vertical-align: middle;">
                ${tenant.branding?.principalSignature ? `
                  <img src="${tenant.branding.principalSignature}" style="max-height: 20px; object-fit: contain; display: block; margin-left: auto;" alt="Signature" />
                ` : `
                  <div style="font-family: 'Times New Roman', 'Times', serif; font-size: 9px; font-style: italic; color: ${primaryColor}; font-weight: bold;">Head Teacher</div>
                `}
                <div style="font-size: 6px; color: #718096; text-transform: uppercase; margin-top: 1px;">Sign:</div>
              </td>
            </tr>
          </table>

          <!-- Next Term Begins & Resumption -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 8px; background: #fafafa; margin-bottom: 6px;">
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; color: ${primaryColor}; width: 50%; vertical-align: middle;">
                NEXT TERM BEGINS: <span style="color: #2d3748; margin-left: 6px; font-weight: normal; border-bottom: 1px solid #000; padding-bottom: 1px;">${escapeHtml(result.nextTermBegins || '—')}</span>
              </td>
              <td style="padding: 4px 6px; text-align: right; font-weight: bold; color: ${primaryColor}; width: 50%; vertical-align: middle;">
                DATE: <span style="color: #2d3748; margin-left: 6px; font-weight: normal; border-bottom: 1px solid #000; padding-bottom: 1px;">${escapeHtml(result.dateIssued || new Date().toLocaleDateString('en-GB'))}</span>
              </td>
            </tr>
          </table>

          <!-- System Attribution & QR -->
          <table style="width: 100%; border-collapse: collapse; font-size: 7px; color: #718096; border-top: 1px solid #cbd5e0; padding-top: 4px;">
            <tr>
              <td style="vertical-align: middle;">POWERED BY SMART SCHOOL SOFTWARE V2.0</td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                  ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width: 32px; height: 32px;" alt="QR Code" />` : ''}
                  <span style="font-size: 5.5px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase;">Scan to Verify Result</span>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
};
