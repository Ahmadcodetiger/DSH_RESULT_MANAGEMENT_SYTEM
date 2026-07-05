import React from 'react';

interface SubjectGrade {
  subjectName: string;
  subjectNameArabic: string;
  score60: number;
  score20_1: number;
  score20_2: number;
  score100: number;
  grade: string;
  isGraded: boolean;
  section: 'tahfeezh' | 'academic' | 'islamic';
  score40?: number;
  subjectPosition?: string;
  classAverage?: number;
  prevTermScore?: number;
  subjectRemarks?: string;
}

interface AcademicPerformanceTableProps {
  subjects: SubjectGrade[];
  isAlQalam: boolean;
  schoolSettings: any;
  showArabic: boolean;
}

export const AcademicPerformanceTable: React.FC<AcademicPerformanceTableProps> = ({
  subjects = [],
  isAlQalam,
  schoolSettings,
  showArabic,
}) => {
  // Separate subjects by section
  const academicSubjects = subjects.filter(s => s.section === 'academic');
  const islamicSubjects = subjects.filter(s => s.section === 'islamic');
  const tahfeezhSubjects = subjects.filter(s => s.section === 'tahfeezh');

  // Check if assignments/projects are present on any subject
  const hasAssignments = subjects.some(s => (s as any).assignmentScore !== undefined || (s as any).assignment !== undefined);
  const hasProjects = subjects.some(s => (s as any).projectScore !== undefined || (s as any).project !== undefined);

  const renderTableSection = (title: string, subtitleArabic: string, sectionSubjects: SubjectGrade[]) => {
    if (sectionSubjects.length === 0) return null;

    // Detect if this is an Islamic or Tahfeez section (needs CA 60 / Exam 40 layout)
    const isIslamicOrTahfeezSection = sectionSubjects.some(
      s => s.section === 'islamic' || s.section === 'tahfeezh'
    );

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#0f172a', 
          color: '#ffffff', 
          padding: '0.4rem 0.75rem',
          borderRadius: '4px',
          marginBottom: '0.5rem'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {title}
          </h4>
          {showArabic && subtitleArabic && (
            <span style={{ fontFamily: 'Amiri, Cairo, serif', fontSize: '0.95rem', fontWeight: 'bold' }}>
              {subtitleArabic}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                <th style={{ padding: '0.5rem 0.65rem', color: '#475569', fontWeight: 700, minWidth: '150px' }}>Subject</th>
                
                {isIslamicOrTahfeezSection ? (
                  // Islamic & Tahfeez single CA layout
                  <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '90px' }}>
                    C.A. (60)
                  </th>
                ) : (
                  // Conventional academic CA1 & CA2 layout
                  <>
                    <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '60px' }}>
                      {isAlQalam ? 'CA1 (30)' : 'CA1 (20)'}
                    </th>
                    <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '60px' }}>
                      {isAlQalam ? 'CA2 (30)' : 'CA2 (20)'}
                    </th>
                  </>
                )}

                {hasAssignments && !isIslamicOrTahfeezSection && (
                  <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '60px' }}>
                    Assign
                  </th>
                )}
                {hasProjects && !isIslamicOrTahfeezSection && (
                  <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '60px' }}>
                    Project
                  </th>
                )}
                
                <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '80px' }}>
                  {isIslamicOrTahfeezSection || isAlQalam ? 'Exam (40)' : 'Exam (60)'}
                </th>
                <th style={{ padding: '0.5rem 0.4rem', color: '#0f172a', fontWeight: 800, textAlign: 'center', width: '65px', backgroundColor: '#f1f5f9' }}>
                  Total
                </th>
                <th style={{ padding: '0.5rem 0.4rem', color: '#0f172a', fontWeight: 800, textAlign: 'center', width: '55px' }}>
                  Grade
                </th>
                <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '55px' }}>
                  Posn
                </th>
                <th style={{ padding: '0.5rem 0.4rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: '65px' }}>
                  Avg
                </th>
                <th style={{ padding: '0.5rem 0.65rem', color: '#475569', fontWeight: 700, minWidth: '130px' }}>
                  Teacher Remark
                </th>
              </tr>
            </thead>
            <tbody>
              {sectionSubjects.map((sub, idx) => {
                const isOdd = idx % 2 === 1;
                const total = sub.score100;
                
                return (
                  <tr 
                    key={idx} 
                    style={{ 
                      borderBottom: '1px solid #e2e8f0', 
                      backgroundColor: isOdd ? '#f8fafc' : '#ffffff'
                    }}
                  >
                    <td style={{ padding: '0.45rem 0.65rem', fontWeight: 700, color: '#334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{sub.subjectName}</span>
                        {showArabic && sub.subjectNameArabic && (
                          <span style={{ fontFamily: 'Amiri, Cairo, serif', fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                            {sub.subjectNameArabic}
                          </span>
                        )}
                      </div>
                    </td>

                    {isIslamicOrTahfeezSection ? (
                      // Single CA column displaying score60
                      <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                        {sub.isGraded ? sub.score60 : '—'}
                      </td>
                    ) : (
                      // Split CA1 and CA2 columns
                      <>
                        <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                          {sub.isGraded ? sub.score20_1 : '—'}
                        </td>
                        <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                          {sub.isGraded ? sub.score20_2 : '—'}
                        </td>
                      </>
                    )}

                    {hasAssignments && !isIslamicOrTahfeezSection && (
                      <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                        {sub.isGraded ? ((sub as any).assignmentScore ?? (sub as any).assignment ?? '—') : '—'}
                      </td>
                    )}
                    {hasProjects && !isIslamicOrTahfeezSection && (
                      <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                        {sub.isGraded ? ((sub as any).projectScore ?? (sub as any).project ?? '—') : '—'}
                      </td>
                    )}

                    {/* Exam column displaying score40 or score60 */}
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                      {sub.isGraded ? (isIslamicOrTahfeezSection || isAlQalam ? sub.score40 : sub.score60) : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', fontWeight: 800, color: 'var(--primary, #0f172a)', backgroundColor: '#f1f5f9' }}>
                      {sub.isGraded ? total : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', fontWeight: 800, color: 'var(--primary, #0f172a)' }}>
                      {sub.isGraded ? sub.grade : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#475569' }}>
                      {sub.isGraded ? (sub.subjectPosition || '—') : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center', color: '#64748b' }}>
                      {sub.isGraded ? (sub.classAverage || total) : '—'}
                    </td>
                    <td style={{ padding: '0.45rem 0.65rem', color: '#475569', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      {sub.isGraded ? (sub.subjectRemarks || '—') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* 1. Academic Section */}
      {renderTableSection('Academic Subjects', 'المواد الأكاديمية', academicSubjects)}

      {/* 2. Islamic Section */}
      {renderTableSection('Islamic Studies & Arabic', 'الدراسات الإسلامية واللغة العربية', islamicSubjects)}

      {/* 3. Tahfeez Section */}
      {renderTableSection("Qur'an & Tahfeez Progress", 'حفظ القرآن الكريم وتجويده', tahfeezhSubjects)}
    </div>
  );
};
