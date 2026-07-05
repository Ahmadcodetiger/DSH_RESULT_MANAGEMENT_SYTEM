import React from 'react';

interface ScaleAndLegendProps {
  isAlQalam: boolean;
  tenant: any;
}

export const ScaleAndLegend: React.FC<ScaleAndLegendProps> = ({
  isAlQalam,
  tenant,
}) => {
  const scale = tenant?.academicConfig?.gradingScale || { A: 80, B: 70, C: 60, D: 50, F: 0 };

  const ratingIndex = [
    { rating: 5, label: 'Excellent' },
    { rating: 4, label: 'Very Good' },
    { rating: 3, label: 'Good' },
    { rating: 2, label: 'Fair' },
    { rating: 1, label: 'Poor' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.75rem',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '0.75rem',
      backgroundColor: '#ffffff',
      fontSize: '0.75rem'
    }}>
      {/* Grade Scale */}
      <div>
        <div style={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Grading Scale Legend
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem', color: '#475569' }}>
          {isAlQalam ? (
            <>
              <div><strong>A1:</strong> 85–100 (Ex)</div>
              <div><strong>B2:</strong> 75–84 (VG)</div>
              <div><strong>B3:</strong> 70–74 (G)</div>
              <div><strong>C4:</strong> 65–69 (Cr)</div>
              <div><strong>C5:</strong> 60–64 (Cr)</div>
              <div><strong>C6:</strong> 50–59 (Cr)</div>
              <div><strong>D7:</strong> 45–49 (Ps)</div>
              <div><strong>E8:</strong> 40–44 (Ps)</div>
              <div style={{ gridColumn: 'span 2' }}><strong>F9:</strong> 0–39 (Fail)</div>
            </>
          ) : (
            <>
              <div><strong>A:</strong> {scale.A}–100 (Excellent)</div>
              <div><strong>B:</strong> {scale.B}–{scale.A - 1} (Very Good)</div>
              <div><strong>C:</strong> {scale.C}–{scale.B - 1} (Good)</div>
              <div><strong>D:</strong> {scale.D}–{scale.C - 1} (Pass)</div>
              <div style={{ gridColumn: 'span 2' }}><strong>F:</strong> 0–{scale.D - 1} (Fail)</div>
            </>
          )}
        </div>
      </div>

      {/* Rating Index */}
      <div>
        <div style={{ fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Rating Indices (Domains)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', color: '#475569' }}>
          {ratingIndex.map(item => (
            <div key={item.rating} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.rating} = {item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
