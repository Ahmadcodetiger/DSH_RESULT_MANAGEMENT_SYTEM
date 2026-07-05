import React from 'react';

interface AttendanceSummaryProps {
  attendanceSummary: {
    timesOpened: number;
    timesPresent: number;
    timesAbsent: number;
  };
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({
  attendanceSummary = { timesOpened: 0, timesPresent: 0, timesAbsent: 0 },
}) => {
  const present = attendanceSummary.timesPresent || 0;
  const absent = attendanceSummary.timesAbsent || 0;
  const opened = attendanceSummary.timesOpened || (present + absent) || 0;

  const percentage = opened > 0 ? Math.round((present / opened) * 100) : 0;

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
        Attendance Summary
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
          <span>Days School Opened:</span>
          <strong style={{ color: '#0f172a' }}>{opened}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
          <span>Days Present:</span>
          <strong style={{ color: 'var(--primary, #0f172a)' }}>{present}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
          <span>Days Absent:</span>
          <strong style={{ color: '#e11d48' }}>{absent}</strong>
        </div>
      </div>

      <div style={{ marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Attendance Rate:</span>
          <strong style={{ color: 'var(--primary, #0f172a)', fontWeight: 700 }}>{percentage}%</strong>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            backgroundColor: percentage > 75 ? 'var(--primary, #1e293b)' : percentage > 50 ? '#d97706' : '#dc2626',
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    </div>
  );
};
