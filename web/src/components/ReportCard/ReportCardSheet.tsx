import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { ReportCardHeader } from './ReportCardHeader';
import { StudentInfoSection } from './StudentInfoSection';
import { AcademicPerformanceTable } from './AcademicPerformanceTable';
import { AttendanceSummary } from './AttendanceSummary';
import { DomainRatingTable } from './DomainRatingTable';
import { PerformanceSummaryCard } from './PerformanceSummaryCard';
import { GradeAnalysisCard } from './GradeAnalysisCard';
import { ScaleAndLegend } from './ScaleAndLegend';
import { RemarksSection } from './RemarksSection';
import { ReportCardFooter } from './ReportCardFooter';

interface ReportCardSheetProps {
  result: any;
  student?: any;
  schoolSettings: any;
}

const calculateAge = (dobString: string): string => {
  if (!dobString) return '—';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    const cleanDate = dobString.replace(/^[A-Za-z]+,\s*/, '');
    const parsed = new Date(cleanDate);
    if (isNaN(parsed.getTime())) return dobString;
    return formatAge(parsed);
  }
  return formatAge(dob);
};

const formatAge = (dob: Date): string => {
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  return `${years}yrs ${months}m`;
};

const isNurseryOrHub = (lvl: string = '', sec: string = '') => {
  const l = (lvl || '').toUpperCase();
  const s = (sec || '').toUpperCase();
  return l.includes('NURSERY') || s.includes('NURSERY') || 
         l.includes('PLAY') || s.includes('PLAY') || 
         l.includes('KINDERGARTEN') || s.includes('KINDERGARTEN') ||
         l.includes('LEARNING HUB') || s.includes('LEARNING HUB') ||
         l.includes('HUB') || s.includes('HUB') ||
         l.includes('NUR') || s.includes('NUR');
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
  
  return 'S';
};

const padRows = (subjectsInCategory: any[], count: number) => {
  const padded = [...subjectsInCategory];
  while (padded.length < count) {
    padded.push({ subjectName: '', isGraded: false });
  }
  return padded;
};

export const ReportCardSheet: React.FC<ReportCardSheetProps> = ({
  result,
  student: propStudent,
  schoolSettings,
}) => {
  const { tenant } = useTenant();

  // Resolve student info
  const student = propStudent || 
    (typeof result?.studentId === 'object' && result?.studentId 
      ? result.studentId 
      : { name: 'Unknown Student', admissionNumber: '—', dob: '', gender: '', house: '', club: '' });

  // Determine if this is a conventional class
  const isConventional = schoolSettings?.curriculumType === 'conventional' || (tenant as any)?.curriculumType === 'conventional';

  const sectionStr = (student.section || '').trim().toUpperCase();
  const levelStr = (student.level || '').trim().toUpperCase();
  const isTahfeezOrIslamic = 
    sectionStr.includes('TAHFEEZ') || sectionStr.includes('ISLAMIC') || sectionStr.includes('QURAN') ||
    levelStr.includes('TAHFEEZ') || levelStr.includes('ISLAMIC') || levelStr.includes('QURAN');

  const rawSubjects = result?.subjects || [];
  // For Tahfeez / Islamic sections, only display relevant religious & Arabic subjects.
  const allSubjects = isTahfeezOrIslamic
    ? rawSubjects.filter((s: any) => s.section === 'tahfeezh' || s.section === 'islamic')
    : rawSubjects;

  const academicSubjects = allSubjects.filter((s: any) => s.section === 'academic');
  const islamicSubjects = allSubjects.filter((s: any) => s.section === 'islamic');
  const tahfeezhSubjects = allSubjects.filter((s: any) => s.section === 'tahfeezh');

  const showAcademic = academicSubjects.length > 0;
  const showIslamic = islamicSubjects.length > 0;
  const showTahfeez = tahfeezhSubjects.length > 0;

  // Determine school configuration type
  const isTahfeezSchool = showTahfeez && !showAcademic && !showIslamic;
  const isIslamicSchool = showIslamic && !showTahfeez;
  const isHybridSchool = showAcademic && (showIslamic || showTahfeez);
  const isAcademicSchool = showAcademic && !showIslamic && !showTahfeez;

  // Arabic labels are shown if Islamic studies or Tahfeez is enabled, or this is a Tahfeez/Islamic section student
  const showArabic = isTahfeezOrIslamic || showIslamic || showTahfeez;

  // Check grading system
  const isAlQalam = tenant?.slug === 'alqalam' || 
                    schoolSettings?.schoolName?.toLowerCase().includes('qalam') || 
                    (result?.subjects && result.subjects.some((s: any) => s.grade === 'A1' || s.grade === 'B2'));

  // Affective Domain Traits mapping
  const affectiveTraits = [
    { key: 'attentiveness', label: 'Attentiveness' },
    { key: 'honesty', label: 'Honesty' },
    { key: 'neatness', label: 'Neatness' },
    { key: 'politeness', label: 'Politeness' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'selfControl', label: 'Self Control' },
    { key: 'obedience', label: 'Obedience' },
    { key: 'reliability', label: 'Reliability' },
    { key: 'responsibility', label: 'Leadership / Responsibility' },
    { key: 'relationship', label: 'Relationship With Others' }
  ];

  // Psychomotor Domain Traits mapping
  const psychomotorTraits = [
    { key: 'handwriting', label: 'Handwriting' },
    { key: 'handlingTools', label: 'Handling of Tools' },
    { key: 'sportsGames', label: 'Sports & Games' },
    { key: 'publicSpeaking', label: 'Public Speaking' },
    { key: 'drawingPainting', label: 'Drawing & Painting' },
    // Merged cognitive/psychomotor traits to fully match listed traits
    { key: 'creativity', label: 'Creativity' },
    { key: 'practicalSkills', label: 'Practical Skills' },
    { key: 'musicalSkills', label: 'Musical Skills' },
    { key: 'computerSkills', label: 'Computer Skills' },
    { key: 'speechFluency', label: 'Communication' }
  ];

  // Fetch domain rating data
  const affectiveData = result?.affectiveDomain || {};
  const psychomotorData = {
    ...(result?.psychomotorSkills || {}),
    creativity: result?.cognitiveDomain?.creativity,
    practicalSkills: result?.psychomotorSkills?.handlingTools,
    musicalSkills: result?.psychomotorSkills?.speechFluency ? 3 : undefined, // fallback/dummy if not graded
    computerSkills: result?.cognitiveDomain?.calculationSkills,
    speechFluency: result?.psychomotorSkills?.speechFluency || result?.cognitiveDomain?.verbalSkills
  };

  // Resumption and notes
  const nextTermNotes = result?.nextTermNotes || schoolSettings?.academicCalendarNote || 'Resumption dates and fee invoices are subject to change. Contact admin for verification.';

  const isNursery = isNurseryOrHub(student.level, student.section);

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

  const getOrdinal = (n: any) => {
    if (!n || n === '—') return '—';
    const num = parseInt(n);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const renderChecklistTable = (title: string, index: number, subjects: any[]) => {
    return (
      <div style={{ border: '1px solid #000000', marginBottom: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
              <th style={{ padding: '3px 5px', textAlign: 'left', fontWeight: 'bold', fontSize: '9px', borderBottom: '1px solid #000000' }}>
                {index}. {title}
              </th>
              <th style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', borderLeft: '1px solid #000000', borderBottom: '1px solid #000000', fontSize: '9px' }}>E</th>
              <th style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', borderLeft: '1px solid #000000', borderBottom: '1px solid #000000', fontSize: '9px' }}>S</th>
              <th style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', borderLeft: '1px solid #000000', borderBottom: '1px solid #000000', fontSize: '9px' }}>N</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, idx) => {
              const checked = getRatingChecked(s);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', height: '18px' }}>
                  <td style={{ padding: '2px 5px', color: '#1a202c', fontWeight: 500 }}>
                    {s.subjectName || '—'}
                  </td>
                  <td style={{ width: '20px', textAlign: 'center', borderLeft: '1px solid #000000', fontWeight: 'bold', color: '#1e40af', fontSize: '11px' }}>
                    {checked === 'E' ? '✓' : ''}
                  </td>
                  <td style={{ width: '20px', textAlign: 'center', borderLeft: '1px solid #000000', fontWeight: 'bold', color: '#1e40af', fontSize: '11px' }}>
                    {checked === 'S' ? '✓' : ''}
                  </td>
                  <td style={{ width: '20px', textAlign: 'center', borderLeft: '1px solid #000000', fontWeight: 'bold', color: '#1e40af', fontSize: '11px' }}>
                    {checked === 'N' ? '✓' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (isTahfeezOrIslamic) {
    const textColor     = '#1e293b';

    const toArabicNumerals = (n: number | string): string =>
      String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);


    const translateClassToArabic = (levelStr: string): string => {
      const l = levelStr.toLowerCase();
      if (l.includes('1')) return 'الأول';
      if (l.includes('2')) return 'الثاني';
      if (l.includes('3')) return 'الثالث';
      if (l.includes('4')) return 'الرابع';
      if (l.includes('5')) return 'الخامس';
      if (l.includes('6')) return 'السادس';
      return levelStr;
    };

    const arabicSubjectNames: Record<string, string> = {
      'quran': 'القرآن الكريم', 'tajweed': 'التجويد / إملاء',
      'grammar': 'الحروف / النحو', 'adhkar': 'الأذكار',
      'arabic': 'العربية', 'writing': 'الكتابة',
      'hadith': 'الحديث', 'sarf': 'الصرف / العدد',
      'tawhid': 'التوحيد', 'sirah': 'السيرة',
      'fiqh': 'الفقه والسلوك', 'quranic_sciences': 'علوم القرآن',
      'composition': 'الإنشاء'
    };

    const getSubjectArabicName = (s: any): string => {
      if (s.subjectNameArabic) return s.subjectNameArabic;
      const nameLower = (s.subjectName || '').toLowerCase();
      for (const [key, nameAr] of Object.entries(arabicSubjectNames)) {
        if (nameLower.includes(key)) return nameAr;
      }
      return s.subjectName || '';
    };

    const getGradeArabic = (gradeStr: string): string => {
      const g = String(gradeStr || '').toUpperCase();
      if (g === 'A1' || g === 'A') return 'م';
      if (g === 'B2' || g === 'B3' || g === 'B') return 'جج';
      if (g === 'C4' || g === 'C5' || g === 'C6' || g === 'C') return 'ج';
      if (g === 'D7' || g === 'E8' || g === 'D' || g === 'E') return 'مق';
      return 'ر';
    };

    const termVal        = result.term || '';
    const sessionVal     = result.academicYear || '';
    const timesOpenedVal = Number(result.attendanceSummary?.timesOpened) || 0;
    const timesPresentVal= Number(result.attendanceSummary?.timesPresent) || 0;

    const filteredSubjects  = allSubjects;
    const gradedSubjects    = filteredSubjects.filter((s: any) => s.isGraded);
    const totalObtained     = gradedSubjects.reduce((acc: number, curr: any) => acc + (Number(curr.score100) || 0), 0);
    const totalObtainable   = gradedSubjects.length * 100;
    const finalPercentage   = totalObtainable > 0 ? (totalObtained / totalObtainable) * 100 : 0;

    const behaviorRatings = [
      { labelAr: 'النظافة',              labelEn: 'Neatness',       val: affectiveData.neatness      || 5 },
      { labelAr: 'المعاملة مع الآخرين', labelEn: 'Relationship',   val: affectiveData.relationship  || 5 },
      { labelAr: 'الانتباه',             labelEn: 'Attentiveness',  val: affectiveData.attentiveness || 5 },
      { labelAr: 'القيام بالعمل',       labelEn: 'Responsibility', val: affectiveData.responsibility || 5 },
      { labelAr: 'الشعور بالمسؤولية',   labelEn: 'Self-Control',   val: affectiveData.selfControl   || 5 }
    ];

    const schoolNameAr = (tenant as any)?.nameArabic || schoolSettings?.schoolNameArabic || 'أكاديمية القلم كدونا';
    const schoolNameEn = schoolSettings?.schoolName || (tenant as any)?.name || 'AL-QALAM ACADEMY';
    const schoolAddress= schoolSettings?.address    || (tenant as any)?.contact?.address || '';
    const schoolPhone  = schoolSettings?.phone      || (tenant as any)?.contact?.phoneNumbers || '';
    const schoolEmail  = schoolSettings?.email      || (tenant as any)?.contact?.email || '';
    const schoolLogo = isTahfeezOrIslamic 
      ? (schoolSettings?.islamicLogo || (tenant as any)?.branding?.islamicLogo || schoolSettings?.logo || (tenant as any)?.branding?.logo || '/logo.png')
      : (schoolSettings?.logo || (tenant as any)?.branding?.logo || '/logo.png');

    const primaryColor = isTahfeezOrIslamic ? '#1c1917' : (tenant?.branding?.primaryColor || '#800020');
    const secondaryColor = isTahfeezOrIslamic ? '#6b7280' : '#475569';
    const borderColor = isTahfeezOrIslamic ? '#1c1917' : '#800020';
    const maroon = isTahfeezOrIslamic ? '#1c1917' : '#800020';
    const bgSlateAsh = '#f1f5f9';

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

    const mapGradeToStandard = (g: string): string => {
      const clean = String(g || '').toUpperCase().trim();
      if (clean === 'A1' || clean === 'A') return 'A';
      if (clean === 'B2' || clean === 'B3' || clean === 'B') return 'B';
      if (clean === 'C4' || clean === 'C5' || clean === 'C6' || clean === 'C') return 'C';
      if (clean === 'D7' || clean === 'E8' || clean === 'D' || clean === 'E') return 'D';
      if (clean === 'F9' || clean === 'F') return 'F';
      return clean || '—';
    };

    const translateTermToArabic = (tStr: string): string => {
      const t = String(tStr || '').toLowerCase();
      if (t.includes('first')) return 'الفترة الأولى';
      if (t.includes('second')) return 'الفترة الثانية';
      if (t.includes('third')) return 'الفترة الثالثة';
      return tStr;
    };

    const tahfeezSubjects = filteredSubjects.filter((s: any) => {
      const name = (s.subjectName || '').toLowerCase();
      return s.section === 'tahfeezh' || name.includes('hifz') || name.includes('quran') || name.includes('tajweed') || name.includes('حفظ') || name.includes('قرآن');
    });

    const islamicSubjects = filteredSubjects.filter((s: any) => !tahfeezSubjects.includes(s));

    const renderSubjectRowsReact = (subjects: any[]) => {
      if (subjects.length === 0) {
        return (
          <tr>
            <td colSpan={6} style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, color: '#64748b', fontStyle: 'italic', padding: '6px' }}>
              لا توجد مواد مسجلة
            </td>
          </tr>
        );
      }

      return subjects.map((s: any, idx: number) => {
        const hasSplitCa = (Number(s.score20_1) || 0) > 0 || (Number(s.score20_2) || 0) > 0;
        const ca1   = s.isGraded ? (hasSplitCa ? (s.score20_1 ?? 0) : (s.score60 ?? 0)) : '—';
        const ca2   = s.isGraded ? (hasSplitCa ? (s.score20_2 ?? 0) : '—') : '—';
        const exam  = s.isGraded ? (s.score40 ?? '—') : '—';
        const total = s.isGraded ? s.score100 : '—';
        const grade = s.isGraded ? mapGradeToStandard(s.grade) : '—';
        const subjectArabic = s.subjectNameArabic || getSubjectArabicName(s);

        return (
          <tr key={idx} style={{ height: '18px', borderBottom: `1.5px solid ${borderColor}` }}>
            <td style={{ padding: '3px 6px', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', textAlign: 'right', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              {subjectArabic}
            </td>
            <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '9px', width: '13%' }}>{ca1}</td>
            <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '9px', width: '13%' }}>{ca2}</td>
            <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontSize: '9px', width: '13%' }}>{exam}</td>
            <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', fontSize: '9.5px', backgroundColor: bgSlateAsh, color: maroon, width: '13%' }}>{total}</td>
            <td style={{ textAlign: 'center', border: `1.5px solid ${borderColor}`, fontWeight: 'bold', fontSize: '9.5px', width: '13%' }}>{grade}</td>
          </tr>
        );
      });
    };

    const aff = affectiveData;
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

    const verificationUrl = `https://${tenant?.slug || 'alqalam'}.smartschool.africa/verify-result/${result._id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

    return (
      <div
        className="report-card-print-target islamic-bilingual-reportsheet"
        style={{
          backgroundColor: '#ffffff', color: textColor,
          padding: '10px', border: `3.5px solid ${maroon}`,
          width: '100%', maxWidth: '820px', margin: '0 auto',
          boxSizing: 'border-box', fontFamily: "'Tajawal', 'Cairo', 'Amiri', 'Tahoma', 'Arial', sans-serif",
          lineHeight: 1.35, display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', direction: 'rtl'
        }}
      >
        <div>
          {/* ═══ HEADER (Single Center Logo) ═══ */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ marginBottom: '3px' }}>
              <img src={schoolLogo} style={{ width: '55px', height: '55px', objectFit: 'contain' }} alt="Logo" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: maroon, fontFamily: "'Tajawal', 'Cairo', sans-serif", lineHeight: 1.1, marginBottom: '1px' }}>
              {schoolNameAr}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: maroon, fontFamily: "'Times New Roman', Times, serif", letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' }}>
              {schoolNameEn}
            </div>
            <div style={{ fontSize: '11px', color: royalBlue, fontWeight: 'bold', lineHeight: 1.3, fontFamily: "'Times New Roman', Times, serif", direction: 'ltr' }}>
              <span style={{ color: royalBlue }}>{schoolAddress}</span><br />
              <span style={{ color: royalBlue }}>Tel:</span> <span style={{ color: maroon }}>{schoolPhone}</span> <span style={{ color: royalBlue }}>|</span> <span style={{ color: royalBlue }}>Email:</span> <span style={{ color: maroon }}>{schoolEmail}</span>
            </div>
          </div>

          {/* ═══ STUDENT INFO BOX GRID (Arabic Labels Only) ═══ */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${borderColor}`, marginBottom: '6px', fontSize: '9.5px' }}>
            <tbody>
              <tr>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px', width: '33.33%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>المستوى:</span>
                    <span style={{ fontWeight: 'bold' }}>{student.level || result.level}</span>
                  </div>
                </td>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px', width: '33.33%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>اسم الطالب/ة:</span>
                    <span style={{ fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{student.nameArabic || student.name}</span>
                  </div>
                </td>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px', width: '33.33%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>رقم الطالب:</span>
                    <span style={{ fontWeight: 'bold' }}>{student.admissionNumber}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>القسم:</span>
                    <span style={{ fontWeight: 'bold' }}>{student.section || result.section}</span>
                  </div>
                </td>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>العام الدراسي:</span>
                    <span style={{ fontWeight: 'bold' }}>{sessionVal}</span>
                  </div>
                </td>
                <td style={{ border: `1.5px solid ${borderColor}`, padding: '4px 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: 'bold', color: textColor, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>التقدير العام:</span>
                    <span style={{ fontWeight: 'bold' }}>{result.generalGrade || '—'}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══ BANNER SUBTITLE (Arabic Only) ═══ */}
          <div style={{ backgroundColor: maroon, color: 'white', height: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>كشف درجات الامتحان والتقييم - {translateTermToArabic(termVal)}</span>
          </div>

          {/* ═══ TAHFEEZH SECTION (QUR'AN & HIFZ) ═══ */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: maroon, backgroundColor: bgSlateAsh, border: `1.5px solid ${maroon}`, padding: '1px 6px', fontSize: '9px', marginBottom: '2px', textAlign: 'right', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              قسم التحفيظ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, fontSize: '8.5px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: maroon, height: '18px', textAlign: 'center', fontWeight: 'bold' }}>
                  <th style={{ textAlign: 'right', paddingRight: '6px', border: `1.5px solid ${maroon}` }}>المواد</th>
                  <th style={{ width: '17%', border: `1.5px solid ${maroon}` }}>المستمر ١</th>
                  <th style={{ width: '17%', border: `1.5px solid ${maroon}` }}>المستمر ٢</th>
                  <th style={{ width: '16%', border: `1.5px solid ${maroon}` }}>الامتحان</th>
                  <th style={{ width: '19%', border: `1.5px solid ${maroon}` }}>المجموع</th>
                  <th style={{ width: '15%', border: `1.5px solid ${maroon}` }}>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {renderSubjectRowsReact(tahfeezSubjects)}
              </tbody>
            </table>
          </div>

          {/* ═══ HIFZ DETAILS / بيانات التحفيظ ═══ */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: maroon, backgroundColor: bgSlateAsh, border: `1.5px solid ${maroon}`, padding: '1px 6px', fontSize: '9px', marginBottom: '2px', textAlign: 'right', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              بيانات التحفيظ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, fontSize: '8.5px', textAlign: 'right' }}>
              <tbody>
                <tr style={{ height: '18px', borderBottom: `1.5px solid ${maroon}` }}>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, width: '35%', color: maroon, borderLeft: `1.5px solid ${maroon}`, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>إجمالي أيام الحفظ</td>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', textAlign: 'center', width: '15%' }}>{result.tahfeezhDetails?.absenceOfHifz || 0}</td>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, width: '25%', color: maroon, borderLeft: `1.5px solid ${maroon}`, borderRight: `1.5px solid ${maroon}`, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>الغياب والطلب</td>
                  <td style={{ padding: '1px 6px', fontSize: '8px', textAlign: 'center', direction: 'ltr', width: '25%' }}>
                    Absent: {result.tahfeezhDetails?.daysAbsent ?? (timesOpenedVal - timesPresentVal)} &nbsp;|&nbsp; Present: {result.tahfeezhDetails?.daysPresent ?? timesPresentVal}
                  </td>
                </tr>
                <tr style={{ height: '18px' }}>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, color: maroon, borderLeft: `1.5px solid ${maroon}`, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>من سورة إلى سورة</td>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', textAlign: 'center', direction: 'rtl' }}>
                    من {result.tahfeezhDetails?.fromSurah || '—'} إلى {result.tahfeezhDetails?.toSurah || '—'}
                  </td>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', backgroundColor: bgSlateAsh, color: maroon, borderLeft: `1.5px solid ${maroon}`, borderRight: `1.5px solid ${maroon}`, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>أوجه الحفظ</td>
                  <td style={{ padding: '1px 6px', fontWeight: 'bold', textAlign: 'center' }}>{result.tahfeezhDetails?.memorizedPages || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══ ISLAMIC STUDIES TABLE (Arabic Only) ═══ */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', color: maroon, backgroundColor: bgSlateAsh, border: `1.5px solid ${maroon}`, padding: '1px 6px', fontSize: '9px', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              الدراسات الإسلامية
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, fontSize: '8.5px', marginBottom: '4px' }}>
              <thead>
                <tr style={{ backgroundColor: bgSlateAsh, color: maroon, height: '18px', textAlign: 'center', fontWeight: 'bold' }}>
                  <th style={{ textAlign: 'right', paddingRight: '6px', border: `1.5px solid ${maroon}` }}>المواد</th>
                  <th style={{ width: '13%', border: `1.5px solid ${maroon}` }}>المستمر ١</th>
                  <th style={{ width: '13%', border: `1.5px solid ${maroon}` }}>المستمر ٢</th>
                  <th style={{ width: '13%', border: `1.5px solid ${maroon}` }}>الامتحان</th>
                  <th style={{ width: '13%', border: `1.5px solid ${maroon}` }}>المجموع</th>
                  <th style={{ width: '13%', border: `1.5px solid ${maroon}` }}>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {renderSubjectRowsReact(islamicSubjects)}
              </tbody>
            </table>
          </div>

          {/* ═══ AVERAGES & MARKS ROW (Arabic Only) ═══ */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, fontSize: '8.5px', marginBottom: '4px', textAlign: 'center' }}>
            <tbody>
              <tr style={{ backgroundColor: bgSlateAsh, height: '16px', fontWeight: 'bold', color: maroon }}>
                <td style={{ width: '50%', border: `1.5px solid ${maroon}`, fontSize: '8px', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>المعدل النهائي</td>
                <td style={{ width: '50%', border: `1.5px solid ${maroon}`, fontSize: '8px', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>الدرجة الإجمالية</td>
              </tr>
              <tr style={{ height: '20px', fontWeight: 'bold' }}>
                <td style={{ border: `1.5px solid ${maroon}`, fontSize: '11px', color: maroon }}>
                  {result.finalAverage || Math.round(finalPercentage)}%
                </td>
                <td style={{ border: `1.5px solid ${maroon}`, fontSize: '11px', color: maroon }}>
                  {totalObtained}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══ BEHAVIORAL & EVALUATION CRITERIA (Bilingual Left, Criteria Right) ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', marginTop: '4px' }}>
            {/* Left: Elements of Evaluation Table (Bilingual as requested) */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, fontSize: '8.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: bgSlateAsh, color: maroon, height: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                    <th style={{ border: `1.5px solid ${maroon}`, textAlign: 'left', paddingLeft: '6px', width: '65%' }}>Elements of Evaluation / عناصر التقويم</th>
                    <th style={{ border: `1.5px solid ${maroon}`, width: '35%' }}>Rating / التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {elementsOfEvaluation.map((item, idx) => (
                    <tr key={idx} style={{ height: '22px', borderBottom: `1.5px solid ${maroon}` }}>
                      <td style={{ padding: '2px 6px', border: `1.5px solid ${maroon}`, fontSize: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', direction: 'ltr' }}>
                          <span style={{ fontFamily: "'Times New Roman', Times, serif" }}>{item.labelEn}</span>
                          <span style={{ fontWeight: 'bold', color: maroon, fontSize: '8px', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{item.labelAr}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontSize: '9px', color: maroon }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', direction: 'ltr' }}>
                          <span>{getRatingLabel(item.val)}</span>
                          <span style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>{getRatingLabelAr(item.val)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: Criteria & Level/Rating Tables (Bilingual/English as requested) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Table 1: Evaluation Criteria */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, textAlign: 'center', fontSize: '7.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: bgSlateAsh, color: maroon, height: '18px', fontWeight: 'bold' }}>
                    <td style={{ border: `1.5px solid ${maroon}` }}>Evaluation Criteria</td>
                    <td style={{ border: `1.5px solid ${maroon}` }}>معايير التقييم</td>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>Excellent (A) 100-80</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>ممتاز (أ) ١٠٠-٨٠</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>V. Good (B) 79-70</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>جيد جداً (ب) ٧٩-٧٠</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>Good (C) 69-60</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>جيد (ج) ٦٩-٦٠</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>Pass (D) 59-50</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>مقبول (د) ٥٩-٥٠</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>Fail (F) 49-0</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>ضعيف (هـ) ٤٩-٠</td></tr>
                </tbody>
              </table>

              {/* Table 2: Level/Rating */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${maroon}`, textAlign: 'center', fontSize: '7.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: bgSlateAsh, color: maroon, height: '18px', fontWeight: 'bold' }}>
                    <td style={{ border: `1.5px solid ${maroon}` }}>Level/Rating</td>
                    <td style={{ border: `1.5px solid ${maroon}` }}>مستوى التقييم</td>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>5-Excellent</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>٥ - ممتاز</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>4-V. Good</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>٤ - جيد جداً</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>3-Good</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>٣ - جيد</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>2-Fair</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>٢ - مقبول</td></tr>
                  <tr style={{ height: '16px' }}><td style={{ border: `1.5px solid ${maroon}` }}>1-Poor</td><td style={{ border: `1.5px solid ${maroon}`, fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>١ - ضعيف</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ SUPERVISOR'S RECOMMENDATIONS (Arabic Only, Placed Last) ═══ */}
          <div style={{ border: `1.5px solid ${maroon}`, marginTop: '6px', marginBottom: '6px', fontSize: '9.5px', direction: 'rtl', textAlign: 'right' }}>
            <div style={{ backgroundColor: bgSlateAsh, fontWeight: 'bold', color: maroon, padding: '3px 8px', borderBottom: `1.5px solid ${maroon}`, fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              توصيات المشرف التربوي
            </div>
            <div style={{ padding: '6px', minHeight: '32px', fontStyle: 'italic', fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              {result.teacherRecommendations || result.headTeacherComments || '—'}
            </div>
          </div>

        </div>

        {/* ═══ BOTTOM SIGNATURE & INFO FOOTER (Arabic Labels Only) ═══ */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1.5px solid ${maroon}`, borderBottom: `1.5px solid ${maroon}`, padding: '6px 0', fontSize: '10px', marginTop: '4px', direction: 'rtl', textAlign: 'right' }}>
            <div style={{ width: '32%' }}>
              <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '75%', minHeight: '12px', verticalAlign: 'bottom', textAlign: 'center' }}>
                {(tenant as any)?.branding?.principalSignature ? (
                  <img src={(tenant as any).branding.principalSignature} style={{ maxHeight: '16px', objectFit: 'contain' }} alt="Signature" />
                ) : ''}
              </span>
            </div>
            <div style={{ width: '38%', textAlign: 'center' }}>
              <span style={{ fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>رسوم الفترة القادمة:</span>
              <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '45%', minHeight: '12px', verticalAlign: 'bottom' }}>
                {result.nextTermSchoolFees || '—'}
              </span>
            </div>
            <div style={{ width: '30%', textAlign: 'left' }}>
              <span style={{ fontWeight: 'bold', fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>بداية الفترة القادمة:</span>
              <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '40%', minHeight: '12px', verticalAlign: 'bottom' }}>
                {result.nextTermBegins || '—'}
              </span>
            </div>
          </div>

          {/* Footer ID bar & QR code placement */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <div style={{ fontSize: '7.5px', color: '#64748b' }}>
              تم الإنشاء بواسطة نظام إدارة المدرسة الذكي &bull; {new Date().toLocaleDateString('ar-SA')}
              <br />
              <strong>Report ID:</strong> <code>{result._id}</code>
            </div>
            <div>
              <img src={qrCodeUrl} style={{ width: '40px', height: '40px' }} alt="QR Code" />
            </div>
          </div>
        </div>

      </div>
    );
  }

  if (isNursery) {
    const numPadded = padRows(grouped['NUMERACY'], 6);
    const litPadded = padRows(grouped['LITERACY'], 6);
    const artPadded = padRows(grouped['CREATIVE ART'], 7);
    const senPadded = padRows(grouped['SENSORIAL EDUCATION'], 5);
    const rhyPadded = padRows(grouped['RHYMES'], 6);
    const socPadded = padRows(grouped['SOCIAL & EMOTIONAL DEVELOPMENT'], 6);
    const hanPadded = padRows(grouped['HANDWRITING'], 6);

    const age = calculateAge(student?.dob || result?.studentId?.dob);
    const formattedDob = student?.dob || result?.studentId?.dob || '—';
    const timesOpened = Number(result?.attendanceSummary?.timesOpened) || 0;
    const timesPresent = Number(result?.attendanceSummary?.timesPresent) || 0;
    const timesAbsent = Number(result?.attendanceSummary?.timesAbsent) || 0;
    const attendanceRate = timesOpened ? ((timesPresent / timesOpened) * 100).toFixed(1) : '0.0';

    const verificationUrl = `https://${tenant?.slug || 'alqalam'}.smartschool.africa/verify-result/${result?._id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;
    const studentPosition = result?.position || '—';

    return (
      <div 
        className="report-card-print-target nursery-reportsheet"
        style={{
          backgroundColor: '#ffffff',
          color: '#1a202c',
          padding: '12px',
          border: '3px double #1e40af',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '820px',
          margin: '0 auto',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.3
        }}
      >
        <ReportCardHeader 
          schoolSettings={schoolSettings} 
          tenant={tenant} 
          result={result} 
          student={student} 
        />

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            border: '1.5px solid #000000',
            padding: '3px 16px',
            display: 'inline-block',
            borderRadius: '20px',
            textTransform: 'uppercase',
            backgroundColor: '#ffffff',
            color: '#1e40af'
          }}>
            {result?.term?.toUpperCase()} PUPIL'S PERFORMANCE REPORT
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1.25fr', gap: '8px', marginBottom: '8px' }}>
          <div style={{ border: '1px solid #000000', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <div style={{ backgroundColor: '#1e40af', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '4px', textTransform: 'uppercase' }}>
              Personal Data
            </div>
            <div style={{ padding: '6px', fontSize: '11px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#1a202c', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', textTransform: 'uppercase' }}>
                {student?.name}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  <tr style={{ height: '18px' }}><td style={{ fontWeight: 'bold', width: '40%' }}>GENDER:</td><td>{student?.gender || '—'}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold' }}>ADM/SN NO:</td><td><code>{student?.admissionNumber}</code></td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold' }}>D.O.B:</td><td>{formattedDob}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold' }}>AGE:</td><td>{age}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold' }}>WEIGHT:</td><td>{result?.weight || '—'} kg</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold' }}>HEIGHT:</td><td>{result?.height || '—'} cm</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #000000', borderRadius: '4px', backgroundColor: '#ffffff', padding: '6px' }}>
            {student?.picture ? (
              <img src={student.picture} style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '2px' }} alt="Student" />
            ) : (
              <div style={{ width: '100%', height: '130px', border: '1px dashed #cbd5e0', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#a0aec0', fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '6px' }}>
                PASSPORT PHOTO
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ border: '1px solid #000000', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <div style={{ backgroundColor: '#1e40af', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '4px', textTransform: 'uppercase' }}>
                Class Data
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', padding: '4px' }}>
                <tbody>
                  <tr style={{ height: '18px' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '45%' }}>CLASS:</td><td>{student?.level || result?.level} {student?.section || ''}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px' }}>SESSION:</td><td>{result?.academicYear}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px' }}>CLASS SIZE:</td><td>{result?.totalStudents || '—'}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px' }}>CLASS POSITION:</td><td style={{ color: '#1e40af', fontWeight: 'bold' }}>{studentPosition ? getOrdinal(studentPosition) : '—'} of {result?.totalStudents || '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ border: '1px solid #000000', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <div style={{ backgroundColor: '#1e40af', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '4px', textTransform: 'uppercase' }}>
                Attendance Summary
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', padding: '4px' }}>
                <tbody>
                  <tr style={{ height: '18px' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '65%' }}>Times Opened:</td><td>{timesOpened}</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px' }}>Times Present:</td><td>{timesPresent} ({attendanceRate}%)</td></tr>
                  <tr style={{ height: '18px', borderTop: '1px solid #e2e8f0' }}><td style={{ fontWeight: 'bold', paddingLeft: '6px' }}>Times Absent:</td><td>{timesAbsent}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            {renderChecklistTable('NUMERACY', 1, numPadded)}
            {renderChecklistTable('LITERACY', 2, litPadded)}

            <div style={{ border: '1px solid #000000', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <div style={{ backgroundColor: '#800020', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', padding: '4px', textTransform: 'uppercase' }}>
                Grading Key
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', textAlign: 'center' }}>
                <tbody>
                  <tr style={{ height: '18px', fontWeight: 'bold', backgroundColor: '#f7fafc' }}>
                    <td style={{ borderRight: '1px solid #cbd5e0', width: '33%' }}>E</td>
                    <td style={{ borderRight: '1px solid #cbd5e0', width: '33%' }}>S</td>
                    <td style={{ width: '34%' }}>N</td>
                  </tr>
                  <tr style={{ height: '22px' }}>
                    <td style={{ borderRight: '1px solid #cbd5e0', borderTop: '1px solid #cbd5e0', fontSize: '10px' }}>EXCELLENT</td>
                    <td style={{ borderRight: '1px solid #cbd5e0', borderTop: '1px solid #cbd5e0', fontSize: '10px' }}>SATISFACTORY</td>
                    <td style={{ borderTop: '1px solid #cbd5e0', fontSize: '10px' }}>NEEDS IMPROVEMENT</td>
                  </tr>
                  <tr style={{ height: '18px', backgroundColor: '#fff5f5' }}>
                    <td colSpan={3} style={{ borderTop: '1px solid #cbd5e0', color: '#e53e3e', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' }}>
                      OBJECTIVES ARE RATED BASED ON THE GRADES ABOVE
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            {renderChecklistTable('CREATIVE ART', 3, artPadded)}
            {renderChecklistTable('SENSORIAL EDUCATION', 4, senPadded)}
            {renderChecklistTable('RHYMES', 5, rhyPadded)}
            {renderChecklistTable('SOCIAL & EMOTIONAL DEVELOPMENT', 6, socPadded)}
            {renderChecklistTable('HANDWRITING', 7, hanPadded)}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '11px', marginBottom: '8px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #000000' }}>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#fafafa', borderRight: '1px solid #cbd5e1', width: '20%', textTransform: 'uppercase' }}>Class Teacher's Remark</td>
              <td style={{ padding: '6px 8px', fontStyle: 'italic' }}>"{result?.teacherRecommendations || 'Steady progress. Active participant.'}"</td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', borderLeft: '1px solid #cbd5e1', width: '25%', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '8px', color: '#718096', textTransform: 'uppercase' }}>Sign:</div>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 'bold', marginTop: '2px' }}>{result?.teacherName}</div>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#fafafa', borderRight: '1px solid #cbd5e1', textTransform: 'uppercase' }}>Head Teacher's Remark</td>
              <td style={{ padding: '6px 8px', fontStyle: 'italic' }}>"{result?.headTeacherComments || 'An encouraging result. Keep it up.'}"</td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', borderLeft: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                {(tenant as any)?.branding?.principalSignature ? (
                  <img src={(tenant as any).branding.principalSignature} style={{ maxHeight: '25px', objectFit: 'contain', display: 'block', marginLeft: 'auto' }} alt="Signature" />
                ) : (
                  <div style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '12px', fontStyle: 'italic', color: '#1e40af', fontWeight: 'bold' }}>Head Teacher</div>
                )}
                <div style={{ fontSize: '8px', color: '#718096', textTransform: 'uppercase', marginTop: '2px' }}>Sign:</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '11px', backgroundColor: '#fafafa', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#1e40af', width: '50%', verticalAlign: 'middle' }}>
                NEXT TERM BEGINS: <span style={{ color: '#2d3748', marginLeft: '8px', fontWeight: 'normal', borderBottom: '1px solid #000', paddingBottom: '1px' }}>{result?.nextTermBegins || '—'}</span>
              </td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1e40af', width: '50%', verticalAlign: 'middle' }}>
                DATE: <span style={{ color: '#2d3748', marginLeft: '8px', fontWeight: 'normal', borderBottom: '1px solid #000', paddingBottom: '1px' }}>{result?.dateIssued || new Date().toLocaleDateString('en-GB')}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', color: '#718096', borderTop: '1px solid #cbd5e0', paddingTop: '6px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle' }}>POWERED BY SMART SCHOOL SOFTWARE V2.0</td>
              <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <img src={qrCodeUrl} style={{ width: '45px', height: '45px', border: '2px solid #ffffff', boxShadow: '0 0 4px rgba(0,0,0,0.1)' }} alt="QR Code" />
                  <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase' }}>Scan to Verify Result</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div 
      className="report-card-print-target"
      style={{
        backgroundColor: '#ffffff',
        color: '#1e293b',
        padding: '1.25rem',
        border: '3px double var(--primary, #0f172a)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.4
      }}
    >
      {/* 1. Header */}
      <ReportCardHeader 
        schoolSettings={schoolSettings} 
        tenant={tenant} 
        result={result} 
        student={student} 
      />

      {/* 2. Student Details */}
      <StudentInfoSection 
        student={student} 
        result={result} 
      />

      {/* 3. Main Grades Table */}
      <AcademicPerformanceTable 
        subjects={allSubjects} 
        isAlQalam={isAlQalam} 
        schoolSettings={schoolSettings} 
        showArabic={showArabic} 
      />

      {/* 4. Tahfeez Memorization Block (Optional: show only if Tahfeez data is present/enabled) */}
      {showTahfeez && result?.tahfeezhDetails && (
        <div style={{ 
          border: '1px solid #cbd5e1', 
          borderRadius: '6px', 
          padding: '0.75rem', 
          backgroundColor: '#fcfdfc',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            color: '#0f172a', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '0.35rem',
            marginBottom: '0.65rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Tahfeez & Qur'an Memorization Progress Summary</span>
            {showArabic && <span style={{ fontFamily: 'Amiri, Cairo, serif', fontSize: '0.85rem' }}>ملخص تقدم حفظ القرآن الكريم</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Total Hifz Days</span>
              <strong style={{ fontSize: '1rem', color: '#334155' }}>{result.tahfeezhDetails.absenceOfHifz || '0'}</strong>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Qur'an Class Attendance</span>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                Present: {result.tahfeezhDetails.daysPresent || '—'} / Absent: {result.tahfeezhDetails.daysAbsent || '0'}
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Memorization Coverage (From → To Surah)</span>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', gap: '1rem' }}>
                <span>From: {result.tahfeezhDetails.fromSurah || '—'}</span>
                <span>To: {result.tahfeezhDetails.toSurah || '—'}</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Memorized Pages</span>
              <strong style={{ fontSize: '1rem', color: 'var(--primary, #0f172a)' }}>{result.tahfeezhDetails.memorizedPages || '—'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 5. Details Section (Attendance, Domains, Performance Summary, Analysis) */}
      {!isTahfeezSchool && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Left Column: Academic Analytics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PerformanceSummaryCard result={result} subjects={allSubjects} />
            <GradeAnalysisCard subjects={allSubjects} isAlQalam={isAlQalam} />
            <ScaleAndLegend isAlQalam={isAlQalam} tenant={tenant} />
          </div>

          {/* Right Column: Attendance & Domains */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AttendanceSummary attendanceSummary={result.attendanceSummary} />
            
            {/* Affective Rating Table */}
            <DomainRatingTable 
              title="Affective Domain Evaluation" 
              traits={affectiveTraits} 
              ratingsData={affectiveData} 
            />

            {/* Psychomotor Rating Table */}
            <DomainRatingTable 
              title="Psychomotor Skills Evaluation" 
              traits={psychomotorTraits} 
              ratingsData={psychomotorData} 
            />
          </div>
        </div>
      )}

      {/* 6. Calendar Announcement (if enabled/configured) */}
      {nextTermNotes && (
        <div style={{ 
          padding: '0.5rem 0.75rem', 
          borderLeft: '3px solid var(--primary, #0f172a)', 
          backgroundColor: '#f8fafc',
          fontSize: '0.72rem',
          color: '#475569',
          marginBottom: '1rem'
        }}>
          <strong>Important Term Notice:</strong> {nextTermNotes}
        </div>
      )}

      {/* 7. Remarks & Signatures */}
      <RemarksSection 
        result={result} 
        tenant={tenant} 
        schoolSettings={schoolSettings} 
        showSupervisorRemarks={showTahfeez || isIslamicSchool || isHybridSchool}
      />

      {/* 8. Footer */}
      <ReportCardFooter result={result} />
    </div>
  );
};
