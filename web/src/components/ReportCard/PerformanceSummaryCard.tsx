import React from 'react';

interface SubjectGrade {
  subjectName: string;
  grade: string;
  isGraded: boolean;
  score100: number;
}

interface PerformanceSummaryCardProps {
  result: any;
  subjects: SubjectGrade[];
}

export const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  result,
  subjects = [],
}) => {
  const gradedSubjects = subjects.filter(s => s.isGraded);
  const totalSubjects = gradedSubjects.length;
  const totalObtainable = totalSubjects * 100;
  
  const totalObtained = result?.totalMark !== undefined ? Number(result.totalMark) : 
    gradedSubjects.reduce((acc, curr) => acc + (Number(curr.score100) || 0), 0);

  const percentage = result?.finalAverage !== undefined ? Number(result.finalAverage) :
    (totalObtainable > 0 ? Math.round((totalObtained / totalObtainable) * 10000) / 100 : 0);

  const overallGrade = result?.generalGrade || '—';
  const overallPosition = result?.position || '—';

  // Calculate passed & failed (F or F9 is failed)
  const passedCount = gradedSubjects.filter(
    s => s.grade && !/^F9$|^F$/i.test(s.grade.toString().trim())
  ).length;
  
  const failedCount = totalSubjects - passedCount;

  // Helper for ordinals
  const getOrdinal = (n: any) => {
    if (!n || n === '—') return '—';
    const num = parseInt(n);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const stats = [
    { label: 'Total Marks Obtained', value: totalObtained.toFixed(1), highlight: true },
    { label: 'Total Marks Obtainable', value: totalObtainable },
    { label: 'Percentage Average', value: `${percentage.toFixed(2)}%`, highlight: true },
    { label: 'Overall Grade', value: overallGrade },
    { label: 'Class Position', value: getOrdinal(overallPosition) },
    { label: 'Subjects Offered', value: totalSubjects },
    { label: 'Subjects Passed', value: passedCount, color: '#16a34a' },
    { label: 'Subjects Failed', value: failedCount, color: failedCount > 0 ? '#dc2626' : '#64748b' },
  ];

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
        Performance Summary
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0.5rem',
        fontSize: '0.8rem'
      }}>
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '0.35rem 0.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '0.1rem' }}>
              {stat.label}
            </span>
            <strong style={{ 
              fontSize: stat.highlight ? '1.1rem' : '0.9rem', 
              color: stat.color || (stat.highlight ? 'var(--primary, #0f172a)' : '#334155'),
              fontWeight: 800
            }}>
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};
