import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck, Calendar, BookOpen, GraduationCap, Coins } from 'lucide-react';

interface ResultVerificationViewProps {
  resultId: string;
  schoolSettings: any;
  theme: string;
  onToggleTheme: () => void;
  onClose: () => void;
}

export const ResultVerificationView: React.FC<ResultVerificationViewProps> = ({
  resultId,
  schoolSettings,
  theme,
  onToggleTheme,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const primaryColor = schoolSettings?.branding?.primaryColor || '#800020'; // Maroon
  const secondaryColor = schoolSettings?.branding?.secondaryColor || '#4169E1'; // Royal Blue

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/public/results/${resultId}/verify`);
        if (res.data && res.data.verified) {
          setData(res.data.result);
        } else {
          setError('Could not verify this result record.');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.response?.data?.message || 'Invalid or expired verification link.');
      } finally {
        setLoading(false);
      }
    };

    if (resultId) {
      fetchVerification();
    }
  }, [resultId]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
      color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      {/* Navigation Header */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: primaryColor,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <ArrowLeft size={16} /> Portal Home
        </button>

        <button
          onClick={onToggleTheme}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            border: `1.5px solid ${theme === 'dark' ? '#334155' : '#cbd5e1'}`,
            background: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            cursor: 'pointer'
          }}
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        borderRadius: '16px',
        border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
        boxShadow: theme === 'dark' ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Decorative Border */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
        }} />

        {loading ? (
          <div style={{ padding: '3rem 0' }}>
            <div style={{
              width: '45px',
              height: '45px',
              border: `3px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
              borderTopColor: primaryColor,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <span style={{ fontSize: '0.95rem', color: theme === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
              Authenticating academic record...
            </span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#ef4444'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', marginBottom: '0.75rem' }}>
              Verification Failed
            </h2>
            <p style={{ fontSize: '0.9rem', color: theme === 'dark' ? '#94a3b8' : '#64748b', lineHeight: 1.5, maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              {error}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: primaryColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: `0 4px 10px ${primaryColor}40`
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div>
            {/* Verification Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: theme === 'dark' ? `${secondaryColor}15` : `${secondaryColor}0a`,
              borderRadius: '30px',
              border: `1.5px solid ${secondaryColor}30`,
              color: secondaryColor,
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '1.5rem'
            }}>
              <ShieldCheck size={16} /> Verified Academic Record
            </div>

            {/* School Title */}
            <h1 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: theme === 'dark' ? '#ffffff' : '#0f172a',
              marginBottom: '0.25rem',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase'
            }}>
              {schoolSettings?.schoolName || 'AL-QALAM ACADEMY'}
            </h1>
            <p style={{
              fontSize: '0.75rem',
              color: theme === 'dark' ? '#94a3b8' : '#64748b',
              marginBottom: '2rem',
              fontWeight: 500
            }}>
              Official Result Authentication Service
            </p>

            {/* Student Profile Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '1.25rem',
              backgroundColor: theme === 'dark' ? '#131e30' : '#f8fafc',
              borderRadius: '12px',
              border: `1px solid ${theme === 'dark' ? '#2d3d52' : '#e2e8f0'}`,
              textAlign: 'left',
              marginBottom: '1.25rem'
            }}>
              {data.picture ? (
                <img
                  src={data.picture}
                  alt={data.studentName}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: `2px solid ${secondaryColor}`
                  }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  backgroundColor: `${primaryColor}1a`,
                  color: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  border: `2px solid ${primaryColor}40`
                }}>
                  {data.studentName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              )}

              <div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: theme === 'dark' ? '#ffffff' : '#0f172a',
                  marginBottom: '0.25rem'
                }}>
                  {data.studentName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Admission Number: <strong style={{ color: theme === 'dark' ? '#e2e8f0' : '#334155' }}>{data.admissionNumber}</strong>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Class Level: <strong style={{ color: theme === 'dark' ? '#e2e8f0' : '#334155' }}>{data.level} ({data.section})</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {/* Term & Session */}
              <div style={{
                padding: '1rem',
                backgroundColor: theme === 'dark' ? '#131e30' : '#f8fafc',
                borderRadius: '10px',
                border: `1px solid ${theme === 'dark' ? '#2d3d52' : '#e2e8f0'}`,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: primaryColor, marginBottom: '0.4rem' }}>
                  <Calendar size={14} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Academic Term</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{data.term}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>{data.academicYear} Session</div>
              </div>

              {/* General Performance */}
              <div style={{
                padding: '1rem',
                backgroundColor: theme === 'dark' ? '#131e30' : '#f8fafc',
                borderRadius: '10px',
                border: `1px solid ${theme === 'dark' ? '#2d3d52' : '#e2e8f0'}`,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: secondaryColor, marginBottom: '0.4rem' }}>
                  <GraduationCap size={14} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Performance</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{data.finalAverage?.toFixed(2)}% Average</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>Grade Rating: <strong>{data.generalGrade}</strong></div>
              </div>
            </div>

            {/* Verification Footer Text */}
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              backgroundColor: theme === 'dark' ? '#0f172a' : '#fafbfa',
              border: `1px dashed ${theme === 'dark' ? '#2d3d52' : '#cbd5e1'}`,
              fontSize: '0.72rem',
              lineHeight: 1.5,
              color: theme === 'dark' ? '#94a3b8' : '#64748b',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              This digital record has been dynamically authenticated from the official smart portal database. The student's academic standing shown here matches the records approved on <strong>{data.dateIssued}</strong>.
            </div>

            {/* Checkmark Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#22c55e',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={18} /> Authenticity Guaranteed
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
