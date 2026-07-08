import QRCode from 'qrcode';
import { SCHOOL_LOGO_BASE64 } from '../../controllers/logoBase64';

const escapeHtml = (unsafe: any): string => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const translateTermToArabic = (term: string): string => {
  const t = term.toLowerCase();
  if (t.includes('first')) return 'الفترة الأولى';
  if (t.includes('second')) return 'الفترة الثانية';
  if (t.includes('third')) return 'الفترة الثالثة';
  return term;
};

export const renderIslamicReport = async (
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
  const primaryColor = '#800020'; // Maroon
  const secondaryColor = '#6b7280';
  const royalBlue = '#0a235c';
  const borderColor = royalBlue; // Royal Blue borders
  const textColor = '#1c1917';
  const maroon = '#800020';
  const ashColor = '#f1f5f9';
  
  let qrCodeDataUrl = '';
  try {
    const verificationUrl = `https://${tenant?.slug || 'alqalam'}.smartschool.africa/verify-result/${result._id}`;
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: 'H',
      color: { dark: primaryColor, light: '#ffffff' }
    });
  } catch (err) {
    console.error('Failed to generate verification QR code:', err);
  }

  const logo = tenant.branding?.islamicLogo || tenant.branding?.logo || SCHOOL_LOGO_BASE64;
  const schoolName    = tenant.name      || 'AL-QALAM ACADEMY';
  const schoolNameArabic = tenant.nameArabic || 'أكاديمية القلم كدونا';
  const address       = (tenant.contact?.address || '').trim().replace(/^\s*[•\.\-]\s*/, '').replace(/\s*\.\s*$/, '');
  const phoneNumbers  = tenant.contact?.phoneNumbers || tenant.contact?.phone || '';
  const email         = tenant.contact?.email        || '';

  const term    = result.term         || '';
  const session = result.academicYear || '';
  const rawSubjects = result.subjects || [];

  // Filter: only Islamic & Tahfeezh subjects
  const allSubjects = rawSubjects.filter((s: any) => s.section === 'tahfeezh' || s.section === 'islamic');
  const filteredSubjects = allSubjects.length > 0 ? allSubjects : rawSubjects;

  const timesOpened  = Number(result.attendanceSummary?.timesOpened)  || 0;
  const timesPresent = Number(result.attendanceSummary?.timesPresent) || 0;

  const gradedSubjects  = filteredSubjects.filter((s: any) => s.isGraded);
  const totalObtained   = gradedSubjects.reduce((acc: number, curr: any) => acc + (Number(curr.score100) || 0), 0);
  const totalObtainable = gradedSubjects.length * 100;
  const finalPercentage = totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0;

  const aff = result.affectiveDomain || {};
  
  const arabicSubjectNames: Record<string, string> = {
    'quran':           'القرآن الكريم',
    'tajweed':         'التجويد / إملاء',
    'grammar':         'الحروف / النحو',
    'adhkar':          'الأذكار',
    'arabic':          'العربية',
    'writing':         'الكتابة',
    'hadith':          'الحديث',
    'sarf':            'الصرف / العدد',
    'tawhid':          'التوحيد',
    'sirah':           'السيرة',
    'fiqh':            'الفقه والسلوك',
    'quranic_sciences':'علوم القرآن',
    'composition':     'الإنشاء'
  };

  const getSubjectArabicNameOnly = (s: any): string => {
    const englishName = s.subjectName || '';
    let arabicName    = s.subjectNameArabic || '';
    if (!arabicName) {
      const nameLower = englishName.toLowerCase();
      for (const [key, nameAr] of Object.entries(arabicSubjectNames)) {
        if (nameLower.includes(key)) { arabicName = nameAr; break; }
      }
    }
    return arabicName || englishName;
  };

  const mapGradeToStandard = (g: string): string => {
    const clean = String(g || '').toUpperCase().trim();
    if (clean === 'A1' || clean === 'A') return 'A';
    if (clean === 'B2' || clean === 'B3' || clean === 'B') return 'B';
    if (clean === 'C4' || clean === 'C5' || clean === 'C6' || clean === 'C') return 'C';
    if (clean === 'D7' || clean === 'E8' || clean === 'D' || clean === 'E') return 'D';
    if (clean === 'F9' || clean === 'F') return 'F';
    return clean || '—';
  };

  const getRatingLabel = (val: number): string => {
    const v = Number(val) || 5;
    if (v === 5) return '5-Excellent';
    if (v === 4) return '4-V. Good';
    if (v === 3) return '3-Good';
    if (v === 2) return '2-Fair';
    return '1-Poor';
  };

  const getRatingLabelAr = (val: number): string => {
    const v = Number(val) || 5;
    if (v === 5) return 'ممتاز';
    if (v === 4) return 'جيد جداً';
    if (v === 3) return 'جيد';
    if (v === 2) return 'مقبول';
    return 'ضعيف';
  };

  const tahfeezSubjects = filteredSubjects.filter((s: any) => {
    const name = (s.subjectName || '').toLowerCase();
    return s.section === 'tahfeezh' || name.includes('hifz') || name.includes('quran') || name.includes('tajweed') || name.includes('حفظ') || name.includes('قرآن');
  });

  const islamicSubjects = filteredSubjects.filter((s: any) => !tahfeezSubjects.includes(s));

  const renderSubjectRows = (subjects: any[]): string => {
    if (subjects.length === 0) {
      return `
        <tr style="height: 22px;">
          <td colspan="6" style="text-align: center; border: 1.5px solid ${borderColor}; color: #64748b; font-style: italic; font-size: 9.5px; padding: 5px;">
            لا توجد مواد مسجلة
          </td>
        </tr>
      `;
    }
    return subjects.map((s: any) => {
      const hasSplitCa = (Number(s.score20_1) || 0) > 0 || (Number(s.score20_2) || 0) > 0;
      const ca1   = s.isGraded ? (hasSplitCa ? (s.score20_1 ?? 0) : (s.score60 ?? 0)) : '—';
      const ca2   = s.isGraded ? (hasSplitCa ? (s.score20_2 ?? 0) : '—') : '—';
      const exam  = s.isGraded ? (s.score40 ?? '—') : '—';
      const total = s.isGraded ? s.score100 : '—';
      const grade = s.isGraded ? mapGradeToStandard(s.grade) : '—';
      const subjectArabic = s.subjectNameArabic || getSubjectArabicNameOnly(s);

      return `
        <tr style="border-bottom: 1.5px solid ${borderColor};">
          <td style="padding: 4px 6px; border: 1.5px solid ${borderColor}; font-weight: bold; text-align: right; font-size: 10.5px; font-family: 'Noto Naskh Arabic', 'Cairo', sans-serif;">
            ${escapeHtml(subjectArabic)}
          </td>
          <td style="text-align: center; border: 1.5px solid ${borderColor}; font-size: 10px; width: 13%;">${ca1}</td>
          <td style="text-align: center; border: 1.5px solid ${borderColor}; font-size: 10px; width: 13%;">${ca2}</td>
          <td style="text-align: center; border: 1.5px solid ${borderColor}; font-size: 10px; width: 13%;">${exam}</td>
          <td style="text-align: center; border: 1.5px solid ${borderColor}; font-weight: bold; font-size: 10.5px; background-color: ${ashColor}; color: ${primaryColor}; width: 13%;">${total}</td>
          <td style="text-align: center; border: 1.5px solid ${borderColor}; font-weight: bold; font-size: 10.5px; width: 13%;">${grade}</td>
        </tr>
      `;
    }).join('');
  };

  const elementsOfEvaluation = [
    {
      labelEn: 'Correctness of recitation & Tajweed Practicing',
      labelAr: 'دقة التلاوة وتطبيق التجويد',
      val: aff.attentiveness || 5
    },
    {
      labelEn: 'Excellent Sound and Performance',
      labelAr: 'جودة الصوت والأداء المتميز',
      val: aff.neatness || 5
    },
    {
      labelEn: 'Emotional Stability & Honesty',
      labelAr: 'الاستقرار العاطفي والصدق والأمانة',
      val: aff.selfControl || 5
    },
    {
      labelEn: 'Perseverance and Relationship with Students',
      labelAr: 'المثابرة والعلاقة مع الطلاب',
      val: aff.relationship || 5
    },
    {
      labelEn: 'Language Skills (Reading, Writing, Listening and Oral)',
      labelAr: 'المهارات اللغوية (القراءة والكتابة والاستماع والتعبير الشفهي)',
      val: aff.neatness || 5
    },
    {
      labelEn: 'Group & School Activities',
      labelAr: 'الأنشطة الأسرية والمدرسية',
      val: aff.responsibility || 5
    }
  ];

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>Report Card - ${escapeHtml(student.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @page {
          size: A4 portrait;
          margin: 4mm 6mm;
        }

        body {
          font-family: 'Noto Naskh Arabic', 'Cairo', 'Tajawal', 'Amiri', sans-serif;
          color: ${textColor};
          background: #ffffff;
          font-size: 9px;
          line-height: 1.3;
          direction: rtl;
          text-align: right;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .outer-border {
          border: 3.5px double ${borderColor};
          padding: 10px;
          width: 100%;
          height: 281mm;
          max-height: 281mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 6.5px;
        }

        .tnr { font-family: 'Times New Roman', Times, serif; }
        .cairo { font-family: 'Noto Naskh Arabic', 'Cairo', 'Tajawal', sans-serif; }
        tr { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="outer-border">
        <!-- TOP/MIDDLE CONTENT GROUP -->
        <div>
          <div style="text-align: center; margin-bottom: 8px;">
            <div style="margin-bottom: 3.5px;">
              <img src="${logo.startsWith('data:') ? logo : SCHOOL_LOGO_BASE64}" style="width: 75px; height: 75px; object-fit: contain;" alt="Logo" />
            </div>
            <div class="cairo" style="font-size: 24px; font-weight: 800; color: ${maroon}; line-height: 1.05; margin-bottom: 2px;">
              ${escapeHtml(schoolNameArabic)}
            </div>
            <div class="tnr" style="font-size: 15px; font-weight: 700; color: ${maroon}; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">
              ${escapeHtml(schoolName)}
            </div>
            <div class="tnr" style="font-size: 11px; color: ${royalBlue}; font-weight: bold; line-height: 1.25; direction: ltr;">
              <span style="color: ${royalBlue};">${escapeHtml(address.replace(/\.+$/, ''))}</span><br>
              <span style="color: ${royalBlue};">Tel:</span> <span style="color: ${maroon};">${escapeHtml(phoneNumbers)}</span> <span style="color: ${royalBlue};">|</span> <span style="color: ${royalBlue};">Email:</span> <span style="color: ${maroon};">${escapeHtml(email)}</span>
            </div>
          </div>

          <!-- ═══ STUDENT INFO BOX GRID ═══ -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; margin-bottom: 6px; font-size: 11px;">
            <tbody>
              <tr>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px; width: 33.33%;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">المستوى:</span>
                    <span style="font-weight: bold;">${escapeHtml(student.level || result.level)}</span>
                  </div>
                </td>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px; width: 33.33%;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">اسم الطالب/ة:</span>
                    <span style="font-weight: bold; font-family: 'Noto Naskh Arabic', 'Tajawal', 'Cairo', sans-serif;">${escapeHtml(student.nameArabic || student.name)}</span>
                  </div>
                </td>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px; width: 33.33%;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">رقم الطالب:</span>
                    <span style="font-weight: bold;">${escapeHtml(student.admissionNumber)}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">القسم:</span>
                    <span style="font-weight: bold;">${escapeHtml(student.section || result.section)}</span>
                  </div>
                </td>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">العام الدراسي:</span>
                    <span style="font-weight: bold;">${escapeHtml(session)}</span>
                  </div>
                </td>
                <td style="border: 1.5px solid ${borderColor}; padding: 5px 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span class="cairo" style="font-weight: bold; color: ${textColor};">التقدير العام:</span>
                    <span style="font-weight: bold;">${escapeHtml(result.generalGrade || '—')}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- ═══ BANNER SUBTITLE ═══ -->
          <div style="background-color: ${royalBlue}; color: white; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: bold; margin-bottom: 6px;">
            <span class="cairo" style="font-size: 11px;">كشف درجات الامتحان والتقييم - ${escapeHtml(translateTermToArabic(term))}</span>
          </div>

          <!-- ═══ TAHFEEZH SECTION ═══ -->
          ${tahfeezSubjects.length > 0 ? `
          <div style="margin-bottom: 4px;">
            <div class="cairo" style="font-weight: bold; color: white; background-color: ${royalBlue}; border: 1.5px solid ${borderColor}; padding: 2px 5px; font-size: 9px; margin-bottom: 2px; text-align: right;">
              قسم التحفيظ
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; font-size: 9px;">
              <thead>
                <tr style="background-color: ${ashColor}; color: ${royalBlue}; height: 18px; text-align: center; font-weight: bold;">
                  <th style="text-align: right; padding-right: 6px; border: 1.5px solid ${borderColor};">المواد</th>
                  <th style="width: 17%; border: 1.5px solid ${borderColor};">الاختبارات 1</th>
                  <th style="width: 17%; border: 1.5px solid ${borderColor};">الاختبارات 2</th>
                  <th style="width: 16%; border: 1.5px solid ${borderColor};">الامتحانات</th>
                  <th style="width: 19%; border: 1.5px solid ${borderColor};">المجموع</th>
                  <th style="width: 15%; border: 1.5px solid ${borderColor};">التقدير</th>
                </tr>
              </thead>
              <tbody>
                ${renderSubjectRows(tahfeezSubjects)}
              </tbody>
            </table>
          </div>

          <!-- ═══ HIFZ DETAILS ═══ -->
          <div style="margin-bottom: 4px;">
            <div class="cairo" style="font-weight: bold; color: white; background-color: ${royalBlue}; border: 1.5px solid ${borderColor}; padding: 2px 5px; font-size: 9px; margin-bottom: 2px; text-align: right;">
              بيانات التحفيظ
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; font-size: 9px; text-align: right;">
              <tbody>
                <tr>
                  <td style="padding: 4px 6px; font-weight: bold; background-color: ${ashColor}; width: 35%; color: ${royalBlue}; border: 1px solid ${borderColor};">إجمالي أيام الحفظ</td>
                  <td style="padding: 4px 6px; font-weight: bold; text-align: center; width: 15%; border: 1px solid ${borderColor};">${result.tahfeezhDetails?.absenceOfHifz || 0}</td>
                  <td style="padding: 4px 6px; font-weight: bold; background-color: ${ashColor}; width: 25%; color: ${royalBlue}; border: 1px solid ${borderColor};">الغياب والطلب</td>
                  <td style="padding: 4px 6px; font-size: 8px; text-align: center; direction: ltr; width: 25%; border: 1px solid ${borderColor};">
                    Absent: ${result.tahfeezhDetails?.daysAbsent ?? (timesOpened - timesPresent)} &nbsp;|&nbsp; Present: ${result.tahfeezhDetails?.daysPresent ?? timesPresent}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 6px; font-weight: bold; background-color: ${ashColor}; color: ${royalBlue}; border: 1px solid ${borderColor};">من سورة إلى سورة</td>
                  <td style="padding: 4px 6px; font-weight: bold; text-align: center; direction: rtl; border: 1px solid ${borderColor};">
                    من ${escapeHtml(result.tahfeezhDetails?.fromSurah || '—')} إلى ${escapeHtml(result.tahfeezhDetails?.toSurah || '—')}
                  </td>
                  <td style="padding: 4px 6px; font-weight: bold; background-color: ${ashColor}; color: ${royalBlue}; border: 1px solid ${borderColor};">أوجه الحفظ</td>
                  <td style="padding: 4px 6px; font-weight: bold; text-align: center; border: 1px solid ${borderColor};">${result.tahfeezhDetails?.memorizedPages || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- ═══ ISLAMIC STUDIES TABLE ═══ -->
          ${islamicSubjects.length > 0 ? `
          <div style="margin-bottom: 4px;">
            <div class="cairo" style="font-weight: bold; color: white; background-color: ${royalBlue}; border: 1.5px solid ${borderColor}; padding: 2px 5px; font-size: 9px; margin-bottom: 2px;">
              الدراسات الإسلامية
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; font-size: 9px; margin-bottom: 4px;">
              <thead>
                <tr style="background-color: ${ashColor}; color: ${royalBlue}; height: 18px; text-align: center; font-weight: bold;">
                  <th style="text-align: right; padding-right: 6px; border: 1.5px solid ${borderColor};">المواد</th>
                  <th style="width: 13%; border: 1.5px solid ${borderColor};">الاختبارات 1</th>
                  <th style="width: 13%; border: 1.5px solid ${borderColor};">الاختبارات 2</th>
                  <th style="width: 13%; border: 1.5px solid ${borderColor};">الامتحانات</th>
                  <th style="width: 13%; border: 1.5px solid ${borderColor};">المجموع</th>
                  <th style="width: 13%; border: 1.5px solid ${borderColor};">التقدير</th>
                </tr>
              </thead>
              <tbody>
                ${renderSubjectRows(islamicSubjects)}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- ═══ AVERAGES & MARKS ROW ═══ -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; font-size: 9px; margin-bottom: 4px; text-align: center;">
            <tbody>
              <tr style="background-color: ${ashColor}; height: 15px; font-weight: bold; color: ${royalBlue};">
                <td style="width: 50%; border: 1.5px solid ${borderColor}; font-size: 8.5px;">المعدل النهائي</td>
                <td style="width: 50%; border: 1.5px solid ${borderColor}; font-size: 8.5px;">الدرجة الإجمالية</td>
              </tr>
              <tr style="height: 18px; font-weight: bold;">
                <td style="border: 1.5px solid ${borderColor}; font-size: 11px; color: ${primaryColor};">
                  ${result.finalAverage || Math.round(finalPercentage)}%
                </td>
                <td style="border: 1.5px solid ${borderColor}; font-size: 11px; color: ${primaryColor};">
                  ${totalObtained}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- ═══ BEHAVIORAL & EVALUATION CRITERIA ═══ -->
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px; margin-top: 4px;">
            <!-- Left: Elements of Evaluation Table -->
            <div>
              <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; font-size: 8.5px;">
                <thead>
                  <tr style="background-color: ${ashColor}; color: ${royalBlue}; height: 15px; font-weight: bold; text-align: center;">
                    <th style="border: 1.5px solid ${borderColor}; text-align: left; padding-left: 6px; width: 65%;">Elements of Evaluation / عناصر التقويم</th>
                    <th style="border: 1.5px solid ${borderColor}; width: 35%;">Rating / التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  ${elementsOfEvaluation.map(item => `
                    <tr style="border-bottom: 1.5px solid ${borderColor};">
                      <td style="padding: 2.5px 4px; border: 1.5px solid ${borderColor}; font-size: 7.5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; direction: ltr;">
                          <span class="tnr" style="text-align: left;">${item.labelEn}</span>
                          <span class="cairo" style="font-weight: bold; color: ${royalBlue}; font-size: 8px; text-align: right; direction: rtl;">${item.labelAr}</span>
                        </div>
                      </td>
                      <td style="text-align: center; border: 1.5px solid ${borderColor}; font-weight: bold; font-size: 8px; color: ${primaryColor};">
                        <div style="display: flex; justify-content: space-between; padding: 0 4px; direction: ltr;">
                          <span class="tnr" style="text-align: left;">${getRatingLabel(item.val)}</span>
                          <span class="cairo" style="text-align: right; direction: rtl;">${getRatingLabelAr(item.val)}</span>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: Criteria & Level/Rating Tables -->
            <div style="display: flex; flex-direction: column; gap: 3.5px;">
              <!-- Table 1: Evaluation Criteria -->
              <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; text-align: center; font-size: 6.5px;">
                <thead>
                  <tr style="background-color: ${ashColor}; color: ${royalBlue}; height: 13px; font-weight: bold;">
                    <td style="border: 1.5px solid ${borderColor};">Evaluation Criteria</td>
                    <td style="border: 1.5px solid ${borderColor};">معايير التقييم</td>
                  </tr>
                </thead>
                <tbody>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">Excellent (A) 100-80</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">ممتاز (أ) ١٠٠-٨٠</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">V. Good (B) 79-70</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">جيد جداً (ب) ٧٩-٧٠</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">Good (C) 69-60</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">جيد (ج) ٦٩-٦٠</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">Pass (D) 59-50</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">مقبول (د) ٥٩-٥٠</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">Fail (F) 49-0</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">ضعيف (هـ) ٤٩-٠</td></tr>
                </tbody>
              </table>

              <!-- Table 2: Level/Rating -->
              <table style="width: 100%; border-collapse: collapse; border: 1.5px solid ${borderColor}; text-align: center; font-size: 6.5px;">
                <thead>
                  <tr style="background-color: ${ashColor}; color: ${royalBlue}; height: 13px; font-weight: bold;">
                    <td style="border: 1.5px solid ${borderColor};">Level/Rating</td>
                    <td style="border: 1.5px solid ${borderColor};">مستوى التقييم</td>
                  </tr>
                </thead>
                <tbody>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">5-Excellent</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">٥ - ممتاز</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">4-V. Good</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">٤ - جيد جداً</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">3-Good</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">٣ - جيد</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">2-Fair</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">٢ - مقبول</td></tr>
                  <tr style="height: 10.5px;"><td style="border: 1.5px solid ${borderColor};">1-Poor</td><td style="border: 1.5px solid ${borderColor}; font-weight: bold; color: ${primaryColor};">١ - ضعيف</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ═══ SUPERVISOR'S RECOMMENDATIONS ═══ -->
          <div style="border: 1.5px solid ${borderColor}; margin-top: 3px; margin-bottom: 3px; font-size: 8.5px; direction: rtl; text-align: right;">
            <div style="background-color: ${royalBlue}; font-weight: bold; color: white; padding: 3px 5px; border-bottom: 1.5px solid ${borderColor};">
              توصيات المشرف التربوي
            </div>
            <div style="padding: 5px; min-height: 20px; font-style: italic; font-weight: bold; font-family: 'Noto Naskh Arabic', 'Tajawal', 'Cairo', sans-serif;">
              ${escapeHtml(result.teacherRecommendations || result.headTeacherComments || '—')}
            </div>
          </div>
        </div>

        <!-- ═══ BOTTOM SIGNATURE & INFO FOOTER (Pushed to bottom using margin-top: auto) ═══ -->
        <div style="margin-top: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid ${borderColor}; border-bottom: 1.5px solid ${borderColor}; padding: 4px 0; font-size: 8.5px; direction: rtl; text-align: right;">
            <div style="width: 32%;">
              <span style="border-bottom: 1px solid #000; display: inline-block; width: 75%; min-height: 10px; vertical-align: bottom; text-align: center;">
                ${tenant.branding?.principalSignature
                  ? `<img src="${tenant.branding.principalSignature}" style="max-height: 15px; object-fit: contain;" alt="Signature" />`
                  : ''
                }
              </span>
            </div>
            <div style="width: 38%; text-align: center;">
              <span style="font-weight: bold; color: ${royalBlue};">رسوم الفترة القادمة:</span>
              <span style="border-bottom: 1px solid #000; display: inline-block; width: 45%; min-height: 10px; vertical-align: bottom;">
                ${escapeHtml(result.nextTermSchoolFees || '—')}
              </span>
            </div>
            <div style="width: 30%; text-align: left;">
              <span style="font-weight: bold; color: ${royalBlue};">بداية الفترة القادمة:</span>
              <span style="border-bottom: 1px solid #000; display: inline-block; width: 40%; min-height: 10px; vertical-align: bottom;">
                ${escapeHtml(result.nextTermBegins || '—')}
              </span>
            </div>
          </div>

          <!-- Footer ID bar & QR code placement -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
            <div style="font-size: 7.5px; color: #64748b;">
              تم الإنشاء بواسطة نظام إدارة المدرسة الذكي &bull; ${new Date().toLocaleDateString('ar-SA')}
              <br>
              <strong>Report ID:</strong> <code>${result._id}</code>
            </div>
            <div>
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" style="width: 36px; height: 36px;" alt="QR Code" />` : ''}
            </div>
          </div>
        </div>

      </div><!-- outer-border -->
    </body>
    </html>
  `;
};
