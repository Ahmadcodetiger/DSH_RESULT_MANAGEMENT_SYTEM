import React from 'react';

interface RemarksSectionProps {
  result: any;
  tenant: any;
  schoolSettings: any;
  showSupervisorRemarks: boolean;
}

export const RemarksSection: React.FC<RemarksSectionProps> = ({
  result,
  tenant,
  schoolSettings,
  showSupervisorRemarks,
}) => {
  const teacherRemarks = result?.teacherRecommendations || 'A good result. Keep striving for improvement.';
  const principalRemarks = result?.headTeacherComments || 'An encouraging result. Good job.';
  const supervisorRemarks = result?.supervisorRecommendations || '';

  const dateIssued = result?.dateIssued || new Date().toLocaleDateString();
  const nextTermBegins = result?.nextTermBegins || '—';
  const nextTermFees = result?.nextTermSchoolFees || result?.nextTermFees || '—';

  const principalSig = tenant?.branding?.principalSignature || schoolSettings?.principalSignature;
  const schoolStamp = tenant?.branding?.schoolStamp || schoolSettings?.schoolStamp;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
      {/* Remarks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {/* Class Teacher Remark */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.65rem', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
            Class Teacher's Remark
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.45 }}>
            "{teacherRemarks}"
          </div>
        </div>

        {/* Principal/Head Teacher Remark */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.65rem', backgroundColor: '#ffffff' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
            Principal's Remark & Comment
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.45 }}>
            "{principalRemarks}"
          </div>
        </div>

        {/* Supervisor Remark (Optional) */}
        {showSupervisorRemarks && supervisorRemarks && (
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.65rem', backgroundColor: '#ffffff', gridColumn: 'span 2' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
              Supervisor's / Tahfeez Coordinator's Remarks
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.45 }}>
              "{supervisorRemarks}"
            </div>
          </div>
        )}
      </div>

      {/* Next Term Info Block */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '0.78rem'
      }}>
        <div>
          <span style={{ color: '#64748b', fontWeight: 500, marginRight: '0.25rem' }}>Next Term Resumes:</span>
          <strong style={{ color: '#334155' }}>{nextTermBegins}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', fontWeight: 500, marginRight: '0.25rem' }}>Next Term Fees:</span>
          <strong style={{ color: '#334155' }}>{nextTermFees}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', fontWeight: 500, marginRight: '0.25rem' }}>Date Issued:</span>
          <strong style={{ color: '#334155' }}>{dateIssued}</strong>
        </div>
      </div>

      {/* Signatures & Stamp area */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        paddingTop: '1.25rem', 
        marginTop: '0.5rem',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        {/* Class Teacher Signature */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
          <div style={{ height: '36px', borderBottom: '1px solid #94a3b8', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Blank or sign line */}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>
            Class Teacher's Sign
          </span>
        </div>

        {/* School Stamp Area (Middle) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
          {schoolStamp ? (
            <img src={schoolStamp} alt="School Stamp" style={{ height: '48px', objectFit: 'contain', opacity: 0.8 }} />
          ) : (
            <div style={{ height: '48px', width: '48px', borderRadius: '50%', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
              STAMP
            </div>
          )}
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>
            School Stamp
          </span>
        </div>

        {/* Principal Signature */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
          <div style={{ height: '36px', borderBottom: '1px solid #94a3b8', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {principalSig ? (
              <img src={principalSig} alt="Principal Signature" style={{ maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontStyle: 'italic' }}>Approved Online</span>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>
            Principal's Sign
          </span>
        </div>
      </div>
    </div>
  );
};
