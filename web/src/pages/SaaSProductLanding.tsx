import React, { useState } from 'react';
import { 
  Shield, Check, Award, Brain, CreditCard, Sparkles, 
  ArrowRight, Users, Layout, Database, CheckCircle, 
  HelpCircle, ChevronDown, Monitor, RefreshCw, X, Gift,
  Moon, Sun, Menu
} from 'lucide-react';
import api from '../services/api';

interface SaaSProductLandingProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSaaSLogin?: () => void;
}

export const SaaSProductLanding: React.FC<SaaSProductLandingProps> = ({
  theme = 'light',
  onToggleTheme,
  onSaaSLogin
}) => {
  // Calculator States
  const [studentCount, setStudentCount] = useState<number>(250);
  const [isYearly, setIsYearly] = useState<boolean>(true);
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Registration Form States
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<'secular' | 'islamic'>('secular');
  const [schoolNameArabic, setSchoolNameArabic] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSchoolName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  // Pricing math:
  // Starter: up to 200 students. Monthly: N20,000, Yearly: N200,000
  // Professional: up to 500 students. Monthly: N50,000, Yearly: N500,000
  // Enterprise: 501+ students. Monthly: N100,000 - N250,000
  const getRecommendedPlan = () => {
    if (studentCount <= 200) {
      return {
        id: 'starter',
        name: 'Starter Tier',
        price: isYearly ? '₦200,000' : '₦20,000',
        period: isYearly ? '/year' : '/month',
        savings: isYearly ? 'Save ₦40,000 (2 Months Free!)' : '',
        badge: 'Perfect for new academies',
        color: 'var(--primary)',
        features: [
          'Up to 200 Students',
          'Up to 15 Teachers & Staff',
          'Comprehensive Result Sheet Generator',
          'Customizable Grading Scales',
          'Student Academic Progress Tracker',
          'Parent & Teacher Basic Portals',
          'Standard PDF Performance Reports',
          'Email Support (48h response)'
        ]
      };
    } else if (studentCount <= 500) {
      return {
        id: 'professional',
        name: 'Professional Tier',
        price: isYearly ? '₦500,000' : '₦50,000',
        period: isYearly ? '/year' : '/month',
        savings: isYearly ? 'Save ₦100,000 (2 Months Free!)' : '',
        badge: 'Recommended for growing schools',
        color: '#d4af37',
        features: [
          'Up to 500 Students',
          'Up to 50 Teachers & Staff',
          'Everything in Starter + Finance Module',
          'AI-Powered Automatic Teacher Remarks',
          'AI-Powered Principal Executive Briefs',
          'Expense & General Ledger Auditing',
          'Automated Payroll & Payslip Dispatch',
          'Priority Support (24h response)'
        ]
      };
    } else {
      return {
        id: 'enterprise',
        name: 'Enterprise Tier',
        price: 'Custom',
        period: '',
        savings: 'Best value for school groups',
        badge: 'Unlimited Power & Scale',
        color: '#8b5cf6',
        features: [
          'Unlimited Students & Teachers',
          'Multi-Campus Central Management',
          'White-Label Branding (Remove "Powered by")',
          'Custom Domains (e.g. portal.yourschool.com)',
          'AI Performance Decline & Absenteeism Alerts',
          'WhatsApp & SMS Automated Channels',
          'API Access & Direct Integrations',
          'Dedicated Success Manager (4h SLA)'
        ]
      };
    }
  };

  const plan = getRecommendedPlan();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setRegLoading(true);

    try {
      const res = await api.post('/auth/register-school', {
        schoolName,
        schoolNameArabic: schoolType === 'islamic' ? schoolNameArabic : '',
        slug,
        adminEmail,
        adminUsername,
        adminPassword,
        adminName: 'School Administrator',
        planId: plan.id,
        curriculumType: schoolType === 'islamic' ? 'dual' : 'conventional'
      });

      if (res.data) {
        setRegSuccess(`School onboarded successfully! Loading your portal...`);
        setTimeout(() => {
          // Redirect to subdomain portal, or query param override on localhost
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.location.href = `${window.location.protocol}//${window.location.host}/?tenant=${slug}`;
          } else {
            window.location.href = `${window.location.protocol}//${slug}.${window.location.host}`;
          }
        }, 2500);
      }
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Failed to onboard school. Please try a different name or slug.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="saas-landing-root" style={{ background: 'var(--bg-base)', minHeight: '100vh', fontFamily: 'var(--font-sans)', color: 'var(--text-main)' }}>
      
      {/* Dynamic Glassmorphic Nav Header */}
      <header className="nav-header">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="nav-logo-circle" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', boxShadow: '0 4px 12px var(--primary-glow)', borderRadius: '12px' }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h1 className="nav-header-title" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em', fontWeight: '800' }}>
                SMARTSCHOOL<span style={{ color: 'var(--primary)', marginLeft: '4px' }}>AFRICA</span>
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {onToggleTheme && (
              <button 
                className="theme-toggle-btn mobile-theme-toggle" 
                onClick={onToggleTheme} 
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}

            <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle navigation menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className={`nav-actions ${isMenuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', textDecoration: 'none' }}>
              Features
            </a>
            <a href="#calculator" onClick={() => setIsMenuOpen(false)} style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', textDecoration: 'none' }}>
              Pricing Calculator
            </a>

            {onToggleTheme && (
              <button 
                className="theme-toggle-btn desktop-theme-toggle" 
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}

            <button className="nav-login-btn" onClick={() => { setRegisterModalOpen(true); setIsMenuOpen(false); }}>
              Launch Free Trial <ArrowRight size={14} style={{ marginLeft: '0.4rem' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="saas-hero" style={{ textAlign: 'center', padding: '6rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Glow Spheres */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1.5px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
            <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
            <span>SmartSchool Africa — Re-engineered for World-Class Standards</span>
          </div>
          
          <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '800', lineHeight: 1.1, color: 'var(--text-main)', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            The Ultimate Multi-Tenant <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SaaS Portal</span> for Modern Academies
          </h2>
          
          <p style={{ maxWidth: '800px', margin: '0 auto 2.5rem', fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Unleash robust multi-school scaling, isolated high-performance databases, customizable grading scales, student progress trackers, and AI remark generators. Empower your school within minutes.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <button className="nav-login-btn" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }} onClick={() => setRegisterModalOpen(true)}>
              Register Your School Now <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
            <a href="#calculator" className="nav-button-action" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center' }}>
              Estimate Monthly Costs
            </a>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', padding: '2rem 1.5rem' }}>
        <div className="container grid-cols-4" style={{ textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>99.99%</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Uptime Guarantee SLA</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>100+</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Active Schools Onboarded</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>50k+</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Active Students & Families</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>₦0</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Setup Cost for Pilot Phase</div>
          </div>
        </div>
      </section>

      {/* Dynamic Feature Explorer */}
      <section className="container" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h3 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '1rem' }}>Engineered for Institutional Excellence</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>Explore the enterprise capabilities driving the success of Africa's leading school networks.</p>
        </div>

        <div className="grid-cols-3">
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Database size={24} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Rigid Multi-Tenant Isolation</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Strict database document isolation with scoped identifiers guarantees that school information, grades, finances, and settings never bleed across boundaries.
            </p>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Brain size={24} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>AI-Powered Evaluation</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Generate comprehensive, student-specific remarks for report sheets and executive briefings for directors in a single click using secure, rate-limited Large Language Models.
            </p>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CreditCard size={24} />
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Fintech Webhooks via PaymentPoint</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Receive instant updates and handle automatic renewal upgrades safely with signature checks preventing client-side billing spoofing.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing & Slide Cost Calculator */}
      <section id="calculator" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6rem 1.5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h3 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '1rem' }}>Interactive Plan Estimator</h3>
            <p style={{ color: 'var(--text-muted)' }}>Slide to select your student count and calculate exact billing costs transparently.</p>
          </div>

          <div className="grid-cols-2" style={{ alignItems: 'center', gap: '3rem' }}>
            
            {/* Calculator Control Panel */}
            <div className="glass" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>School Size Configuration</h4>
              
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  <span>Active Students:</span>
                  <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{studentCount} Students</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="1000" 
                  step="10" 
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value))}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>20 Students</span>
                  <span>500 (Pro Limit)</span>
                  <span>1000+ Students</span>
                </div>
              </div>

              {/* Cycle Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block' }}>Billing Cycle</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Annual for 2 Months Free</span>
                </div>
                <div style={{ display: 'flex', background: 'var(--bg-base)', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => setIsYearly(false)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '600', borderRadius: '4px', background: !isYearly ? 'var(--bg-card)' : 'transparent', boxShadow: !isYearly ? 'var(--shadow-sm)' : 'none' }}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setIsYearly(true)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '600', borderRadius: '4px', background: isYearly ? 'var(--bg-card)' : 'transparent', boxShadow: isYearly ? 'var(--shadow-sm)' : 'none', color: isYearly ? 'var(--primary)' : 'inherit' }}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              {isYearly && (
                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-glow)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--primary-dark)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  <Gift size={16} />
                  <span>Annual Subscription Discount Automatically Applied!</span>
                </div>
              )}
            </div>

            {/* Plan Display Card */}
            <div className="glass animate-scale-in" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${plan.color}`, position: 'relative' }}>
              <span style={{ position: 'absolute', top: '-14px', left: '24px', background: plan.color, color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '99px', boxShadow: 'var(--shadow-sm)' }}>
                RECOMMENDED PLAN
              </span>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{plan.name}</h4>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{plan.period}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: plan.color, fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {plan.badge} {plan.savings && `• ${plan.savings}`}
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }} />

              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.925rem' }}>
                    <Check size={16} style={{ color: 'var(--success)' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button 
                className="nav-login-btn" 
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', background: plan.color, borderColor: plan.color }}
                onClick={() => setRegisterModalOpen(true)}
              >
                Provision Free 14-Day Trial
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="nav-header" style={{ borderBottom: 'none', borderTop: '2px solid var(--border)', background: 'var(--bg-card)', padding: '3rem 1.5rem' }}>
        <div className="container flex-between" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p>© 2026 SmartSchool Africa (smartschool.africa). Built for schools in Nigeria & Africa.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#features">Privacy Policy</a>
            <a href="#pricing">Terms of Service</a>
            <a href="#support">Enterprise SLA</a>
          </div>
        </div>
      </footer>

      {/* Onboarding Register Wizard Modal */}
      {registerModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass animate-scale-in onboarding-modal-card" style={{ width: '100%', maxWidth: '520px', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--shadow-xl)', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            
            <button 
              onClick={() => setRegisterModalOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Monitor size={22} style={{ color: 'var(--primary)' }} />
              Register Your School Portal
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Create your tenant workspace. It takes less than a minute to generate your branded dual-curriculum portal.
            </p>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {regError && <div style={{ background: 'var(--error-glow)', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 'bold' }}>{regError}</div>}
              {regSuccess && <div style={{ background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 'bold' }}>{regSuccess}</div>}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>School Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Greenfield Academy"
                  value={schoolName}
                  onChange={handleNameChange}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>School Curriculum Profile</label>
                <select 
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value as 'secular' | 'islamic')}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                >
                  <option value="secular">Standard Secular Curriculum</option>
                  <option value="islamic">Islamic / Tahfeez Dual-Curriculum</option>
                </select>
              </div>

              {schoolType === 'islamic' && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>School Name (Arabic Version)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. دار الحكمة"
                    value={schoolNameArabic}
                    onChange={(e) => setSchoolNameArabic(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Subdomain Workspace URL</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', paddingRight: '1rem' }}>
                  <input 
                    type="text" 
                    required
                    placeholder="darul-hikmah"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', flexShrink: 0 }}>.smartschool.africa</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)' }} />

              <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary)' }}>Administrator Account Setup</h4>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Admin Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="admin@school.edu.ng"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Username</label>
                  <input 
                    type="text" 
                    required
                    placeholder="admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Password</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={regLoading}
                className="nav-login-btn"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                {regLoading ? 'Provisioning Assets...' : 'Initialize Onboarding Wizard'}
              </button>
            </form>

          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .saas-landing-root .nav-container {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 0.75rem 1rem !important;
          }
          .saas-landing-root .nav-brand {
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            max-width: 60% !important;
          }
          .saas-landing-root .nav-header-title {
            font-size: 0.9rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 160px !important;
          }
          .saas-landing-root .saas-hero {
            padding: 3rem 1rem 2rem !important;
          }
          .saas-landing-root .saas-hero h2 {
            font-size: 1.75rem !important;
            line-height: 1.25 !important;
            margin-bottom: 1rem !important;
          }
          .saas-landing-root .saas-hero p {
            font-size: 0.95rem !important;
            line-height: 1.5 !important;
            margin-bottom: 1.5rem !important;
          }
          .saas-landing-root .saas-hero button,
          .saas-landing-root .saas-hero a {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
            font-size: 0.95rem !important;
            border-radius: 12px !important;
          }
          .saas-landing-root .grid-cols-4,
          .saas-landing-root .grid-cols-3,
          .saas-landing-root .grid-cols-2 {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
          .saas-landing-root .glass {
            padding: 1.5rem 1.25rem !important;
            border-radius: 16px !important;
          }
          /* Onboarding modal overrides */
          .onboarding-modal-card {
            padding: 1.5rem 1.25rem !important;
            width: 92% !important;
            border-radius: 20px !important;
            max-height: 90vh !important;
          }
          .onboarding-modal-card form {
            gap: 0.85rem !important;
          }
          .onboarding-modal-card h3 {
            font-size: 1.25rem !important;
          }
          .onboarding-modal-card .grid-cols-2 {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
        }

        @media (max-width: 480px) {
          .saas-landing-root .nav-header-title {
            max-width: 120px !important;
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  );
};
