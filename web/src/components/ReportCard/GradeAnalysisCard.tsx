import React from 'react';

interface SubjectGrade {
  grade: string;
  isGraded: boolean;
}

interface GradeAnalysisCardProps {
  subjects: SubjectGrade[];
  isAlQalam: boolean;
}

export const GradeAnalysisCard: React.FC<GradeAnalysisCardProps> = ({
  subjects = [],
  isAlQalam,
}) => {
  const gradedSubjects = subjects.filter(s => s.isGraded);
  
  // Define grades list
  const gradesList = isAlQalam 
    ? ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']
    : ['A', 'B', 'C', 'D', 'F'];

  // Count occurrences
  const counts: Record<string, number> = {};
  gradesList.forEach(g => { counts[g] = 0; });

  gradedSubjects.forEach(s => {
    const grade = s.grade?.toString().trim().toUpperCase() || '';
    if (counts[grade] !== undefined) {
      counts[grade]++;
    } else if (grade) {
      counts[grade] = (counts[grade] || 0) + 1;
    }
  });

  // Collect all unique grades that might not be in the default list
  const extraGrades = Object.keys(counts).filter(g => !gradesList.includes(g));
  const fullGradesList = [...gradesList, ...extraGrades];

  return (
    <div style={{
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '0.85rem',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem'
    }}>
      <div style={{ 
        fontSize: '0.75rem', 
        fontWeight: 700, 
        color: '#0f172a', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em',
        borderBottom: '1px solid #cbd5e1',
        paddingBottom: '0.35rem',
        marginBottom: '0.15rem'
      }}>
        Grade Analysis
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '0.4rem 0.25rem', color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                Grade
              </th>
              {fullGradesList.map(g => (
                <th key={g} style={{ padding: '0.4rem 0.25rem', color: '#475569', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.4rem 0.25rem', fontWeight: 600, color: '#64748b', borderRight: '1px solid #e2e8f0', backgroundColor: '#fafbfd' }}>
                Count
              </td>
              {fullGradesList.map(g => {
                const count = counts[g] || 0;
                return (
                  <td 
                    key={g} 
                    style={{ 
                      padding: '0.4rem 0.25rem', 
                      fontWeight: count > 0 ? 800 : 500, 
                      color: count > 0 ? 'var(--primary, #0f172a)' : '#94a3b8',
                      borderRight: '1px solid #e2e8f0',
                      backgroundColor: count > 0 ? 'rgba(15,23,42,0.02)' : 'transparent'
                    }}
                  >
                    {count > 0 ? count : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: '0.15rem' }}>
        Shows distribution of grades across all graded subjects.
      </div>
    </div>
  );
};
