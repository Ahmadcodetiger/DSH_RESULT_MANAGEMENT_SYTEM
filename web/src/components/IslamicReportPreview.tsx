import React from 'react';

interface IslamicReportPreviewProps {
  result: any;
  student: any;
  schoolSettings: any;
  tenant: any;
}

export const IslamicReportPreview: React.FC<IslamicReportPreviewProps> = ({
  result,
  student,
  schoolSettings,
  tenant
}) => {
  const maroon = '#800020';
  const royalBlue = '#0a235c';
  const borderColor = '#0a235c';
  const textColor = '#1c1917';
  const bgSlateAsh = '#f1f5f9';

  const translateTermToArabic = (termStr: string): string => {
    const t = termStr.toLowerCase();
    if (t.includes('first')) return 'الفترة الأولى';
    if (t.includes('second')) return 'الفترة الثانية';
    if (t.includes('third')) return 'الفترة الثالثة';
    return termStr;
  };

  const getSubjectArabicName = (s: any): string => {
    if (s.subjectNameArabic) return s.subjectNameArabic;
    const arabicSubjectNames: Record<string, string> = {
      'quran': 'القرآن الكريم', 'tajweed': 'التجويد / إملاء',
      'grammar': 'الحروف / النحو', 'adhkar': 'الأذكار',
      'arabic': 'العربية', 'writing': 'الكتابة',
      'hadith': 'الحديث', 'sarf': 'الصرف / العدد',
      'tawhid': 'التوحيد', 'sirah': 'السيرة',
      'fiqh': 'الفقه والسلوك', 'quranic_sciences': 'علوم القرآن',
      'composition': 'الإنشاء'
    };
    const nameLower = (s.subjectName || '').toLowerCase();
    for (const [key, nameAr] of Object.entries(arabicSubjectNames)) {
      if (nameLower.includes(key)) return nameAr;
    }
    return s.subjectName || '';
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

  const termVal = result.term || '';
  const sessionVal = result.academicYear || '';
  const timesOpenedVal = Number(result.attendanceSummary?.timesOpened) || 0;
  const timesPresentVal = Number(result.attendanceSummary?.timesPresent) || 0;

  const rawSubjects = result.subjects || [];
  const filteredSubjects = rawSubjects.filter((s: any) => s.section === 'tahfeezh' || s.section === 'islamic');
  const finalSubjects = filteredSubjects.length > 0 ? filteredSubjects : rawSubjects;
  
  const gradedSubjects = finalSubjects.filter((s: any) => s.isGraded);
  const totalObtained = gradedSubjects.reduce((acc: number, curr: any) => acc + (Number(curr.score100) || 0), 0);
  const totalObtainable = gradedSubjects.length * 100;
  const finalPercentage = totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0;

  const tahfeezSubjects = finalSubjects.filter((s: any) => {
    const name = (s.subjectName || '').toLowerCase();
    return s.section === 'tahfeezh' || name.includes('hifz') || name.includes('quran') || name.includes('tajweed') || name.includes('حفظ') || name.includes('قرآن');
  });
  const islamicSubjects = finalSubjects.filter((s: any) => !tahfeezSubjects.includes(s));

  const affData = result.affectiveDomain || {};
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

  const elementsOfEvaluation = [
    { labelEn: 'Correctness of recitation & Tajweed Practicing', labelAr: 'دقة التلاوة وتطبيق التجويد', val: affData.attentiveness || 5 },
    { labelEn: 'Excellent Sound and Performance', labelAr: 'جودة الصوت والأداء المتميز', val: affData.neatness || 5 },
    { labelEn: 'Emotional Stability & Honesty', labelAr: 'الاستقرار العاطفي والصدق والأمانة', val: affData.selfControl || 5 },
    { labelEn: 'Perseverance and Relationship with Students', labelAr: 'المثابرة والعلاقة مع الطلاب', val: affData.relationship || 5 },
    { labelEn: 'Language Skills (Reading, Writing, Listening and Oral)', labelAr: 'المهارات اللغوية (القراءة والكتابة والاستماع والتعبير الشفهي)', val: affData.neatness || 5 },
    { labelEn: 'Group & School Activities', labelAr: 'الأنشطة الأسرية والمدرسية', val: affData.responsibility || 5 }
  ];

  const renderSubjectRow = (s: any, idx: number) => {
    const hasSplitCa = (Number(s.score20_1) || 0) > 0 || (Number(s.score20_2) || 0) > 0;
    const ca1   = s.isGraded ? (hasSplitCa ? (s.score20_1 ?? 0) : (s.score60 ?? 0)) : '—';
    const ca2   = s.isGraded ? (hasSplitCa ? (s.score20_2 ?? 0) : '—') : '—';
    const exam  = s.isGraded ? (s.score40 ?? '—') : '—';
    const total = s.isGraded ? s.score100 : '—';
    const grade = s.isGraded ? mapGradeToStandard(s.grade) : '—';
    return (
      <tr key={idx} style={{ borderBottom: `1.5px solid ${borderColor}` }}>
        <td style={{ padding: '4px 6px', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', textAlign: 'right', fontSize: '10.5px' }}>{getSubjectArabicName(s)}</td>
        <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '10px', width: '13%' }}>{ca1}</td>
        <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '10px', width: '13%' }}>{ca2}</td>
        <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '10px', width: '13%' }}>{exam}</td>
        <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', fontSize: '10.5px', backgroundColor: '#f1f5f9', color: maroon, width: '13%' }}>{total}</td>
        <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', fontSize: '10.5px', width: '13%' }}>{grade}</td>
      </tr>
    );
  };

  return (
    <div 
      className="report-card-print-target islamic-bilingual-reportsheet"
      style={{
        backgroundColor: '#ffffff',
        color: textColor,
        padding: '10px',
        border: `3.5px double ${borderColor}`,
        borderRadius: '0',
        width: '100%',
        maxWidth: '820px',
        minHeight: '820px',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontFamily: "'Noto Naskh Arabic', 'Cairo', 'Tajawal', 'Amiri', sans-serif",
        fontSize: '9px',
        lineHeight: 1.3,
        direction: 'rtl',
        textAlign: 'right',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '6.5px'
      }}
    >
      {/* Top/Middle Group */}
      <div>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ marginBottom: '3.5px' }}>
            <img 
              src={schoolSettings?.islamicLogo || (tenant as any)?.branding?.islamicLogo || schoolSettings?.logo || (tenant as any)?.branding?.logo || '/logo.png'} 
              style={{ width: '75px', height: '75px', objectFit: 'contain' }} 
              alt="Logo" 
            />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: maroon, lineHeight: 1.05, marginBottom: '2px' }}>
            {schoolSettings?.schoolNameArabic || (tenant as any)?.nameArabic || 'أكاديمية القلم كدونا'}
          </div>
          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '15px', fontWeight: 700, color: maroon, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
            {schoolSettings?.schoolName || (tenant as any)?.name || 'AL-QALAM ACADEMY'}
          </div>
          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11px', color: royalBlue, fontWeight: 'bold', lineHeight: 1.25, direction: 'ltr' }}>
            <span style={{ color: royalBlue }}>{(schoolSettings?.address || (tenant as any)?.contact?.address || '').trim().replace(/^\s*[•\.\-]\s*/, '').replace(/\s*\.\s*$/, '')}</span>
            <br />
            <span style={{ color: royalBlue }}>Tel:</span> <span style={{ color: maroon }}>{schoolSettings?.phoneNumbers || schoolSettings?.phone || (tenant as any)?.contact?.phoneNumbers || (tenant as any)?.contact?.phone || ''}</span> <span style={{ color: royalBlue }}>|</span> <span style={{ color: royalBlue }}>Email:</span> <span style={{ color: maroon }}>{schoolSettings?.email || (tenant as any)?.contact?.email || ''}</span>
          </div>
        </div>

        {/* Student Info Box Grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, marginBottom: '6px', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px', width: '33.33%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>المستوى:</span>
                  <span style={{ fontWeight: 'bold' }}>{student.level || result.level}</span>
                </div>
              </td>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px', width: '33.33%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>اسم الطالب/ة:</span>
                  <span style={{ fontWeight: 'bold' }}>{student.nameArabic || student.name}</span>
                </div>
              </td>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px', width: '33.33%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>رقم الطالب:</span>
                  <span style={{ fontWeight: 'bold' }}>{student.admissionNumber}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>القسم:</span>
                  <span style={{ fontWeight: 'bold' }}>{student.section || result.section}</span>
                </div>
              </td>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>العام الدراسي:</span>
                  <span style={{ fontWeight: 'bold' }}>{sessionVal}</span>
                </div>
              </td>
              <td style={{ border: `1.5px solid ${borderColor}`, padding: '5px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', color: textColor }}>التقدير العام:</span>
                  <span style={{ fontWeight: 'bold' }}>{result.generalGrade || '—'}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Banner Subtitle */}
        <div style={{ backgroundColor: royalBlue, color: 'white', height: '24px', display: 'flex', justifycontent: 'center', alignItems: 'center', fontWeight: 'bold', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px' }}>كشف درجات الامتحان والتقييم - {translateTermToArabic(termVal)}</span>
        </div>

        {/* Tahfeezh Table */}
        {tahfeezSubjects.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', backgroundColor: royalBlue, border: `1.5px solid ${borderColor}`, padding: '2px 5px', fontSize: '9px', marginBottom: '2px', textAlign: 'right' }}>
              قسم التحفيظ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, fontSize: '9px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: royalBlue, height: '18px', textAlign: 'center', fontWeight: 'bold' }}>
                  <th style={{ textAlign: 'right', paddingRight: '6px', border: `1.5px solid ${borderColor}` }}>المواد</th>
                  <th style={{ width: '17%', border: `1.5px solid ${borderColor}` }}>الاختبارات 1</th>
                  <th style={{ width: '17%', border: `1.5px solid ${borderColor}` }}>الاختبارات 2</th>
                  <th style={{ width: '16%', border: `1.5px solid ${borderColor}` }}>الامتحانات</th>
                  <th style={{ width: '19%', border: `1.5px solid ${borderColor}` }}>المجموع</th>
                  <th style={{ width: '15%', border: `1.5px solid ${borderColor}` }}>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {tahfeezSubjects.map((s: any, idx: number) => renderSubjectRow(s, idx))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hifz Details */}
        {tahfeezSubjects.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', backgroundColor: royalBlue, border: `1.5px solid ${borderColor}`, padding: '2px 5px', fontSize: '9px', marginBottom: '2px', textAlign: 'right' }}>
              بيانات التحفيظ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, fontSize: '9px', textAlign: 'right' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, width: '35%', color: royalBlue, border: `1px solid ${borderColor}` }}>إجمالي أيام الحفظ</td>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', width: '15%', border: `1px solid ${borderColor}` }}>{result.tahfeezhDetails?.absenceOfHifz || 0}</td>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, width: '25%', color: royalBlue, border: `1px solid ${borderColor}` }}>الغياب والطلب</td>
                  <td style={{ padding: '4px 6px', fontSize: '8px', textAlign: 'center', direction: 'ltr', width: '25%', border: `1px solid ${borderColor}` }}>
                    Absent: {result.tahfeezhDetails?.daysAbsent ?? (timesOpenedVal - timesPresentVal)} &nbsp;|&nbsp; Present: {result.tahfeezhDetails?.daysPresent ?? timesPresentVal}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, color: royalBlue, border: `1px solid ${borderColor}` }}>من سورة إلى سورة</td>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', direction: 'rtl', border: `1px solid ${borderColor}` }}>
                    من {result.tahfeezhDetails?.fromSurah || '—'} إلى {result.tahfeezhDetails?.toSurah || '—'}
                  </td>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, color: royalBlue, border: `1px solid ${borderColor}` }}>أوجه الحفظ</td>
                  <td style={{ padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', border: `1px solid ${borderColor}` }}>{result.tahfeezhDetails?.memorizedPages || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Islamic Studies Table */}
        {islamicSubjects.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: '#ffffff', backgroundColor: royalBlue, border: `1.5px solid ${borderColor}`, padding: '2px 5px', fontSize: '9px', marginBottom: '2px' }}>
              الدراسات الإسلامية
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, fontSize: '9px', marginBottom: '4px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: royalBlue, height: '18px', textAlign: 'center', fontWeight: 'bold' }}>
                  <th style={{ textAlign: 'right', paddingRight: '6px', border: `1.5px solid ${borderColor}` }}>المواد</th>
                  <th style={{ width: '13%', border: `1.5px solid ${borderColor}` }}>الاختبارات 1</th>
                  <th style={{ width: '13%', border: `1.5px solid ${borderColor}` }}>الاختبارات 2</th>
                  <th style={{ width: '13%', border: `1.5px solid ${borderColor}` }}>الامتحانات</th>
                  <th style={{ width: '13%', border: `1.5px solid ${borderColor}` }}>المجموع</th>
                  <th style={{ width: '13%', border: `1.5px solid ${borderColor}` }}>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {islamicSubjects.map((s: any, idx: number) => renderSubjectRow(s, idx))}
              </tbody>
            </table>
          </div>
        )}

        {/* Averages Row */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, fontSize: '9px', marginBottom: '4px', textAlign: 'center' }}>
          <tbody>
            <tr style={{ backgroundColor: bgSlateAsh, height: '13px', fontWeight: 'bold', color: royalBlue }}>
              <td style={{ width: '50%', border: `1.5px solid ${borderColor}`, fontSize: '8.5px' }}>المعدل النهائي</td>
              <td style={{ width: '50%', border: `1.5px solid ${borderColor}`, fontSize: '8.5px' }}>الدرجة الإجمالية</td>
            </tr>
            <tr style={{ height: '18px', fontWeight: 'bold' }}>
              <td style={{ border: `1.5px solid ${borderColor}`, fontSize: '11px', color: maroon }}>
                {result.finalAverage || Math.round(finalPercentage)}%
              </td>
              <td style={{ border: `1.5px solid ${borderColor}`, fontSize: '11px', color: maroon }}>
                {totalObtained}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Behavioral & Criteria Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px', marginTop: '4px' }}>
          {/* Elements of Evaluation */}
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, fontSize: '7.8px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: royalBlue, height: '15px', fontWeight: 'bold', textAlign: 'center' }}>
                  <th style={{ border: `1.5px solid ${borderColor}`, textAlign: 'left', paddingLeft: '6px', width: '65%' }}>Elements of Evaluation / عناصر التقويم</th>
                  <th style={{ border: `1.5px solid ${borderColor}`, width: '35%' }}>Rating / التقييم</th>
                </tr>
              </thead>
              <tbody>
                {elementsOfEvaluation.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: `1.5px solid ${borderColor}` }}>
                    <td style={{ padding: '2.5px 4px', border: `1.5px solid ${borderColor}`, fontSize: '7.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', direction: 'ltr' }}>
                        <span style={{ fontFamily: "'Times New Roman', Times, serif", textAlign: 'left' }}>{item.labelEn}</span>
                        <span style={{ fontWeight: 'bold', color: royalBlue, fontSize: '8px', textAlign: 'right', direction: 'rtl' }}>{item.labelAr}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', fontSize: '8px', color: maroon }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', direction: 'ltr' }}>
                        <span style={{ fontFamily: "'Times New Roman', Times, serif", textAlign: 'left' }}>{getRatingLabel(item.val)}</span>
                        <span style={{ textAlign: 'right', direction: 'rtl' }}>{getRatingLabelAr(item.val)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Criteria Tables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, textAlign: 'center', fontSize: '6.5px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: royalBlue, height: '13px', fontWeight: 'bold' }}>
                  <td style={{ border: `1.5px solid ${borderColor}` }}>Evaluation Criteria</td>
                  <td style={{ border: `1.5px solid ${borderColor}` }}>معايير التقييم</td>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>Excellent (A) 100-80</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>ممتاز (أ) ١٠٠-٨٠</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>V. Good (B) 79-70</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>جيد جداً (ب) ٧٩-٧٠</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>Good (C) 69-60</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>جيد (ج) ٦٩-٦٠</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>Pass (D) 59-50</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>مقبول (د) ٥٩-٥٠</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>Fail (F) 49-0</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>ضعيف (هـ) ٤٩-٠</td></tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, textAlign: 'center', fontSize: '6.5px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: royalBlue, height: '13px', fontWeight: 'bold' }}>
                  <td style={{ border: `1.5px solid ${borderColor}` }}>Level/Rating</td>
                  <td style={{ border: `1.5px solid ${borderColor}` }}>مستوى التقييم</td>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>5-Excellent</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>٥ - ممتاز</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>4-V. Good</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>٤ - جيد جداً</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>3-Good</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>٣ - جيد</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>2-Fair</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>٢ - مقبول</td></tr>
                <tr style={{ height: '10.5px' }}><td style={{ border: `1.5px solid ${borderColor}` }}>1-Poor</td><td style={{ border: `1.5px solid ${borderColor}`, fontWeight: 'bold', color: maroon }}>١ - ضعيف</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ border: `1.5px solid ${borderColor}`, marginTop: '3px', marginBottom: '3px', fontSize: '8.5px', direction: 'rtl', textAlign: 'right' }}>
          <div style={{ backgroundColor: royalBlue, fontWeight: 'bold', color: '#ffffff', padding: '3px 5px', borderBottom: `1.5px solid ${borderColor}` }}>
            توصيات المشرف التربوي
          </div>
          <div style={{ padding: '5px', minHeight: '20px', fontStyle: 'italic', fontWeight: 'bold' }}>
            {result.teacherRecommendations || result.headTeacherComments || '—'}
          </div>
        </div>
      </div>

      {/* Footer Details & Resumption (Pushed to bottom) */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1.5px solid ${borderColor}`, borderBottom: `1.5px solid ${borderColor}`, padding: '4px 0', fontSize: '8.5px', direction: 'rtl', textAlign: 'right' }}>
          <div style={{ width: '32%' }}>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '75%', minHeight: '10px', verticalAlign: 'bottom', textAlign: 'center' }}>
              {(tenant as any)?.branding?.principalSignature ? (
                <img src={(tenant as any).branding.principalSignature} style={{ maxHeight: '15px', objectFit: 'contain' }} alt="Signature" />
              ) : ''}
            </span>
          </div>
          <div style={{ width: '38%', textAlign: 'center' }}>
            <span style={{ fontWeight: 'bold', color: royalBlue }}>رسوم الفترة القادمة:</span>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '45%', minHeight: '10px', verticalAlign: 'bottom' }}>
              {result.nextTermSchoolFees || '—'}
            </span>
          </div>
          <div style={{ width: '30%', textAlign: 'left' }}>
            <span style={{ fontWeight: 'bold', color: royalBlue }}>بداية الفترة القادمة:</span>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '40%', minHeight: '10px', verticalAlign: 'bottom' }}>
              {result.nextTermBegins || '—'}
            </span>
          </div>
        </div>

        {/* Footer Info & QR Code */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <div style={{ fontSize: '7.5px', color: '#64748b' }}>
            تم الإنشاء بواسطة نظام إدارة المدرسة الذكي • {new Date().toLocaleDateString('ar-SA')}
            <br />
            <strong>Report ID:</strong> <code>{result._id}</code>
          </div>
          <div>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://${tenant?.slug || 'alqalam'}.smartschool.africa/verify-result/${result._id}`)}`} style={{ width: '36px', height: '36px' }} alt="QR Code" />
          </div>
        </div>
      </div>
    </div>
  );
};
