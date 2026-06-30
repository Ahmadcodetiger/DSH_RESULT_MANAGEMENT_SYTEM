import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, Check, Award, RefreshCw, AlertTriangle, Layers, FileText } from 'lucide-react';
import api from '../services/api';

interface InvoiceReceipt {
  invoiceId: string;
  amount: number;
  paidAt: string;
  receiptUrl: string;
  gatewayRef: string;
}

interface BillingStats {
  tenantName: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';
  currentPeriodEnd: string | null;
  limits: {
    maxStudents: number;
    maxTeachers: number;
    maxAdmins: number;
    maxStorageMB: number;
    maxAiCallsPerMonth: number;
  };
  usage: {
    studentsCount: number;
    teachersCount: number;
    adminsCount: number;
    storageUsedMB: number;
    aiCallsThisMonth: number;
  };
  invoices: InvoiceReceipt[];
}

export const BillingPortalView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BillingStats | null>(null);

  // Checkout Upgrade states
  const [targetPlan, setTargetPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchBillingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/billing/portal');
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load billing portal details:', err);
      setError(err.response?.data?.message || 'Failed to query billing credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingDetails();
  }, []);

  const handleCheckoutInit = async () => {
    try {
      setCheckoutLoading(true);
      const res = await api.post('/billing/subscribe/initialize', {
        planId: targetPlan,
        billingCycle
      });
      if (res.data?.checkoutUrl) {
        // Redirect to paymentpoint checkout url
        window.open(res.data.checkoutUrl, '_blank');
      } else {
        alert('Could not initialize checkout. Missing redirect target.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initialize subscription checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Querying subscription portal metrics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--error)' }}>
        <AlertTriangle size={36} style={{ margin: '0 auto 1rem' }} />
        <h4>Billing Portal Offline</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{error}</p>
        <button onClick={fetchBillingDetails} className="nav-button-action" style={{ marginTop: '1rem' }}>
          Retry Connection
        </button>
      </div>
    );
  }

  // Helper values
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'var(--success-glow)', text: 'var(--success)' };
      case 'trial': return { bg: 'var(--primary-glow)', text: 'var(--primary)' };
      case 'suspended': return { bg: 'var(--error-glow)', text: 'var(--error)' };
      default: return { bg: 'var(--warning-glow)', text: 'var(--warning)' };
    }
  };

  const statusStyle = getStatusBadgeColor(stats.status);

  // Meter helper
  const renderMeter = (label: string, current: number, limit: number, unit = '') => {
    const pct = Math.min(100, Math.round((current / limit) * 100));
    const isClose = pct >= 85;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
          <span>{label}</span>
          <span style={{ color: isClose ? 'var(--error)' : 'inherit' }}>{current} / {limit} {unit} ({pct}%)</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-base)', borderRadius: '99px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: isClose ? 'var(--error)' : 'var(--primary)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Active Subscription Status Grid */}
      <div className="grid-cols-2">
        
        {/* Profile details */}
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Layers size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Subscription Plan</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Current Tier:</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>{stats.planName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Status:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '99px', background: statusStyle.bg, color: statusStyle.text, textTransform: 'uppercase' }}>
                {stats.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Current Period Ends:</span>
              <strong style={{ fontSize: '0.9rem' }}>
                {stats.currentPeriodEnd ? new Date(stats.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Lifetime Trial'}
              </strong>
            </div>
          </div>
        </div>

        {/* Plan Limits Meter */}
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <CreditCard size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Limits & Usage</h3>
          </div>

          {renderMeter('Students Scoped Registry', stats.usage.studentsCount, stats.limits.maxStudents)}
          {renderMeter('Teachers Assigned Accounts', stats.usage.teachersCount, stats.limits.maxTeachers)}
          {renderMeter('AI remark / brief calls', stats.usage.aiCallsThisMonth, stats.limits.maxAiCallsPerMonth, 'calls')}
        </div>

      </div>

      {/* Subscription Upgrade Checkout Form */}
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Shield size={22} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Upgrade Plan / Renew Subscription</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Provision new capabilities instantly. All subscription transactions are handled safely via PaymentPoint checkouts.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Select Target Plan</label>
            <select 
              value={targetPlan}
              onChange={(e) => setTargetPlan(e.target.value as any)}
              style={{ minWidth: '200px' }}
            >
              <option value="starter">Starter Plan (N20,000/mo)</option>
              <option value="professional">Professional Plan (N50,000/mo)</option>
              <option value="enterprise">Enterprise Plan (N100,000/mo)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Select Billing Cycle</label>
            <select 
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as any)}
              style={{ minWidth: '200px' }}
            >
              <option value="monthly">Monthly Cycle</option>
              <option value="yearly">Yearly Cycle (2 Months Free!)</option>
            </select>
          </div>

          <button 
            onClick={handleCheckoutInit}
            disabled={checkoutLoading}
            className="nav-login-btn"
            style={{ alignSelf: 'flex-end', height: '42px', padding: '0 2rem' }}
          >
            {checkoutLoading ? 'Preparing Gateway...' : 'Initialize Upgrade Checkout'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
            <Check size={14} />
            <span>Enterprise custom domains & white-labels requires Enterprise Plan subscription.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
            <Check size={14} />
            <span>Dynamic styling custom colors will auto-update in real-time. No code recompiles required.</span>
          </div>
        </div>
      </div>

      {/* Invoice Records Log */}
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <FileText size={22} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Billing History & Receipts</h3>
        </div>

        {stats.invoices && stats.invoices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2.5px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <th style={{ padding: '0.75rem' }}>Invoice ID</th>
                  <th style={{ padding: '0.75rem' }}>Amount Paid</th>
                  <th style={{ padding: '0.75rem' }}>Payment Date</th>
                  <th style={{ padding: '0.75rem' }}>Reference Code</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.invoices.map((inv) => (
                  <tr key={inv.invoiceId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 'bold' }}>{inv.invoiceId}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>₦{inv.amount.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{new Date(inv.paidAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{inv.gatewayRef}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <a 
                        href={inv.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="nav-button-action" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }}
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem' }}>
            No prior invoices found. Upgrade or renew to log your first payment receipt.
          </p>
        )}
      </div>

    </div>
  );
};
