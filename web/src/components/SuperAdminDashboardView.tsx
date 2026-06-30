import React, { useState, useEffect } from 'react';
import { Layers, Users, TrendingUp, RefreshCw, AlertTriangle, Monitor, LogOut, Sun, Moon, Calendar, ExternalLink } from 'lucide-react';
import api from '../services/api';

interface SchoolTenant {
  id: string;
  name: string;
  slug: string;
  planName: string;
  planId: string;
  billingCycle: string;
  studentCount: number;
  status: 'active' | 'suspended' | 'trial';
  customDomain: string;
  createdAt: string;
}

interface PlatformMetrics {
  totalSchools: number;
  activeSubscriptions: number;
  mrr: number;
  totalStudentsAllTime: number;
}

interface SuperAdminDashboardViewProps {
  currentUser: any;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const SuperAdminDashboardView: React.FC<SuperAdminDashboardViewProps> = ({
  currentUser,
  onLogout,
  theme = 'light',
  onToggleTheme
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [schools, setSchools] = useState<SchoolTenant[]>([]);
  const [overrideSlug, setOverrideSlug] = useState('');

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/platform/admin/dashboard');
      if (res.data) {
        setMetrics(res.data.metrics);
        setSchools(res.data.schools || []);
      }
    } catch (err: any) {
      console.error('Failed to load platform dashboard details:', err);
      setError(err.response?.data?.message || 'Failed to query platform administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleLaunchImpersonation = (slug: string) => {
    if (!slug) return;
    localStorage.setItem('huffaz_tenant_override', slug);
    alert(`Impersonation mode activated for: ${slug}. Page will reload to mock the resolved tenant workspace.`);
    window.location.reload();
  };

  const handleClearImpersonation = () => {
    localStorage.removeItem('huffaz_tenant_override');
    alert('Impersonation override cleared. Page will reload.');
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Querying SaaS platform central metrics...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)', padding: '2rem' }}>
        <div className="glass" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: '450px', border: '1px solid var(--border)' }}>
          <AlertTriangle size={44} style={{ margin: '0 auto 1.25rem', color: 'var(--error)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Platform Dashboard Offline</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button onClick={fetchPlatformData} className="nav-login-btn" style={{ padding: '0.5rem 1.5rem' }}>
              Retry Connection
            </button>
            <button onClick={onLogout} className="nav-button-action" style={{ padding: '0.5rem 1.5rem' }}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeOverride = localStorage.getItem('huffaz_tenant_override');

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-sans)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Platform Header */}
      <header className="mobile-admin-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>SS</div>
          <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '-0.2px' }}>SmartSchool Africa Operator Panel</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            className="theme-toggle-btn" 
            onClick={onToggleTheme} 
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            style={{ padding: '0.4rem', border: '1.5px solid var(--border)' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          
          <div style={{ fontSize: '0.85rem', textAlign: 'right' }}>
            <strong style={{ display: 'block' }}>{currentUser.name}</strong>
            <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold' }}>SUPER ADMINISTRATOR</span>
          </div>

          <button className="nav-logout-btn" onClick={onLogout} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
            <LogOut size={14} style={{ marginRight: '0.4rem' }} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Admin Grid */}
      <main className="container" style={{ padding: '3rem 1.5rem', flex: 1 }}>
        
        {/* Impersonation active banner */}
        {activeOverride && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--warning-glow)', border: '1px solid var(--warning)', color: 'var(--warning-dark)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <span>⚠️ Impersonation override mode is active for: "{activeOverride}". Standard localhost workspace routing is bypassed.</span>
            <button onClick={handleClearImpersonation} className="nav-button-action" style={{ background: '#fff', border: '1px solid var(--warning)', padding: '0.25rem 1rem', fontSize: '0.8rem' }}>
              Clear Override
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Monitor size={24} style={{ color: '#8b5cf6' }} />
              Central Platform Operations Dashboard
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aggregate SaaS metrics, tenant allocations, and server diagnostics.</p>
          </div>
          <button onClick={fetchPlatformData} className="nav-button-action" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> Sync Metrics
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>MONTHLY RECURRING REVENUE</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.25rem 0', color: 'var(--primary)' }}>₦{metrics.mrr.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normalized active plans billing</div>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ONBOARDED SCHOOLS</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.25rem 0' }}>{metrics.totalSchools} Tenants</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered workspaces</div>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>PAID SUBSCRIPTIONS</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.25rem 0', color: 'var(--primary-dark)' }}>{metrics.activeSubscriptions} Paid</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Excludes free pilot trials</div>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL STUDENTS ROLL</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.25rem 0' }}>{metrics.totalStudentsAllTime.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across all scoped databases</div>
          </div>
        </div>

        {/* Impersonation Quick Search */}
        <div className="glass" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={18} style={{ color: '#8b5cf6' }} />
            Tenant Impersonation Overrides
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Bypass standard domain/subdomain checks to audit or test a specific school's dashboard environment locally.
          </p>
          <div style={{ display: 'flex', gap: '1rem', maxWidth: '500px' }}>
            <select 
              value={overrideSlug}
              onChange={(e) => setOverrideSlug(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">-- Choose School Tenant Workspace --</option>
              {schools.map(s => (
                <option key={s.id} value={s.slug}>{s.name} ({s.slug}.smartschool.africa)</option>
              ))}
            </select>
            <button 
              onClick={() => handleLaunchImpersonation(overrideSlug)}
              disabled={!overrideSlug}
              className="nav-login-btn"
              style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0 1.5rem', height: '42px' }}
            >
              Launch Impersonation
            </button>
          </div>
        </div>

        {/* Onboarded Tenant Schools List Table */}
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Registered Tenant Workspaces</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>Workspace Subdomain</th>
                  <th>Plan Tier</th>
                  <th>Billing Cycle</th>
                  <th>Student Size</th>
                  <th>Tenant status</th>
                  <th>Custom Domain</th>
                  <th>Onboard Date</th>
                  <th>Operator Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td style={{ fontWeight: 'bold' }}>{school.name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{school.slug}.smartschool.africa</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '4px', background: school.planId === 'enterprise' ? '#f3e8ff' : school.planId === 'professional' ? '#fef3c7' : 'var(--bg-base)', color: school.planId === 'enterprise' ? '#6b21a8' : school.planId === 'professional' ? '#92400e' : 'inherit' }}>
                        {school.planName}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{school.billingCycle}</td>
                    <td style={{ fontWeight: 'bold' }}>{school.studentCount} students</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.6rem', borderRadius: '99px', background: school.status === 'active' ? 'var(--success-glow)' : 'var(--error-glow)', color: school.status === 'active' ? 'var(--success)' : 'var(--error)' }}>
                        {school.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {school.customDomain !== 'Not configured' ? (
                        <a href={`http://${school.customDomain}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {school.customDomain} <ExternalLink size={12} />
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(school.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => handleLaunchImpersonation(school.slug)}
                        className="nav-button-action" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Impersonate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

    </div>
  );
};
