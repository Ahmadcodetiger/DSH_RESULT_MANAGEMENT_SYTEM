import React from 'react';

interface StudentInfoSectionProps {
  student: any;
  result: any;
}

export const StudentInfoSection: React.FC<StudentInfoSectionProps> = ({
  student,
  result,
}) => {
  // Format age dynamically
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

  const age = calculateAge(student?.dob || result?.studentId?.dob);
  const studentPosition = result?.position || '—';
  const totalStudents = result?.totalStudents || '—';

  // Helper for ordinals
  const getOrdinal = (n: any) => {
    if (!n || n === '—') return '—';
    const num = parseInt(n);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const infoFields = [
    { label: 'Student Name', value: student?.name || '—', highlight: true },
    { label: 'Admission Number', value: student?.admissionNumber || '—' },
    { label: 'Registration Number', value: student?.regNumber || student?.admissionNumber || '—' },
    { label: 'Gender', value: student?.gender || '—' },
    { label: 'Date of Birth', value: student?.dob || '—' },
    { label: 'Age', value: age },
    { label: 'Class', value: result?.level || student?.level || '—' },
    { label: 'Class Arm / Section', value: result?.section || student?.section || '—' },
    { label: 'House', value: student?.house || '—' },
    { label: 'Club / Society', value: student?.club || '—' },
    { label: 'Academic Session', value: result?.academicYear || '—' },
    { label: 'Term', value: result?.term || '—' },
    { label: 'Class Size', value: totalStudents },
    { label: 'Class Position', value: `${getOrdinal(studentPosition)} of ${totalStudents}`, highlight: true },
  ];

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '0.45rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '6px'
      }}>
        {infoFields.map((field, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '0.8rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.25rem',
              paddingTop: '0.25rem'
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {field.label}:
            </span>
            <span style={{ 
              color: field.highlight ? 'var(--primary-dark, #0f172a)' : '#334155', 
              fontWeight: field.highlight ? 700 : 600,
              fontSize: field.highlight ? '0.82rem' : '0.8rem'
            }}>
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
