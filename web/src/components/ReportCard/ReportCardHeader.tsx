import React from 'react';
import { Shield } from 'lucide-react';

interface ReportCardHeaderProps {
  schoolSettings: any;
  tenant: any;
  result: any;
  student: any;
}

export const ReportCardHeader: React.FC<ReportCardHeaderProps> = ({
  schoolSettings,
  tenant,
  result,
  student,
}) => {
  const logo = tenant?.branding?.logo || schoolSettings?.logo || '/logo.png';
  const schoolName = tenant?.name || schoolSettings?.schoolName || 'SMART SCHOOL';
  const schoolNameArabic = tenant?.nameArabic || schoolSettings?.schoolNameArabic || '';
  const motto = tenant?.subHeader || schoolSettings?.motto || 'Learn Today, Lead Tomorrow';
  const address = tenant?.contact?.address || schoolSettings?.address || 'School Location Address';
  const phone = tenant?.contact?.phone || tenant?.contact?.phoneNumbers || schoolSettings?.phoneNumbers || '';
  const email = tenant?.contact?.email || schoolSettings?.email || '';
  const website = tenant?.contact?.website || schoolSettings?.website || '';

  const term = result?.term || schoolSettings?.currentTerm || '';
  const session = result?.academicYear || schoolSettings?.currentAcademicYear || '';

  // Arabic label check: show Arabic only for Islamic / Tahfeez / Hybrid schools (when result has Islamic/Tahfeez subjects)
  const allSubjects = result?.subjects || [];
  const hasIslamicOrTahfeez = allSubjects.some(
    (s: any) => s.section === 'islamic' || s.section === 'tahfeezh'
  );

  const headerColor = '#1e3a8a'; // Dark Blue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '2px solid #cbd5e1', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
        {/* School Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px' }}>
          {logo ? (
            <img 
              src={logo} 
              alt="School Logo" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
              <Shield size={36} />
            </div>
          )}
        </div>

        {/* Center Details */}
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {hasIslamicOrTahfeez && schoolNameArabic && (
            <h2 style={{ fontFamily: 'Amiri, Cairo, serif', fontSize: '1.5rem', fontWeight: 'bold', color: headerColor, margin: 0, direction: 'rtl' }}>
              {schoolNameArabic}
            </h2>
          )}
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: headerColor, letterSpacing: '0.05em', margin: '0 0 4px 0', textTransform: 'uppercase', lineHeight: 1.1 }}>
            {schoolName}
          </h1>
          <p style={{ fontSize: '0.95rem', color: headerColor, margin: '2px 0 0 0', lineHeight: 1.3, fontWeight: 500, opacity: 0.9 }}>
            {address}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', fontSize: '0.9rem', color: headerColor, marginTop: '4px', fontWeight: 500, opacity: 0.9 }}>
            {phone && <span><strong>Tel:</strong> {phone}</span>}
            {email && <span><strong>Email:</strong> {email}</span>}
            {website && <span><strong>Web:</strong> {website}</span>}
          </div>
          
          <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              Session: {session}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              Term: {term}
            </span>
          </div>
        </div>

        {/* Student Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '80px', height: '96px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {student?.picture ? (
              <img 
                src={student.picture} 
                alt="Student Passport" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>PASSPORT</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary, #0f172a)', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>
          {hasIslamicOrTahfeez ? "Student's Academic & Moral Performance Report" : "Student's Performance Report Card"}
        </h3>
      </div>
    </div>
  );
};
