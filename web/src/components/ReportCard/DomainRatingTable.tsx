import React from 'react';

interface TraitConfig {
  key: string;
  label: string;
}

interface DomainRatingTableProps {
  title: string;
  traits: TraitConfig[];
  ratingsData: Record<string, number> | any;
}

export const DomainRatingTable: React.FC<DomainRatingTableProps> = ({
  title,
  traits,
  ratingsData = {},
}) => {
  const ratingHeaders = [5, 4, 3, 2, 1];

  return (
    <div style={{
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Title Header */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #cbd5e1',
        padding: '0.45rem 0.65rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#0f172a',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {title}
      </div>

      {/* Grid Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fafbfd' }}>
            <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Trait / Skill</th>
            {ratingHeaders.map(rating => (
              <th 
                key={rating} 
                style={{ 
                  padding: '0.35rem 0.25rem', 
                  textAlign: 'center', 
                  width: '24px',
                  color: '#64748b', 
                  fontWeight: 600 
                }}
              >
                {rating}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {traits.map((trait, idx) => {
            const rawVal = ratingsData?.[trait.key];
            const val = rawVal !== undefined ? Number(rawVal) : null;
            const isLast = idx === traits.length - 1;

            return (
              <tr 
                key={trait.key} 
                style={{ 
                  borderBottom: isLast ? 'none' : '1px solid #e2e8f0'
                }}
              >
                <td style={{ padding: '0.35rem 0.5rem', color: '#334155', fontWeight: 600 }}>
                  {trait.label}
                </td>
                {ratingHeaders.map(rating => {
                  const isChecked = val === rating;
                  return (
                    <td 
                      key={rating} 
                      style={{ 
                        padding: '0.35rem 0.25rem', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        color: 'var(--primary, #0f172a)',
                        fontSize: '0.8rem',
                        borderLeft: '1px solid #e2e8f0',
                        backgroundColor: isChecked ? 'rgba(15,23,42,0.02)' : 'transparent'
                      }}
                    >
                      {isChecked ? '✓' : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
