import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, DollarSign, Brain, FileText, Check, X, 
  Lock, Bell, LogOut, ArrowRight, Download, Award, TrendingUp, Info, Menu, Calendar,
  Sun, Moon, CreditCard
} from 'lucide-react';
import api, { authService, BASE_URL } from './services/api';
import { SURAHS } from './utils/surahs';
import AdminDashboardView from './components/AdminDashboardView';

// --- TYPES ---
interface User {
  _id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'PARENT' | 'ACCOUNTANT' | 'DIRECTOR';
  assignedClasses?: { level: string; section: string }[];
}

interface Student {
  _id: string;
  admissionNumber: string;
  name: string;
  level: string;
  section: string;
  academicYear: string;
  parentPin: string;
  hasResult?: boolean;
  schoolFees?: number;
}

interface SubjectGrade {
  subjectName: string;
  subjectNameArabic: string;
  score60: number;
  score20_1: number;
  score20_2: number;
  score100: number;
  grade: string;
  isGraded: boolean;
  section: 'tahfeezh' | 'academic';
}

interface EvaluationElement {
  elementLabel: string;
  elementLabelArabic: string;
  rating: string;
}

interface Result {
  _id: string;
  studentId: string | { _id: string; name: string; admissionNumber: string; level: string; section: string };
  academicYear: string;
  term: string;
  level: string;
  section: string;
  subjects: SubjectGrade[];
  tahfeezhDetails: {
    absenceOfHifz: number;
    daysPresent: number;
    daysAbsent: number;
    fromSurah: string;
    toSurah: string;
    memorizedPages: number;
  };
  evaluationElements: EvaluationElement[];
  totalMark: number;
  finalAverage: number;
  generalGrade: string;
  supervisorRecommendations: string;
  teacherRecommendations: string;
  headTeacherComments: string;
  teacherName: string;
  dateIssued: string;
  nextTermBegins: string;
  isApproved: boolean;
}

interface Invoice {
  _id: string;
  studentId: { _id: string; name: string; admissionNumber: string };
  amount: number;
  paidAmount: number;
  description: string;
  dueDate: string;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  payments: { _id?: string; amount: number; date: string; reference?: string; transactionRef?: string; method?: string }[];
  createdAt: string;
  term?: string;
  academicYear?: string;
}

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  term?: string;
  academicYear?: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  targetRole: string;
  createdBy: string;
  createdAt: string;
}

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Process markdown highlights like **bold**
    let content: React.ReactNode[] = [];
    let parts = line.split(/\*\*([^*]+)\*\*/g);
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        content.push(<strong key={i} style={{ color: 'var(--primary-dark)' }}>{parts[i]}</strong>);
      } else {
        // Also check for <u>tags</u>
        let subParts = parts[i].split(/<u>([^<]+)<\/u>/g);
        for (let j = 0; j < subParts.length; j++) {
          if (j % 2 === 1) {
            content.push(<u key={`${i}-${j}`}>{subParts[j]}</u>);
          } else {
            content.push(subParts[j]);
          }
        }
      }
    }
    
    // Check if it's a list item (starts with a bullet or number)
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
    const isNumbered = /^\d+\.\s/.test(line.trim());
    
    if (isBullet) {
      const bulletContent = line.trim().replace(/^[-*]\s*/, '');
      let bulletParts = bulletContent.split(/\*\*([^*]+)\*\*/g);
      let bulletNodes: React.ReactNode[] = [];
      for (let i = 0; i < bulletParts.length; i++) {
        if (i % 2 === 1) {
          bulletNodes.push(<strong key={i} style={{ color: 'var(--primary-dark)' }}>{bulletParts[i]}</strong>);
        } else {
          let subParts = bulletParts[i].split(/<u>([^<]+)<\/u>/g);
          for (let j = 0; j < subParts.length; j++) {
            if (j % 2 === 1) {
              bulletNodes.push(<u key={`${i}-${j}`}>{subParts[j]}</u>);
            } else {
              bulletNodes.push(subParts[j]);
            }
          }
        }
      }
      return (
        <li key={idx} style={{ marginLeft: '1.25rem', marginBottom: '0.4rem', listStyleType: 'disc' }}>
          {bulletNodes}
        </li>
      );
    }
    
    if (isNumbered) {
      const numContent = line.trim().replace(/^\d+\.\s*/, '');
      let numParts = numContent.split(/\*\*([^*]+)\*\*/g);
      let numNodes: React.ReactNode[] = [];
      for (let i = 0; i < numParts.length; i++) {
        if (i % 2 === 1) {
          numNodes.push(<strong key={i} style={{ color: 'var(--primary-dark)' }}>{numParts[i]}</strong>);
        } else {
          let subParts = numParts[i].split(/<u>([^<]+)<\/u>/g);
          for (let j = 0; j < subParts.length; j++) {
            if (j % 2 === 1) {
              numNodes.push(<u key={`${i}-${j}`}>{subParts[j]}</u>);
            } else {
              numNodes.push(subParts[j]);
            }
          }
        }
      }
      return (
        <li key={idx} style={{ marginLeft: '1.25rem', marginBottom: '0.4rem', listStyleType: 'decimal' }}>
          {numNodes}
        </li>
      );
    }
    
    return (
      <p key={idx} style={{ marginBottom: '0.6rem', minHeight: line.trim() === '' ? '0.5rem' : 'auto' }}>
        {content}
      </p>
    );
  });
};

// ==========================================
// RESULT SHEET VIEWER MODAL COMPONENT
// ==========================================
interface ResultSheetViewerModalProps {
  result: Result;
  token: string | null;
  onClose: () => void;
  student?: { name: string; admissionNumber: string } | null;
  schoolSettings: any;
}

function ResultSheetViewerModal({ result, token, onClose, student: propStudent, schoolSettings }: ResultSheetViewerModalProps) {
  const student = propStudent || 
    (typeof result.studentId === 'object' && result.studentId 
      ? result.studentId 
      : { name: 'Unknown Student', admissionNumber: '—' });

  return (
    <div style={styles.reportModalOverlay}>
      <div className="glass" style={styles.reportCardSheet}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem' }}>Result Sheet Viewer</h3>
          <div className="flex-row">
            <a 
              href={`${BASE_URL}/results/${result._id}/pdf?token=${token}`}
              target="_blank"
              rel="noreferrer"
              style={{
                ...styles.submitBtn,
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Download size={14} /> Open PDF Report
            </a>
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PREVIEW REPORT CARD SHEET */}
        <div className="report-preview-light" style={styles.cardPreviewBody}>
          {/* HEADER SECTION */}
          <div style={styles.reportSheetHeader}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{(schoolSettings?.schoolName || 'Home of Young Huffaz Academy').toUpperCase()}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-light)', fontFamily: 'var(--font-arabic)' }}>دار صغار الحفاظ</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{schoolSettings?.address || 'Abuja, Nigeria'} | Academic Term Result Assessment</div>
          </div>

          {/* STUDENT META INFO */}
          <div className="report-meta-grid">
            <div><strong>Admission No:</strong> {student.admissionNumber}</div>
            <div><strong>Student Name:</strong> {student.name}</div>
            <div><strong>Class Level:</strong> {result.level} - {result.section}</div>
            <div><strong>Term Period:</strong> {result.term}</div>
            <div><strong>Academic Year:</strong> {result.academicYear}</div>
            <div><strong>Date Issued:</strong> {result.dateIssued}</div>
          </div>

          {/* REPORT CARD DUAL GRID */}
          <div className="report-main-layout">
            {/* TAHFEEZH CURRICULUM */}
            <div style={{ flex: 1 }}>
              <h4 style={styles.reportSectionTitle}>Tahfeezh & Qur'an Assessment</h4>
              <div style={styles.tableWrapper}>
                <table style={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th style={{ width: '60px' }}>CA 1</th>
                      <th style={{ width: '60px' }}>CA 2</th>
                      <th style={{ width: '60px' }}>Exam</th>
                      <th style={{ width: '70px' }}>Total</th>
                      <th style={{ width: '50px' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.filter(s => s.section === 'tahfeezh').map(s => (
                      <tr key={s.subjectName}>
                        <td>
                          <div>{s.subjectName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-arabic)' }}>{s.subjectNameArabic}</div>
                        </td>
                        <td>{s.score20_1}</td>
                        <td>{s.score20_2}</td>
                        <td>{s.score60}</td>
                        <td style={{ fontWeight: 'bold' }}>{s.score100}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{s.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ ...styles.reportSectionTitle, marginTop: '1.5rem' }}>Tahfeezh Progress Details</h4>
              <div style={styles.tahfeezhProgressGrid}>
                <div><strong>Hifz Commenced From Surah:</strong> <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.1rem' }}>{result.tahfeezhDetails?.fromSurah || '—'}</span></div>
                <div><strong>Hifz Concluded To Surah:</strong> <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.1rem' }}>{result.tahfeezhDetails?.toSurah || '—'}</span></div>
                <div><strong>Pages Memorized This Term:</strong> {result.tahfeezhDetails?.memorizedPages || 0}</div>
                <div><strong>Absence of Hifz:</strong> {result.tahfeezhDetails?.absenceOfHifz || 0} days</div>
                <div><strong>Days Present:</strong> {result.tahfeezhDetails?.daysPresent || 0}</div>
                <div><strong>Days Absent:</strong> {result.tahfeezhDetails?.daysAbsent || 0}</div>
              </div>
            </div>

            {/* SECULAR ACADEMIC CURRICULUM */}
            <div style={{ flex: 1 }}>
              <h4 style={styles.reportSectionTitle}>Secular Academic Assessment</h4>
              <div style={styles.tableWrapper}>
                <table style={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th style={{ width: '60px' }}>CA 1</th>
                      <th style={{ width: '60px' }}>CA 2</th>
                      <th style={{ width: '60px' }}>Exam</th>
                      <th style={{ width: '70px' }}>Total</th>
                      <th style={{ width: '50px' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.filter(s => s.section === 'academic').map(s => (
                      <tr key={s.subjectName}>
                        <td>
                          <div>{s.subjectName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-arabic)' }}>{s.subjectNameArabic}</div>
                        </td>
                        <td>{s.score20_1}</td>
                        <td>{s.score20_2}</td>
                        <td>{s.score60}</td>
                        <td style={{ fontWeight: 'bold' }}>{s.score100}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{s.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ ...styles.reportSectionTitle, marginTop: '1.5rem' }}>Core Evaluations & Ratings</h4>
              <div style={styles.tableWrapper}>
                <table style={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Metric Element</th>
                      <th>Arabic</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.evaluationElements.map(el => (
                      <tr key={el.elementLabel}>
                        <td>{el.elementLabel}</td>
                        <td style={{ fontFamily: 'var(--font-arabic)', fontSize: '0.9rem' }}>{el.elementLabelArabic}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{el.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* REPORT CARD FOOTER COMMENTS */}
          <div style={styles.reportSheetFooterComments}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <strong>Teacher Recommendations:</strong> {result.teacherRecommendations}
            </div>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <strong>Supervisor Recommendations:</strong> {result.supervisorRecommendations}
            </div>
            <div>
              <strong>Head Teacher Comments:</strong> {result.headTeacherComments}
            </div>
          </div>

          {/* REPORT AGGREGATE SUMMARY */}
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
            <div>Total Mark: <strong>{result.totalMark}</strong></div>
            <div>Final Average: <strong>{result.finalAverage}%</strong></div>
            <div>General Rating Grade: <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{result.generalGrade}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Theme state & synchronization
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.documentElement.setAttribute('data-theme', theme);
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Navigation & User session states
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Public Announcements state
  const [publicNotifications, setPublicNotifications] = useState<Notification[]>([]);
  const [curriculumTab, setCurriculumTab] = useState<'tahfeezh' | 'academic' | 'about'>('tahfeezh');

  // Dynamic School Settings
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: 'Home of Young Huffaz Academy',
    address: 'Address complex, Takushara, Abuja, Nigeria',
    phoneNumbers: '+2348037322312, +2349033245467',
    email: 'info@younghuffaz.com',
    bankName: 'Huffaz Trust Bank',
    accountName: 'Home of Young Huffaz Academy',
    accountNumber: '1023456789',
    currentAcademicYear: '2025/2026',
    currentTerm: 'Second Term'
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      if (res.data) {
        setSchoolSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Login Modal states
  const [loginIsStaff, setLoginIsStaff] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginAdmissionNumber, setLoginAdmissionNumber] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);



  // Fetch Public Announcements on start
  useEffect(() => {
    fetchPublicNotifications();
  }, []);

  // Check auth logout event
  useEffect(() => {
    const handleLogoutEvent = () => {
      setCurrentUser(null);
      setToken(null);
      setActiveTab('landing');
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  // Fetch notifications once logged in
  useEffect(() => {
    if (currentUser) {
      // Set default tab based on role
      setActiveTab(currentUser.role.toLowerCase());
    } else {
      setActiveTab('landing');
    }
  }, [currentUser]);

  const fetchPublicNotifications = async () => {
    try {
      const res = await api.get('/public/notifications');
      setPublicNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load public notifications:', err);
    }
  };



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      if (loginIsStaff) {
        const { token: userToken, user } = await authService.loginStaff(loginUsername, loginPassword);
        setCurrentUser(user);
        setToken(userToken);
      } else {
        const { token: userToken, user } = await authService.loginParent(loginAdmissionNumber, loginPin);
        setCurrentUser(user);
        setToken(userToken);
      }
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
      setLoginAdmissionNumber('');
      setLoginPin('');
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* HEADER NAVBAR */}
      {activeTab !== 'admin' && activeTab !== 'accountant' && (
        <header className="nav-header">
          <div className="nav-container">
            <div className="nav-brand" onClick={() => { setActiveTab('landing'); setIsMenuOpen(false); }}>
              <img src="/logo.png" alt="DSH Logo" className="nav-logo-circle" style={{ objectFit: 'cover', border: '1.5px solid var(--border)' }} />
              <div>
                <div className="nav-header-arabic">دار صغار الحفاظ</div>
                <h1 className="nav-header-title">{schoolSettings.schoolName.toUpperCase()}</h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                className="theme-toggle-btn mobile-theme-toggle" 
                onClick={toggleTheme} 
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle navigation menu">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            <div className={`nav-actions ${isMenuOpen ? 'open' : ''}`}>
              <button 
                className="theme-toggle-btn desktop-theme-toggle" 
                onClick={toggleTheme} 
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {currentUser ? (
                <>
                  <div className="nav-user-info">
                    <span className="nav-user-name">{currentUser.name}</span>
                    <span className="nav-user-badge">{currentUser.role}</span>
                  </div>
                  <button className="nav-button-action" onClick={() => { setActiveTab(currentUser.role.toLowerCase()); setIsMenuOpen(false); }}>
                    Dashboard
                  </button>
                  <button className="nav-logout-btn" onClick={() => { handleLogout(); setIsMenuOpen(false); }}>
                    <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Log Out
                  </button>
                </>
              ) : (
                <button className="nav-login-btn" onClick={() => { setShowLoginModal(true); setIsMenuOpen(false); }}>
                  <Lock size={16} style={{ marginRight: '0.5rem' }} /> Access Portal
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* PUBLIC NOTIFICATIONS MARQUEE */}
      {publicNotifications.length > 0 && (
        <div style={styles.marqueeContainer}>
          <div style={styles.marqueeHeader}>
            <Bell size={14} style={{ marginRight: '0.4rem' }} /> Announcements:
          </div>
          <div style={styles.marqueeBody}>
            <div style={styles.marqueeText}>
              {publicNotifications.map((n) => (
                <span key={n._id} style={{ marginRight: '4rem' }}>
                  <strong>{n.title}</strong>: {n.message}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTROLLER */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'landing' && (
          <LandingView 
            curriculumTab={curriculumTab} 
            setCurriculumTab={setCurriculumTab} 
            onOpenLogin={() => setShowLoginModal(true)} 
            schoolSettings={schoolSettings}
          />
        )}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <AdminDashboardView 
            schoolSettings={schoolSettings} 
            onUpdateSettings={fetchSettings} 
            styles={styles}
            ResultSheetViewerModal={ResultSheetViewerModal}
            FinanceLedgerView={FinanceLedgerView}
            currentUser={currentUser}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {activeTab === 'teacher' && currentUser?.role === 'TEACHER' && (
          <TeacherDashboardView teacher={currentUser} schoolSettings={schoolSettings} />
        )}
        {activeTab === 'parent' && currentUser?.role === 'PARENT' && (
          <ParentDashboardView parent={currentUser as unknown as Student} token={token} schoolSettings={schoolSettings} />
        )}
        {activeTab === 'accountant' && currentUser?.role === 'ACCOUNTANT' && (
          <AccountantDashboardView 
            schoolSettings={schoolSettings}
            currentUser={currentUser}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        {activeTab === 'director' && currentUser?.role === 'DIRECTOR' && (
          <DirectorDashboardView schoolSettings={schoolSettings} />
        )}
      </main>

      {/* FOOTER */}
      {activeTab !== 'admin' && activeTab !== 'accountant' && (
        <footer style={styles.footer}>
          <div className="container flex-between" style={{ padding: '1.5rem' }}>
            <p>© 2026 {schoolSettings.schoolName}, {schoolSettings.address}. All Rights Reserved.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Dual-Curriculum: Islamic/Tahfeezh & Secular Academic</span>
            </div>
          </div>
        </footer>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div className="animate-scale-in" style={styles.loginModal}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/logo.png" alt="DSH Logo" style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                Academy Login Portal
              </h2>
              <button style={styles.closeBtn} onClick={() => { setShowLoginModal(false); setLoginError(''); }}>
                <X size={20} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div style={styles.modalTabs}>
              <button 
                style={loginIsStaff ? styles.modalTabActive : styles.modalTab} 
                onClick={() => { setLoginIsStaff(true); setLoginError(''); }}
              >
                Staff Portal
              </button>
              <button 
                style={!loginIsStaff ? styles.modalTabActive : styles.modalTab} 
                onClick={() => { setLoginIsStaff(false); setLoginError(''); }}
              >
                Parent Portal
              </button>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {loginError && <div style={styles.errorAlert}>{loginError}</div>}

              {loginIsStaff ? (
                <>
                  <div>
                    <label style={styles.label}>Username</label>
                    <input 
                      type="text" 
                      required 
                      value={loginUsername} 
                      onChange={(e) => setLoginUsername(e.target.value)} 
                      placeholder="e.g. khansau" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Password</label>
                    <input 
                      type="password" 
                      required 
                      value={loginPassword} 
                      onChange={(e) => setLoginPassword(e.target.value)} 
                      placeholder="••••••••" 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={styles.label}>Admission Number</label>
                    <input 
                      type="text" 
                      required 
                      value={loginAdmissionNumber} 
                      onChange={(e) => setLoginAdmissionNumber(e.target.value.toUpperCase())} 
                      placeholder="e.g. DSH/015" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Parent PIN</label>
                    <input 
                      type="password" 
                      required 
                      value={loginPin} 
                      onChange={(e) => setLoginPin(e.target.value)} 
                      placeholder="Enter 4-digit PIN" 
                      maxLength={6}
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={loginLoading} style={loginIsStaff ? styles.submitBtn : styles.submitBtnParent}>
                {loginLoading ? 'Authenticating...' : loginIsStaff ? 'Access Staff Dashboard' : 'View Child Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 1. LANDING PAGE COMPONENT
// ==========================================
function LandingView({ curriculumTab, setCurriculumTab, onOpenLogin, schoolSettings }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* HERO SECTION */}
      <section className="hero-section-container">
        <span style={styles.heroBadge}>{schoolSettings?.schoolName || 'Home of Young Huffaz Academy'}</span>
        <h2 className="hero-headline">Islamic Dual-Curriculum Education for Outstanding Young Learners</h2>
        <p className="hero-subtext">
          Nurturing young minds in {schoolSettings?.address || 'Abuja, Nigeria'} with the noble Hifz Al-Qur'an memorization curriculum alongside complete, high-standard Secular Academic training.
        </p>
        <div className="hero-btn-container">
          <button className="hero-primary-btn" onClick={onOpenLogin}>
            Access Student Reports <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
          </button>
          <button className="hero-secondary-btn" onClick={() => setCurriculumTab('tahfeezh')}>
            Explore Curriculum
          </button>
        </div>
      </section>

      {/* CURRICULUM EXPLORER */}
      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <h3 style={styles.sectionTitle}>Dual-Curriculum System</h3>
        <p style={styles.sectionSubtitle}>Discover how we balance sacred Islamic knowledge with worldly excellence.</p>
        
        {/* TABS */}
        <div className="curriculum-tabs-container">
          <button 
            className={`curriculum-tab-btn ${curriculumTab === 'tahfeezh' ? 'active' : ''}`}
            onClick={() => setCurriculumTab('tahfeezh')}
          >
            <BookOpen size={18} style={{ marginRight: '0.5rem' }} /> Qur'an & Tahfeezh
          </button>
          <button 
            className={`curriculum-tab-btn ${curriculumTab === 'academic' ? 'active' : ''}`}
            onClick={() => setCurriculumTab('academic')}
          >
            <Award size={18} style={{ marginRight: '0.5rem' }} /> Secular Academics
          </button>
          <button 
            className={`curriculum-tab-btn ${curriculumTab === 'about' ? 'active' : ''}`}
            onClick={() => setCurriculumTab('about')}
          >
            <Info size={18} style={{ marginRight: '0.5rem' }} /> Academy Overview
          </button>
        </div>

        {/* TAB BODY */}
        <div className="glass curriculum-card">
          {curriculumTab === 'tahfeezh' && (
            <div className="grid-cols-2">
              <div>
                <h4 className="curriculum-card-header">Sacred Tahfeezh Foundation</h4>
                <p className="curriculum-card-body">
                  Our main focal point is the thorough memorization (Hifz) of the Holy Qur'an with proper rules of Tajweed. We keep small, focused class sizes allowing teachers to follow up daily on each student's recitation correctness, sound, and page-by-page progress.
                </p>
                <ul className="curriculum-card-list">
                  <li>daily Qur'an Hifz and revision (Muruja'ah)</li>
                  <li>Arabic Writing and Orthography (القرآن كتابة)</li>
                  <li>Tajweed principles and recitation performance</li>
                  <li>Islamic values, Manners (Adab), and core beliefs</li>
                </ul>
              </div>
              <div className="arabic-showcase">
                <div className="arabic-logo-large">دار صغار الحفاظ</div>
                <div className="arabic-verse">"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ"</div>
                <div className="arabic-translation">"The best of you is he who learns the Qur'an and teaches it."</div>
              </div>
            </div>
          )}

          {curriculumTab === 'academic' && (
            <div className="grid-cols-2">
              <div>
                <h4 className="curriculum-card-header">Rigorous Secular Curriculum</h4>
                <p className="curriculum-card-body">
                  Alongside spiritual growth, we provide a complete educational package that prepares our learners to compete globally in academic disciplines.
                </p>
                <ul className="curriculum-card-list">
                  <li><strong>Numeracy & Mathematics:</strong> Logic and arithmetic logic</li>
                  <li><strong>Literacy & English:</strong> Critical reading and comprehension</li>
                  <li><strong>Science:</strong> Biology, Physics, and environmental science basics</li>
                  <li><strong>Phonics & Phonetics:</strong> Foundation for speech clarity</li>
                  <li><strong>Social Habits:</strong> Civic duties, community respect, hygiene</li>
                </ul>
              </div>
              <div className="secular-showcase">
                <div className="stats-row">
                  <div className="stat-cell">
                    <span className="stat-num">100%</span>
                    <span className="stat-label">English & Arabic Bilingual</span>
                  </div>
                  <div className="stat-cell">
                    <span className="stat-num">1:15</span>
                    <span className="stat-label">Student-Teacher Ratio</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {curriculumTab === 'about' && (
            <div style={{ padding: '1rem 0' }}>
              <h4 className="curriculum-card-header">{schoolSettings?.schoolName || 'Home of Young Huffaz Academy'}</h4>
              <p className="curriculum-card-body" style={{ maxWidth: '800px' }}>
                Established in {schoolSettings?.address || 'Abuja, Nigeria'}, {schoolSettings?.schoolName || 'Home of Young Huffaz Academy'} is a leading institution for kids' Islamic and academic education. Our mission is to produce children who memorize the Quran and possess the highest level of academic knowledge, combined with moral uprightness and integrity.
              </p>
              <div style={styles.badgeRow}>
                <span style={styles.infoBadge}>📍 {schoolSettings?.address || 'Abuja, Nigeria'}</span>
                <span style={styles.infoBadge}>🎓 Dual-Curriculum System</span>
                <span style={styles.infoBadge}>🏆 Certified Instructors</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 2. ADMIN DASHBOARD VIEW
// ==========================================
// AdminDashboardView has been refactored to ./components/AdminDashboardView.tsx

// ==========================================
// 3. TEACHER DASHBOARD VIEW
// ==========================================
function TeacherDashboardView({ teacher, schoolSettings }: { teacher: User; schoolSettings: any }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(schoolSettings?.currentTerm || 'Second Term');
  const [selectedYear, setSelectedYear] = useState(schoolSettings?.currentAcademicYear || '2025/2026');

  useEffect(() => {
    if (schoolSettings) {
      setSelectedTerm(schoolSettings.currentTerm || 'Second Term');
      setSelectedYear(schoolSettings.currentAcademicYear || '2025/2026');
    }
  }, [schoolSettings]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  
  // Teacher dashboard tabs
  const [activeTeacherTab, setActiveTeacherTab] = useState<'grading' | 'salaries'>('grading');
  const [mySalaries, setMySalaries] = useState<any[]>([]);
  const [mySalaryYear, setMySalaryYear] = useState('2026');

  const fetchMySalaries = async () => {
    try {
      const res = await api.get('/staff/my-salaries');
      setMySalaries(res.data || []);
    } catch (err) {
      console.error('Failed to fetch personal salaries', err);
    }
  };

  useEffect(() => {
    fetchMySalaries();
  }, []);

  // AI Generated Comments Cache
  const [aiLoading, setAiLoading] = useState(false);

  // Subject Grades form states
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([
    { subjectName: "Al-Qur'an Karem (Hifz)", subjectNameArabic: "القرآن الكريم ( حفظ )", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'tahfeezh' },
    { subjectName: "Al-Qur'an (Writing)", subjectNameArabic: "القرآن كتابة", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'tahfeezh' },
    { subjectName: "Arabic", subjectNameArabic: "العربية", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'tahfeezh' },
    { subjectName: "Grammar VERBAL", subjectNameArabic: "القواعد", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'tahfeezh' },
    { subjectName: "Islamic Subjects", subjectNameArabic: "المواد الإسلامية", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'tahfeezh' },
    { subjectName: "Science", subjectNameArabic: "علوم", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'academic' },
    { subjectName: "Literacy", subjectNameArabic: "معرفة القراءة والكتابة", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'academic' },
    { subjectName: "Numeracy", subjectNameArabic: "الحساب", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'academic' },
    { subjectName: "Phonics", subjectNameArabic: "سماع الصوت", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'academic' },
    { subjectName: "Social Habits", subjectNameArabic: "العادات الاجتماعية", score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '', isGraded: true, section: 'academic' },
  ]);

  // Tahfeezh Details form states
  const [tahfeezhAbsenceOfHifz, setTahfeezhAbsenceOfHifz] = useState(0);
  const [tahfeezhDaysPresent, setTahfeezhDaysPresent] = useState(0);
  const [tahfeezhDaysAbsent, setTahfeezhDaysAbsent] = useState(0);
  const [tahfeezhFromSurah, setTahfeezhFromSurah] = useState('البقرة');
  const [tahfeezhToSurah, setTahfeezhToSurah] = useState('الكهف');
  const [tahfeezhMemorizedPages, setTahfeezhMemorizedPages] = useState(0);

  // Evaluation Elements form states
  const [evaluations, setEvaluations] = useState<EvaluationElement[]>([
    { elementLabel: 'Correctness of recitation & Tajweed Practicing', elementLabelArabic: 'صحة التلاوة وتطبيق التجويد', rating: 'ممتاز' },
    { elementLabel: 'Excellent Sound and Performance', elementLabelArabic: 'جودة الصوت والأداء المتميز', rating: 'ممتاز' },
    { elementLabel: 'Emotional Stability & Honesty', elementLabelArabic: 'الاستقرار العاطفي والصدق والأمانة', rating: 'ممتاز' },
    { elementLabel: 'Perseverance and Relationship with Students', elementLabelArabic: 'المثابرة والعلاقة مع الطلاب', rating: 'ممتاز' },
    { elementLabel: 'Language Skills (Reading, Listening and Oral)', elementLabelArabic: 'المهارات اللغوية (مهارة القراءة والكتابة والاستماع والتعبير الشفهي)', rating: 'ممتاز' },
    { elementLabel: 'Group & School Activities', elementLabelArabic: 'الأنشطة الأسرية والمدرسية', rating: 'ممتاز' },
  ]);

  // Comments
  const [teacherRecommendations, setTeacherRecommendations] = useState('');
  const [supervisorRecommendations, setSupervisorRecommendations] = useState('');
  const [headTeacherComments, setHeadTeacherComments] = useState('');
  const [dateIssued] = useState('2026-06-23');
  const [nextTermBegins] = useState('2026-09-15');

  useEffect(() => {
    if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
      const cls = teacher.assignedClasses[0];
      setSelectedClass(`${cls.level}-${cls.section}`);
    }
  }, [teacher]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    }
  }, [selectedClass, selectedTerm, selectedYear]);

  const fetchClassStudents = async () => {
    try {
      const [level, section] = selectedClass.split('-');
      const res = await api.get(`/teacher/students?level=${level}&section=${section}&term=${selectedTerm}&academicYear=${selectedYear}`);
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudentForGrading = async (student: Student) => {
    setActiveStudent(student);
    try {
      // Fetch existing result sheet if they have it
      const res = await api.get(`/grading/student/${student._id}?term=${selectedTerm}&academicYear=${selectedYear}`);
      if (res.data && res.data.length > 0) {
        const resultObj: Result = res.data[0];
        // Populate subject values
        const mappedSubjects = subjectGrades.map(s => {
          const match = resultObj.subjects.find(sub => sub.subjectName === s.subjectName);
          return match ? match : s;
        });
        setSubjectGrades(mappedSubjects);

        // Tahfeezh details
        setTahfeezhAbsenceOfHifz(resultObj.tahfeezhDetails.absenceOfHifz || 0);
        setTahfeezhDaysPresent(resultObj.tahfeezhDetails.daysPresent || 0);
        setTahfeezhDaysAbsent(resultObj.tahfeezhDetails.daysAbsent || 0);
        setTahfeezhFromSurah(resultObj.tahfeezhDetails.fromSurah || 'البقرة');
        setTahfeezhToSurah(resultObj.tahfeezhDetails.toSurah || 'الكهف');
        setTahfeezhMemorizedPages(resultObj.tahfeezhDetails.memorizedPages || 0);

        // Evaluations
        if (resultObj.evaluationElements && resultObj.evaluationElements.length > 0) {
          setEvaluations(resultObj.evaluationElements);
        }

        // Recommendations
        setTeacherRecommendations(resultObj.teacherRecommendations || '');
        setSupervisorRecommendations(resultObj.supervisorRecommendations || '');
        setHeadTeacherComments(resultObj.headTeacherComments || '');
      } else {
        // Reset to zeros
        setSubjectGrades(subjectGrades.map(s => ({ ...s, score60: 0, score20_1: 0, score20_2: 0, score100: 0, grade: '' })));
        setTahfeezhAbsenceOfHifz(0);
        setTahfeezhDaysPresent(0);
        setTahfeezhDaysAbsent(0);
        setTeacherRecommendations('');
        setSupervisorRecommendations('');
        setHeadTeacherComments('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScoreChange = (index: number, field: 'score60' | 'score20_1' | 'score20_2', val: number) => {
    const updated = [...subjectGrades];
    updated[index][field] = val;
    const total = updated[index].score60 + updated[index].score20_1 + updated[index].score20_2;
    updated[index].score100 = total;

    // Calculate Grade
    let grade = 'F';
    if (total >= 85) grade = 'A';
    else if (total >= 70) grade = 'B';
    else if (total >= 55) grade = 'C';
    else if (total >= 40) grade = 'D';
    updated[index].grade = grade;

    setSubjectGrades(updated);
  };

  const handleEvaluationRatingChange = (index: number, rating: string) => {
    const updated = [...evaluations];
    updated[index].rating = rating;
    setEvaluations(updated);
  };

  // GEMINI AI INTEGRATION
  const handleGenerateAiComments = async () => {
    if (!activeStudent) return;
    setAiLoading(true);
    try {
      // Send subjects grades to helper endpoint
      const response = await api.post('/ai/feedback', {
        studentName: activeStudent.name,
        subjects: subjectGrades
      });
      if (response.data && response.data.feedback) {
        setTeacherRecommendations(response.data.feedback);
      }
    } catch (err) {
      alert('Failed to generate AI feedback comments. Verify backend API settings.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      const [level, section] = selectedClass.split('-');
      await api.post('/grading/submit', {
        studentId: activeStudent._id,
        academicYear: selectedYear,
        term: selectedTerm,
        level,
        section,
        subjects: subjectGrades,
        tahfeezhDetails: {
          absenceOfHifz: tahfeezhAbsenceOfHifz,
          daysPresent: tahfeezhDaysPresent,
          daysAbsent: tahfeezhDaysAbsent,
          fromSurah: tahfeezhFromSurah,
          toSurah: tahfeezhToSurah,
          memorizedPages: tahfeezhMemorizedPages
        },
        evaluationElements: evaluations,
        teacherRecommendations,
        supervisorRecommendations,
        headTeacherComments,
        teacherName: teacher.name,
        dateIssued,
        nextTermBegins
      });
      alert('Grades submitted successfully and sent for Admin review!');
      setActiveStudent(null);
      fetchClassStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit student grading sheet.');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={28} color="var(--primary)" /> Teacher Dashboard & Panel
      </h2>

      {/* TEACHER DASHBOARD TABS */}
      <div style={{ ...styles.curriculumTabs, marginBottom: '1.5rem' }}>
        <button style={activeTeacherTab === 'grading' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveTeacherTab('grading')}>
          Student Grading Panel
        </button>
        <button style={activeTeacherTab === 'salaries' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveTeacherTab('salaries')}>
          My Salary & Payout History
        </button>
      </div>

      {activeTeacherTab === 'grading' && (
        <>
          {/* FILTER HEADER */}
      <div style={styles.dashboardStatsRow} className="grid-cols-4">
        <div>
          <label style={styles.label}>Class Section</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {teacher.assignedClasses?.map(c => (
              <option key={`${c.level}-${c.section}`} value={`${c.level}-${c.section}`}>
                Level {c.level} - {c.section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Term</label>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            <option value="First Term">First Term</option>
            <option value="Second Term">Second Term</option>
            <option value="Third Term">Third Term</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Academic Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }} className="grid-cols-3">
        {/* STUDENTS ROLL CALL */}
        <div>
          <h3 style={styles.cardHeader}>Student Grading List</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {students.map(s => (
              <div 
                key={s._id} 
                onClick={() => handleSelectStudentForGrading(s)}
                style={{
                  ...styles.studentListItem,
                  borderColor: activeStudent?._id === s._id ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: activeStudent?._id === s._id ? 'var(--primary-glow)' : 'var(--bg-card)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.admissionNumber}</div>
                </div>
                <div>
                  {s.hasResult ? (
                    <span style={styles.statusBadgeApproved}>Graded</span>
                  ) : (
                    <span style={styles.statusBadgePending}>Ungraded</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GRADING FORM */}
        <div className="span-2-desktop">
          {activeStudent ? (
            <form onSubmit={handleSubmitGrades} className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem' }}>Grading: {activeStudent.name}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Adm: {activeStudent.admissionNumber} | Class Level: {activeStudent.level}-{activeStudent.section}</p>
                </div>
                <button type="button" style={styles.closeBtn} onClick={() => setActiveStudent(null)}>
                  <X size={20} />
                </button>
              </div>

              {/* TAHFEEZH SECTION & DETAILS */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={styles.formSectionHeader}>Quranic & Tahfeezh Progress</h4>
                <div className="grid-cols-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={styles.label}>Absence of Hifz Days</label>
                    <input type="number" value={tahfeezhAbsenceOfHifz} onChange={e => setTahfeezhAbsenceOfHifz(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Days Present</label>
                    <input type="number" value={tahfeezhDaysPresent} onChange={e => setTahfeezhDaysPresent(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Days Absent</label>
                    <input type="number" value={tahfeezhDaysAbsent} onChange={e => setTahfeezhDaysAbsent(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid-cols-3" style={{ gap: '1rem' }}>
                  <div>
                    <label style={styles.label}>From Surah</label>
                    <select 
                      value={tahfeezhFromSurah} 
                      onChange={e => setTahfeezhFromSurah(e.target.value)}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%' }}
                    >
                      {SURAHS.map(s => (
                        <option key={s.number} value={s.arabic}>
                          {s.number}. {s.english} ({s.arabic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>To Surah</label>
                    <select 
                      value={tahfeezhToSurah} 
                      onChange={e => setTahfeezhToSurah(e.target.value)}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%' }}
                    >
                      {SURAHS.map(s => (
                        <option key={s.number} value={s.arabic}>
                          {s.number}. {s.english} ({s.arabic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Memorized Pages Count</label>
                    <input type="number" value={tahfeezhMemorizedPages} onChange={e => setTahfeezhMemorizedPages(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* SUBJECT SCORE INPUTS */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={styles.formSectionHeader}>Academic & Core Subject Marks</h4>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th style={{ width: '80px' }}>CA 1 (20)</th>
                        <th style={{ width: '80px' }}>CA 2 (20)</th>
                        <th style={{ width: '80px' }}>Exam (60)</th>
                        <th style={{ width: '80px' }}>Total (100)</th>
                        <th style={{ width: '60px' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectGrades.map((s, idx) => (
                        <tr key={s.subjectName}>
                          <td>
                            <div>{s.subjectName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-arabic)' }}>{s.subjectNameArabic}</div>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min={0} 
                              max={20}
                              value={s.score20_1} 
                              onChange={e => handleScoreChange(idx, 'score20_1', Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                              style={{ padding: '0.4rem', textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min={0} 
                              max={20}
                              value={s.score20_2} 
                              onChange={e => handleScoreChange(idx, 'score20_2', Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                              style={{ padding: '0.4rem', textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min={0} 
                              max={60}
                              value={s.score60} 
                              onChange={e => handleScoreChange(idx, 'score60', Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                              style={{ padding: '0.4rem', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.score100}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{s.grade || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EVALUATION RATINGS */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={styles.formSectionHeader}>Manners & Performance Ratings</h4>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Metric Element</th>
                        <th>Arabic</th>
                        <th>Rating Selection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((ev, idx) => (
                        <tr key={ev.elementLabel}>
                          <td>{ev.elementLabel}</td>
                          <td style={{ fontFamily: 'var(--font-arabic)' }}>{ev.elementLabelArabic}</td>
                          <td>
                            <select value={ev.rating} onChange={e => handleEvaluationRatingChange(idx, e.target.value)}>
                              <option value="ممتاز جدا">ممتاز جدا (Excellent +)</option>
                              <option value="ممتاز">ممتاز (Excellent)</option>
                              <option value="جيد جدا">جيد جدا (Very Good)</option>
                              <option value="جيد">جيد (Good)</option>
                              <option value="مقبول">مقبول (Satisfactory)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMMENDATIONS & COMMENTS */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h4 style={styles.formSectionHeader}><Brain size={16} color="var(--primary)" style={{ marginRight: '0.4rem', display: 'inline' }} /> AI Assistant & Recommendations</h4>
                  <button 
                    type="button" 
                    disabled={aiLoading}
                    onClick={handleGenerateAiComments}
                    style={{
                      ...styles.navButton,
                      backgroundColor: 'hsl(46, 65%, 45%)',
                      borderColor: 'hsl(46, 65%, 45%)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem'
                    }}
                  >
                    {aiLoading ? 'Analyzing Performance...' : 'Generate AI Teacher Remarks'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={styles.label}>Teacher's General Remarks</label>
                    <textarea 
                      rows={3} 
                      value={teacherRecommendations} 
                      onChange={e => setTeacherRecommendations(e.target.value)} 
                      placeholder="Comment on memory retentiveness, reading stability, focus and classroom habits..." 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Supervisor / Coordinator Recommendations</label>
                    <textarea 
                      rows={2} 
                      value={supervisorRecommendations} 
                      onChange={e => setSupervisorRecommendations(e.target.value)} 
                      placeholder="e.g. Masha Allah Barakallah Feeki" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Head Teacher Endorsement Comments</label>
                    <input 
                      type="text" 
                      value={headTeacherComments} 
                      onChange={e => setHeadTeacherComments(e.target.value)} 
                      placeholder="e.g. Outstanding performance. Keep it up." 
                    />
                  </div>
                </div>
              </div>

              <button type="submit" style={styles.submitBtn}>Submit Grading Sheet</button>
            </form>
          ) : (
            <div style={styles.emptyContainer}>
              <Award size={48} color="var(--text-muted)" />
              <h3>Select a student from the sidebar to grade or review results</h3>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* TEACHER PERSONAL SALARY TAB */}
      {activeTeacherTab === 'salaries' && (
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>My Salary & Payout History</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                View your monthly salary payout logs and transaction references.
              </p>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Filter Year</label>
              <select 
                value={mySalaryYear} 
                onChange={e => setMySalaryYear(e.target.value)}
                style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Year</th>
                  <th>Amount Paid</th>
                  <th>Payout Date</th>
                  <th>Status</th>
                  <th>Transaction Reference</th>
                </tr>
              </thead>
              <tbody>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => {
                  const payment = mySalaries.find(p => p.month === month && p.year === mySalaryYear);
                  return (
                    <tr key={month}>
                      <td><strong>{month}</strong></td>
                      <td>{mySalaryYear}</td>
                      <td style={{ fontWeight: 'bold', color: payment ? 'var(--success)' : 'inherit' }}>
                        {payment ? `₦${payment.amount.toLocaleString()}` : '-'}
                      </td>
                      <td>
                        {payment ? new Date(payment.paymentDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        {payment ? (
                          <span style={styles.statusBadgeApproved}>Paid</span>
                        ) : (
                          <span style={styles.statusBadgePending}>Yet to pay</span>
                        )}
                      </td>
                      <td>
                        {payment ? <code>{payment.transactionReference || 'Cash/Transfer'}</code> : <span style={{ opacity: 0.5 }}>-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. PARENT DASHBOARD VIEW
// ==========================================
function ParentDashboardView({ parent, token, schoolSettings }: { parent: Student; token: string | null; schoolSettings: any }) {
  const [results, setResults] = useState<Result[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeResult, setActiveResult] = useState<Result | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'results' | 'finances'>('results');
  const baseUrl = BASE_URL;

  const [selectedTerm, setSelectedTerm] = useState(schoolSettings?.currentTerm || 'Second Term');
  const [selectedYear, setSelectedYear] = useState(schoolSettings?.currentAcademicYear || '2025/2026');

  useEffect(() => {
    if (schoolSettings) {
      setSelectedTerm(schoolSettings.currentTerm || 'Second Term');
      setSelectedYear(schoolSettings.currentAcademicYear || '2025/2026');
    }
  }, [schoolSettings]);

  useEffect(() => {
    fetchParentResults();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [selectedTerm, selectedYear]);

  const fetchParentResults = async () => {
    try {
      const res = await api.get('/parent/results');
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Invoices for this child
      const res = await api.get(`/finance/invoices?term=${selectedTerm}&academicYear=${selectedYear}`);
      // Filter for this child's invoices
      const filtered = (res.data?.invoices || []).filter((inv: any) => inv.studentId && inv.studentId._id === parent._id);
      setInvoices(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const openResultSheet = (result: Result) => {
    setActiveResult(result);
    setShowResultSheet(true);
  };

  const filteredResults = results.filter(r => r.term === selectedTerm && r.academicYear === selectedYear);
  const filteredInvoices = invoices.filter(inv => inv.term === selectedTerm && inv.academicYear === selectedYear);

  const calculateTotalOutstanding = () => {
    return filteredInvoices.reduce((acc, curr) => acc + (curr.amount - (curr.paidAmount || 0)), 0);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={28} color="var(--secondary)" /> Guardian & Parent Portal
      </h2>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '500' }}>Student Profile: {parent.name}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Admission No: <strong>{parent.admissionNumber}</strong> | Level: <strong>{parent.level}</strong> | Section: <strong>{parent.section}</strong>
        </p>
      </div>

      {/* SESSION FILTER SELECTOR */}
      <div className="glass" style={{
        padding: '0.75rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--secondary)" />
          <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
            Select Term to View Results & Fees:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '0.1rem', color: 'var(--text-muted)' }}>Academic Year</label>
            <select
              style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '0.1rem', color: 'var(--text-muted)' }}>Term</label>
            <select
              style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* PARENT TABS */}
      <div style={styles.curriculumTabs}>
        <button style={activeSubTab === 'results' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveSubTab('results')}>
          Report Cards & Grades
        </button>
        <button style={activeSubTab === 'finances' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveSubTab('finances')}>
          Finances & Fees ({filteredInvoices.length} Bills)
        </button>
      </div>

      {/* RESULTS LIST TAB */}
      {activeSubTab === 'results' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Published Results</h3>
            {filteredResults.length === 0 ? (
              <div style={styles.emptyContainer}>
                <FileText size={36} />
                <p>No results sheets are currently published or approved for this student.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {filteredResults.map(r => (
                  <div key={r._id} className="glass flex-between" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <h4 style={{ fontWeight: 'bold' }}>{r.term}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Academic Year: {r.academicYear} | Average: {r.finalAverage}%</p>
                    </div>
                    <div className="flex-row">
                      <button style={styles.navButton} onClick={() => openResultSheet(r)}>
                        View Report Card
                      </button>
                      <a 
                        href={`${BASE_URL}/results/${r._id}/pdf?token=${token}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...styles.submitBtn,
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Download size={14} /> PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={styles.cardHeader}><Info size={16} style={{ display: 'inline', marginRight: '0.25rem' }} /> Academic Notes</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Official term results must be reviewed and approved by the Academic Director prior to parental release. Parents can export and download the signed PDF result sheet. If you spot any discrepancy, please contact the class teacher immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FINANCES & BILLING TAB */}
      {activeSubTab === 'finances' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Academy Invoices Ledger</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice Date</th>
                    <th>Description</th>
                    <th>Due Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv._id}>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td>{inv.description}</td>
                      <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td>₦{inv.amount.toLocaleString()}</td>
                      <td>₦{(inv.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold' }}>₦{(inv.amount - (inv.paidAmount || 0)).toLocaleString()}</td>
                      <td>
                        <span style={
                          inv.status === 'PAID' ? styles.statusBadgeApproved : 
                          inv.status === 'PARTIALLY_PAID' ? styles.statusBadgePending : 
                          styles.statusBadgeUnpaid
                        }>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <a
                            href={`${baseUrl}/finance/invoices/${inv._id}/pdf?token=${token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                              borderRadius: '4px',
                              textDecoration: 'none'
                            }}
                            title="Download Invoice (Bill) PDF"
                          >
                            <Download size={11} /> Bill
                          </a>
                          {inv.payments && inv.payments.map((p, idx) => (
                            <a
                              key={p._id || idx}
                              href={`${baseUrl}/finance/invoices/${inv._id}/payments/${p._id}/pdf?token=${token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn"
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                backgroundColor: 'var(--secondary)',
                                color: '#fff',
                                borderRadius: '4px',
                                textDecoration: 'none'
                              }}
                              title={`Download Payment Receipt ${idx + 1}`}
                            >
                              <Download size={11} /> Receipt {idx + 1}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center' }}>No billing statements found for {selectedTerm} ({selectedYear}).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--secondary)' }}>
              <h3 style={styles.cardHeader}>Financial Summary</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', margin: '1rem 0' }}>
                ₦{calculateTotalOutstanding().toLocaleString()}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total outstanding billing fees due. Payments can be settled directly via bank transfer or at the Academy Accountant accounts office.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CARD DETAILS MODAL CONTAINER */}
      {showResultSheet && activeResult && (
        <ResultSheetViewerModal 
          result={activeResult} 
          token={token} 
          onClose={() => setShowResultSheet(false)} 
          student={parent} 
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
}

// ==========================================
// 5. FINANCE & LEDGER VIEW COMPONENT
// ==========================================
interface FinanceLedgerViewProps {
  showControls: boolean;
  activeTabOverride?: 'billing' | 'expenses' | 'reserves' | 'expected' | 'salaries';
}

function FinanceLedgerView({ showControls, activeTabOverride }: FinanceLedgerViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeFinTabState, setActiveFinTabState] = useState<'billing' | 'expenses' | 'reserves' | 'expected' | 'salaries'>('billing');
  
  const activeFinTab = activeTabOverride || activeFinTabState;
  const setActiveFinTab = activeTabOverride ? () => {} : setActiveFinTabState;
  
  // Term & Academic Year selected scope
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025/2026');

  // Expected Fees filters
  const [expectedSearch, setExpectedSearch] = useState('');
  const [expectedLevelFilter, setExpectedLevelFilter] = useState('ALL');

  // Forecast cache
  const [aiForecastText, setAiForecastText] = useState('');
  const [aiForecastLoading, setAiForecastLoading] = useState(false);

  // Forms states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClassLevel, setSelectedClassLevel] = useState('5');
  const [selectedClassSection, setSelectedClassSection] = useState('ALLO');
  const [billAmount, setBillAmount] = useState(150000);
  const [billDescription, setBillDescription] = useState('Second Term Tuition Fee');
  const [billDueDate, setBillDueDate] = useState('2026-07-31');
  const [isBatchBilling, setIsBatchBilling] = useState(false);

  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');

  const [expenseCategory, setExpenseCategory] = useState('Salaries');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('2026-06-23');

  // Salary state variables
  const [staffList, setStaffList] = useState<User[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<any[]>([]);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear().toString());

  // Salary payment form states
  const [payStaffId, setPayStaffId] = useState('');
  const [payMonth, setPayMonth] = useState('January');
  const [payAmount, setPayAmount] = useState(0);
  const [payRef, setPayRef] = useState('');

  // Fetch active school settings on mount to set defaults
  useEffect(() => {
    const fetchDefaultSettings = async () => {
      try {
        const res = await api.get('/public/settings');
        if (res.data) {
          setSelectedTerm(res.data.currentTerm || 'First Term');
          setSelectedAcademicYear(res.data.currentAcademicYear || '2025/2026');
        }
      } catch (err) {
        console.error('Failed to load active settings', err);
      }
    };
    fetchDefaultSettings();
  }, []);

  // Fetch scoped data whenever selected term or year changes
  useEffect(() => {
    fetchInvoices();
    fetchExpenses();
    fetchStudents();
    fetchStaffList();
    fetchSalaries();
  }, [selectedTerm, selectedAcademicYear, salaryYear]);

  const fetchStaffList = async () => {
    try {
      const res = await api.get('/finance/staff');
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff list', err);
    }
  };

  const fetchSalaries = async () => {
    try {
      const res = await api.get(`/finance/salaries?year=${salaryYear}`);
      setSalaryPayments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch salaries', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get(`/finance/invoices?term=${selectedTerm}&academicYear=${selectedAcademicYear}`);
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await api.get(`/finance/expenses?term=${selectedTerm}&academicYear=${selectedAcademicYear}`);
      setExpenses(res.data?.expenses || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      // Fetch active students filtered by Academic Year
      const res = await api.get(`/admin/students?limit=10000&academicYear=${selectedAcademicYear}`);
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/invoices', {
        studentId: isBatchBilling ? undefined : selectedStudent,
        level: isBatchBilling ? selectedClassLevel : undefined,
        section: isBatchBilling ? selectedClassSection : undefined,
        amount: billAmount,
        description: billDescription,
        dueDate: billDueDate,
        isBatch: isBatchBilling,
        term: selectedTerm,
        academicYear: selectedAcademicYear
      });
      alert('Invoice(s) generated successfully!');
      fetchInvoices();
      setSelectedStudent('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invoice generation failed');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoiceId) return;
    try {
      await api.post(`/finance/invoices/${paymentInvoiceId}/payment`, {
        amount: paymentAmount,
        reference: paymentReference
      });
      alert('Payment recorded successfully!');
      setPaymentInvoiceId('');
      setPaymentAmount(0);
      setPaymentReference('');
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment entry failed');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', {
        category: expenseCategory,
        amount: expenseAmount,
        description: expenseDescription,
        date: expenseDate,
        term: selectedTerm,
        academicYear: selectedAcademicYear
      });
      alert('Expense recorded successfully!');
      setExpenseAmount(0);
      setExpenseDescription('');
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Expense entry failed');
    }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStaffId || !payMonth || !payAmount) {
      alert('Please fill out all required fields');
      return;
    }
    try {
      await api.post('/finance/salaries', {
        staffId: payStaffId,
        month: payMonth,
        year: salaryYear,
        amount: payAmount,
        transactionReference: payRef
      });
      alert('Salary payment recorded and logged as expense successfully!');
      setPayAmount(0);
      setPayRef('');
      fetchSalaries();
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Salary recording failed');
    }
  };

  // GEMINI AI INTEGRATION
  const handleGenerateForecast = async () => {
    setAiForecastLoading(true);
    setAiForecastText('');
    try {
      const response = await api.get(`/ai/finance-forecast?term=${selectedTerm}&academicYear=${selectedAcademicYear}`);
      if (response.data && response.data.forecast) {
        setAiForecastText(response.data.forecast);
      }
    } catch (err) {
      alert('Failed to generate forecast report. Check backend API logs.');
    } finally {
      setAiForecastLoading(false);
    }
  };

  const calculateFinanceAggregates = () => {
    const totalExpectedMoney = students.reduce((acc, s) => acc + (s.schoolFees || 0), 0);
    const totalBilled = invoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCollected = invoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const outstanding = totalExpectedMoney - totalCollected;
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const reserves = totalCollected - totalExpenses;
    return { totalBilled, totalCollected, outstanding, totalExpenses, reserves };
  };

  const aggregates = calculateFinanceAggregates();
  const token = authService.getToken();
  const baseUrl = BASE_URL;

  const totalExpectedMoney = students.reduce((acc, s) => acc + (s.schoolFees || 0), 0);

  const filteredStudents = students.filter(s => {
    const nameOrAdmission = `${s.name} ${s.admissionNumber}`.toLowerCase();
    const matchesSearch = nameOrAdmission.includes(expectedSearch.toLowerCase());
    const matchesLevel = expectedLevelFilter === 'ALL' || s.level === expectedLevelFilter;
    return matchesSearch && matchesLevel;
  });

  const totalFilteredExpected = filteredStudents.reduce((acc, s) => acc + (s.schoolFees || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* SCOPE TERM SELECTOR HEADER */}
      <div className="glass" style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Active View Session:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Academic Year</label>
            <select
              style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Term</label>
            <select
              style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* FINANCIAL STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1rem'
      }}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid var(--info)' }}>
          <div style={styles.statCardLabel}>Total Money Expected</div>
          <div style={styles.statCardValue}>₦{totalExpectedMoney.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
             From {students.length} Student Files
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statCardLabel}>Total Invoiced (Billed)</div>
          <div style={styles.statCardValue}>₦{aggregates.totalBilled.toLocaleString()}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid var(--primary)' }}>
          <div style={styles.statCardLabel}>Total Collections (Paid)</div>
          <div style={styles.statCardValue}>₦{aggregates.totalCollected.toLocaleString()}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid var(--secondary)' }}>
          <div style={styles.statCardLabel}>Total Outstanding (Fees)</div>
          <div style={styles.statCardValue}>₦{aggregates.outstanding.toLocaleString()}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid var(--error)' }}>
          <div style={styles.statCardLabel}>Total Money on Ground (Reserves)</div>
          <div style={styles.statCardValue}>₦{aggregates.reserves.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
             After ₦{aggregates.totalExpenses.toLocaleString()} Expenses
          </div>
        </div>
      </div>

      {/* FORECASTING & ADVISOR */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', margin: '0.5rem 0' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Brain size={22} />
              AI Reserve & Cash Flow Forecasting
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Daru sigar AI Assistant analyzes all billings, actual collections, and expenses to draft budgets.
            </p>
          </div>
          <button style={styles.navButton} onClick={handleGenerateForecast} disabled={aiForecastLoading}>
            {aiForecastLoading ? 'Consulting Daru sigar AI Assistant...' : 'Analyze Financial Reserves'}
          </button>
        </div>

        {aiForecastText && (
          <div style={styles.aiForecastBox}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Daru sigar AI Assistant: Financial Assessment Report
            </h4>
            <div style={{ lineHeight: '1.6', fontSize: '0.9rem' }}>
              {renderFormattedText(aiForecastText)}
            </div>
          </div>
        )}
      </div>

      {/* ACCOUNTANT TABS */}
      {!activeTabOverride && (
        <div style={styles.curriculumTabs}>
          <button style={activeFinTab === 'billing' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('billing')}>
            Invoices & Billings Ledger
          </button>
          <button style={activeFinTab === 'expenses' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('expenses')}>
            Operating Expenses Ledger
          </button>
          <button style={activeFinTab === 'reserves' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('reserves')}>
            Money on Ground (Reserves Ledger)
          </button>
          <button style={activeFinTab === 'expected' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('expected')}>
            Money Expected (Expected Fees Ledger)
          </button>
          <button style={activeFinTab === 'salaries' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('salaries')}>
            Staff Salary Registry
          </button>
        </div>
      )}

      {/* BILLING LEDGER TAB */}
      {activeFinTab === 'billing' && (
        <div style={{ marginTop: '0.5rem' }} className={showControls ? "grid-cols-3" : ""}>
          <div className={`glass ${showControls ? "span-2-desktop" : ""}`} style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
            <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Invoices Registry</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Detailed ledger of generated tuition invoices, billing statements, and payment statuses.
            </p>
            <div style={styles.tableWrapper}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Description</th>
                    <th>Due Date</th>
                    <th>Billed</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th>Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const studentName = inv.studentId ? inv.studentId.name : 'Unknown';
                    return (
                      <tr key={inv._id}>
                        <td><strong>{studentName}</strong></td>
                        <td>{inv.description}</td>
                        <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td style={{ fontWeight: '600' }}>₦{inv.amount.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '600' }}>₦{(inv.paidAmount || 0).toLocaleString()}</td>
                        <td>
                          <span style={
                            inv.status === 'PAID' ? styles.statusBadgeApproved : 
                            inv.status === 'PARTIALLY_PAID' ? styles.statusBadgePending : 
                            styles.statusBadgeUnpaid
                          }>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            <a
                              href={`${baseUrl}/finance/invoices/${inv._id}/pdf?token=${token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn"
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                backgroundColor: 'var(--primary)',
                                color: '#fff',
                                borderRadius: '4px',
                                textDecoration: 'none'
                              }}
                              title="Download Invoice (Bill) PDF"
                            >
                              <Download size={11} /> Bill
                            </a>
                            {inv.payments && inv.payments.map((p, idx) => (
                              <a
                                key={p._id || idx}
                                href={`${baseUrl}/finance/invoices/${inv._id}/payments/${p._id}/pdf?token=${token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  backgroundColor: 'var(--secondary)',
                                  color: '#fff',
                                  borderRadius: '4px',
                                  textDecoration: 'none'
                                }}
                                title={`Download Payment Receipt ${idx + 1}`}
                              >
                                <Download size={11} /> Receipt {idx + 1}
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No invoices registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {showControls && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* GENERATE INVOICES CARD */}
              <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={styles.cardHeader}>Bill Student(s)</h3>
                
                <div style={{ display: 'flex', gap: '1rem', margin: '0.75rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" checked={!isBatchBilling} onChange={() => setIsBatchBilling(false)} style={{ width: 'auto' }} /> Single Student
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" checked={isBatchBilling} onChange={() => setIsBatchBilling(true)} style={{ width: 'auto' }} /> Batch Class
                  </label>
                </div>

                <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!isBatchBilling ? (
                    <div>
                      <label style={styles.label}>Select Student</label>
                      <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                        <option value="">-- Select student --</option>
                        {students.map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.admissionNumber})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Class Level</label>
                        <select value={selectedClassLevel} onChange={e => setSelectedClassLevel(e.target.value)}>
                          <option value="1">Level 1</option>
                          <option value="2">Level 2</option>
                          <option value="3">Level 3</option>
                          <option value="4">Level 4</option>
                          <option value="5">Level 5</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Section</label>
                        <select value={selectedClassSection} onChange={e => setSelectedClassSection(e.target.value)}>
                          <option value="ALLO">ALLO</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={styles.label}>Billing Amount (₦)</label>
                    <input type="number" required value={billAmount} onChange={e => setBillAmount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Invoice Description</label>
                    <input type="text" required value={billDescription} onChange={e => setBillDescription(e.target.value)} />
                  </div>
                  <div>
                    <label style={styles.label}>Due Date</label>
                    <input type="date" required value={billDueDate} onChange={e => setBillDueDate(e.target.value)} />
                  </div>
                  <button type="submit" style={styles.submitBtn}>Generate Invoice(s)</button>
                </form>
              </div>

              {/* RECORD PAYMENTS CARD */}
              <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={styles.cardHeader}>Record Fee Payment</h3>
                <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={styles.label}>Unpaid Invoice</label>
                    <select required value={paymentInvoiceId} onChange={e => setPaymentInvoiceId(e.target.value)}>
                      <option value="">-- Select Invoice --</option>
                      {invoices.filter(i => i.status !== 'PAID').map(i => {
                        const name = i.studentId ? i.studentId.name : 'Unknown';
                        return (
                          <option key={i._id} value={i._id}>
                             {name} - {i.description} (Bal: ₦{(i.amount - (i.paidAmount || 0)).toLocaleString()})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Amount Paid (₦)</label>
                    <input type="number" required value={paymentAmount} onChange={e => setPaymentAmount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Payment Reference / Receipt No</label>
                    <input type="text" required value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="e.g. Bank Transfer Ref" />
                  </div>
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: 'var(--secondary)' }}>Record Payment</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXPENSES LEDGER TAB */}
      {activeFinTab === 'expenses' && (
        <div style={{ marginTop: '0.5rem' }} className={showControls ? "grid-cols-3" : ""}>
          <div className={`glass ${showControls ? "span-2-desktop" : ""}`} style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
            <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Operating Expenses Registry</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Detailed ledger of operational expenditures and outbound transactions for this term.
            </p>
            <div style={styles.tableWrapper}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp._id}>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ textTransform: 'capitalize' }}><strong>{exp.category}</strong></td>
                      <td>{exp.description}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 'bold' }}>-₦{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No expenses recorded this term.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {showControls && (
            <div>
              <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={styles.cardHeader}>Log Expense Details</h3>
                <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={styles.label}>Expense Category</label>
                    <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                      <option value="Salaries">Teacher / Staff Salaries</option>
                      <option value="Utilities">Utilities & Power</option>
                      <option value="Rent">Rent & Ground Lease</option>
                      <option value="Maintenance">Maintenance & Cleaning</option>
                      <option value="Materials">Books & Stationery Supplies</option>
                      <option value="Other">Other Expenses</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Amount Spent (₦)</label>
                    <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Expense Description</label>
                    <input type="text" required value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} placeholder="e.g. Fuel for academy generator" />
                  </div>
                  <div>
                    <label style={styles.label}>Transaction Date</label>
                    <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                  </div>
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: 'var(--error)' }}>Log Transaction</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESERVES LEDGER TAB (MONEY ON GROUND) */}
      {activeFinTab === 'reserves' && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Calculation Card */}
          <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
            <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Money on Ground (Remaining Balance)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              The liquid cash balance remaining in the academy treasury after subtracting all operational expenses from the actual fee collections.
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              alignItems: 'center',
              backgroundColor: 'var(--bg-base)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Collections (Fees Paid)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '0.25rem' }}>
                  +₦{aggregates.totalCollected.toLocaleString()}
                </div>
              </div>
              
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Less: Operating Expenses (Outflows)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)', marginTop: '0.25rem' }}>
                  -₦{aggregates.totalExpenses.toLocaleString()}
                </div>
              </div>
              
              <div style={{ 
                borderLeft: '2px solid var(--primary-light)', 
                paddingLeft: '1.5rem',
                background: 'linear-gradient(90deg, var(--primary-glow) 0%, transparent 100%)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Net Balance (Money on Ground)
                </span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  ₦{aggregates.reserves.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Deducted Expenses Registry */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
            <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Deducted Operating Expenditures</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              The following operational expenses have been subtracted from collections to arrive at the current Money on Ground balance.
            </p>
            <div style={styles.tableWrapper}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount Deducted</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp._id}>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ textTransform: 'capitalize' }}><strong>{exp.category}</strong></td>
                      <td>{exp.description}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 'bold' }}>-₦{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No expenses recorded. Net balance equals total collections.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPECTED FEES LEDGER TAB */}
      {activeFinTab === 'expected' && (
        <div className="glass" style={{ marginTop: '0.5rem', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
          <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Money Expected (Student Profiles Expected Fees)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            A comprehensive list of active student profiles showing their expected tuition and school fees as configured by the Administrator during admission/registration.
          </p>

          {/* SEARCH & FILTERS BAR */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)', marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ ...styles.label, marginBottom: '0.25rem', display: 'block', fontSize: '0.8rem' }}>Search Student Name / Admission No</label>
              <input 
                type="text" 
                value={expectedSearch} 
                onChange={e => setExpectedSearch(e.target.value)} 
                placeholder="e.g. Ahmad or DSH/102" 
              />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ ...styles.label, marginBottom: '0.25rem', display: 'block', fontSize: '0.8rem' }}>Filter Level</label>
              <select value={expectedLevelFilter} onChange={e => setExpectedLevelFilter(e.target.value)}>
                <option value="ALL">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
                <option value="5">Level 5</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filtered Total Expected</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                ₦{totalFilteredExpected.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Admission Number</th>
                  <th>Student Name</th>
                  <th>Class Level</th>
                  <th>Section</th>
                  <th>Academic Year</th>
                  <th>Expected School Fees</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s._id}>
                    <td><code>{s.admissionNumber}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>Level {s.level}</td>
                    <td>{s.section}</td>
                    <td>{s.academicYear}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      ₦{(s.schoolFees || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No students match the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAFF SALARY REGISTRY TAB */}
      {activeFinTab === 'salaries' && (
        <div style={{ marginTop: '0.5rem' }} className={showControls ? "grid-cols-3" : ""}>
          <div className={`glass ${showControls ? "span-2-desktop" : ""}`} style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Staff Salary Ledger & Matrix</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Monthly salary payment records for all registered staff members.
                </p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Calendar Year</label>
                <select 
                  value={salaryYear} 
                  onChange={e => setSalaryYear(e.target.value)}
                  style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table className="custom-table" style={{ fontSize: '0.8.rem' }}>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role</th>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                      <th key={m} style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(staff => {
                    return (
                      <tr key={staff._id}>
                        <td><strong>{staff.name}</strong></td>
                        <td><span style={{ fontSize: '0.75rem', textTransform: 'lowercase', opacity: 0.8 }}>{staff.role}</span></td>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => {
                          const payment = salaryPayments.find(p => p.staffId && (p.staffId._id === staff._id || p.staffId === staff._id) && p.month === month && p.year === salaryYear);
                          return (
                            <td key={month} style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>
                              {payment ? (
                                <span 
                                  style={{
                                    display: 'inline-flex',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--success-glow)',
                                    color: 'var(--success)',
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem'
                                  }}
                                  title={`Paid: ₦${payment.amount.toLocaleString()} on ${new Date(payment.paymentDate).toLocaleDateString()}${payment.transactionReference ? ` (Ref: ${payment.transactionReference})` : ''}`}
                                >
                                  Paid
                                </span>
                              ) : (
                                <span 
                                  onClick={() => {
                                    if (showControls) {
                                      setPayStaffId(staff._id);
                                      setPayMonth(month);
                                      setPayAmount(250000);
                                    }
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--error-glow)',
                                    color: '#ef4444',
                                    fontSize: '0.7rem',
                                    cursor: showControls ? 'pointer' : 'default',
                                    border: showControls ? '1px dashed #ef4444' : 'none'
                                  }}
                                  title={showControls ? 'Click to record payment for this month' : 'Not paid'}
                                >
                                  Unpaid
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {staffList.length === 0 && (
                    <tr>
                      <td colSpan={14} style={{ textAlign: 'center', padding: '2rem' }}>No staff registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showControls && (
            <div>
              <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
                <h3 style={styles.cardHeader}>Pay Staff Salary</h3>
                <form onSubmit={handlePaySalary} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <div>
                    <label style={styles.label}>Select Staff</label>
                    <select required value={payStaffId} onChange={e => setPayStaffId(e.target.value)}>
                      <option value="">-- Select Staff --</option>
                      {staffList.map(staff => (
                        <option key={staff._id} value={staff._id}>{staff.name} ({staff.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Salary Month</label>
                    <select value={payMonth} onChange={e => setPayMonth(e.target.value)}>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Salary Year</label>
                    <input type="text" disabled value={salaryYear} />
                  </div>
                  <div>
                    <label style={styles.label}>Amount Paid (₦)</label>
                    <input type="number" required value={payAmount} onChange={e => setPayAmount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={styles.label}>Transaction Reference</label>
                    <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. Bank Transfer Ref" />
                  </div>
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: 'var(--success)' }}>Record Salary Payment</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AccountantDashboardViewProps {
  schoolSettings: any;
  currentUser: User | null;
  onLogout: () => void;
  theme?: string;
  onToggleTheme?: () => void;
}

function AccountantDashboardView({
  schoolSettings,
  currentUser,
  onLogout,
  theme = 'light',
  onToggleTheme
}: AccountantDashboardViewProps) {
  const [activeFinTab, setActiveFinTab] = useState<'billing' | 'expenses' | 'reserves' | 'expected' | 'salaries'>('billing');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="dashboard-wrapper">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      <header className="mobile-admin-header">
        <button className="hamburger-btn" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} aria-label="Toggle navigation menu">
          {isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-admin-brand">
          <img src="/logo.png" alt="DSH Logo" className="logo-circle" style={{ objectFit: 'cover', border: '1px solid var(--border)' }} />
          <span className="brand-title">{schoolSettings?.schoolName || 'Finance Portal'}</span>
        </div>
        <button 
          className="theme-toggle-btn" 
          onClick={onToggleTheme} 
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{ padding: '0.4rem', border: '1.5px solid var(--border)', marginRight: '0.25rem' }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      <aside className={`dashboard-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="DSH Logo" className="logo-circle" style={{ objectFit: 'cover', border: '1.5px solid var(--border)' }} />
          <div>
            <div className="brand-arabic">دار صغار الحفاظ</div>
            <h1 className="brand-title">{schoolSettings?.schoolName || 'Finance Portal'}</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-btn ${activeFinTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveFinTab('billing'); setIsMobileSidebarOpen(false); }}>
            <FileText size={16} /> Invoices & Billings
          </button>
          <button className={`sidebar-btn ${activeFinTab === 'expenses' ? 'active' : ''}`} onClick={() => { setActiveFinTab('expenses'); setIsMobileSidebarOpen(false); }}>
            <TrendingUp size={16} /> Operating Expenses
          </button>
          <button className={`sidebar-btn ${activeFinTab === 'reserves' ? 'active' : ''}`} onClick={() => { setActiveFinTab('reserves'); setIsMobileSidebarOpen(false); }}>
            <DollarSign size={16} /> Financial Reserves
          </button>
          <button className={`sidebar-btn ${activeFinTab === 'expected' ? 'active' : ''}`} onClick={() => { setActiveFinTab('expected'); setIsMobileSidebarOpen(false); }}>
            <Calendar size={16} /> Expected Fees
          </button>
          <button className={`sidebar-btn ${activeFinTab === 'salaries' ? 'active' : ''}`} onClick={() => { setActiveFinTab('salaries'); setIsMobileSidebarOpen(false); }}>
            <CreditCard size={16} /> Staff Salary Registry
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', width: '100%' }}>
            <div className="user-profile">
              <span className="user-name">{currentUser?.name || 'Accountant'}</span>
              <span className="user-role">{currentUser?.role || 'ACCOUNTANT'}</span>
            </div>
            <button 
              className="theme-toggle-btn" 
              onClick={onToggleTheme} 
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              style={{ border: '1.5px solid var(--border)', padding: '0.4rem' }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Log Out
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <DollarSign size={28} color="var(--primary)" /> Accountant: {
            activeFinTab === 'billing' ? 'Invoices & Billings' :
            activeFinTab === 'expenses' ? 'Operating Expenses' :
            activeFinTab === 'reserves' ? 'Financial Reserves' :
            activeFinTab === 'expected' ? 'Expected Fees' :
            'Staff Salary Registry'
          }
        </h2>
        
        <FinanceLedgerView showControls={true} activeTabOverride={activeFinTab} />
      </main>
    </div>
  );
}

// ==========================================
// 6. DIRECTOR DASHBOARD VIEW
// ==========================================
function DirectorDashboardView({ schoolSettings }: { schoolSettings: any }) {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDirTab, setActiveDirTab] = useState<'overview' | 'finances'>('overview');
  const [selectedTerm, setSelectedTerm] = useState(schoolSettings?.currentTerm || 'Second Term');
  const [selectedYear, setSelectedYear] = useState(schoolSettings?.currentAcademicYear || '2025/2026');

  // Briefing Cache
  const [advisorBriefingText, setAdvisorBriefingText] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const [activeResult, setActiveResult] = useState<Result | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);

  const openResultSheet = (result: Result) => {
    setActiveResult(result);
    setShowResultSheet(true);
  };

  useEffect(() => {
    if (schoolSettings) {
      setSelectedTerm(schoolSettings.currentTerm || 'Second Term');
      setSelectedYear(schoolSettings.currentAcademicYear || '2025/2026');
    }
  }, [schoolSettings]);

  useEffect(() => {
    fetchExecutiveOverview();
  }, [selectedTerm, selectedYear]);

  const fetchExecutiveOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/director/overview?term=${selectedTerm}&academicYear=${selectedYear}`);
      setOverview(res.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResult = async (id: string) => {
    try {
      await api.patch(`/admin/results/${id}/status`, { isApproved: true });
      fetchExecutiveOverview();
      alert('Report card approved successfully!');
    } catch (err) {
      alert('Approval failed.');
    }
  };

  // GEMINI AI INTEGRATION
  const handleGenerateAdvisorBriefing = async () => {
    setAdvisorLoading(true);
    setAdvisorBriefingText('');
    try {
      const response = await api.get(`/ai/director-briefing?term=${selectedTerm}&academicYear=${selectedYear}`);
      if (response.data && response.data.briefing) {
        setAdvisorBriefingText(response.data.briefing);
      }
    } catch (err) {
      alert('Failed to contact Daru sigar AI Assistant. Check configuration.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <span>Loading Executive Overview metrics...</span>
      </div>
    );
  }

  const collectionsPct = overview?.financials?.totalBillings > 0 
    ? Math.round((overview.financials.totalPaid / overview.financials.totalBillings) * 100)
    : 0;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={28} color="var(--primary)" /> Executive Director & Proprietor Dashboard
      </h2>

      {/* SCOPE TERM SELECTOR HEADER */}
      <div className="glass" style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--border)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Active View Session:
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Academic Year</label>
            <select
              style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Term</label>
            <select
              style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* DIRECTOR TABS */}
      <div style={styles.curriculumTabs}>
        <button style={activeDirTab === 'overview' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveDirTab('overview')}>
          Overview Dashboard
        </button>
        <button style={activeDirTab === 'finances' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveDirTab('finances')}>
          Finances Ledger
        </button>
      </div>

      {activeDirTab === 'overview' ? (
        <>
          {/* OVERVIEW STATS CARDS */}
          <div style={styles.dashboardStatsRow} className="grid-cols-4">
            <div style={styles.statCard}>
              <div style={styles.statCardLabel}>Active Students Roll</div>
              <div style={styles.statCardValue}>{overview?.counts?.students || 0}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statCardLabel}>Staff & Faculty Count</div>
              <div style={styles.statCardValue}>{overview?.counts?.teachers || 0}</div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid var(--primary)' }}>
              <div style={styles.statCardLabel}>Total Collections Rate</div>
              <div style={styles.statCardValue}>{collectionsPct}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                 ₦{(overview?.financials?.totalPaid || 0).toLocaleString()} of ₦{(overview?.financials?.totalBillings || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ ...styles.statCard, borderLeft: '4px solid var(--secondary)' }}>
              <div style={styles.statCardLabel}>Average Score (School)</div>
              <div style={styles.statCardValue}>{Math.round(overview?.averageScore || 0)}%</div>
            </div>
          </div>

          {/* STRATEGIC ADVISOR */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <Brain size={22} />
                  AI Strategic Executive Briefing
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Daru sigar AI Assistant analyzes all dual-curriculum report card metrics and school accounts collections to draft a strategic brief.
                </p>
              </div>
              <button style={styles.navButton} onClick={handleGenerateAdvisorBriefing} disabled={advisorLoading}>
                {advisorLoading ? 'Consulting Daru sigar AI Assistant...' : 'Request Proprietor Strategic Review'}
              </button>
            </div>

            {advisorBriefingText && (
              <div style={styles.aiForecastBox}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  Daru sigar AI Assistant: Strategic Term Recommendation Briefing
                </h4>
                <div style={{ lineHeight: '1.6', fontSize: '0.9rem' }}>
                  {renderFormattedText(advisorBriefingText)}
                </div>
              </div>
            )}
          </div>

          {/* LOWER GRID */}
          <div className="grid-cols-2">
            {/* APPROVAL QUEUE */}
            <div>
              <h3 style={styles.cardHeader}>Pending Report Card Approvals</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {overview?.pendingResults?.map((r: any) => (
                  <div key={r._id} className="glass flex-between" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <h4 style={{ fontWeight: 'bold' }}>{r.studentId?.name || 'Student'}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Level {r.level}-{r.section} | Term: {r.term} | Avg Score: {r.finalAverage}%
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={styles.navButton} onClick={() => openResultSheet(r)}>
                        View
                      </button>
                      <button style={styles.approveBtn} onClick={() => handleApproveResult(r._id)}>
                        Approve Sheet
                      </button>
                    </div>
                  </div>
                ))}
                {(!overview?.pendingResults || overview.pendingResults.length === 0) && (
                  <div style={styles.emptyContainer}>
                    <Check size={28} color="var(--success)" />
                    <p>No report cards awaiting director approval. Excellent!</p>
                  </div>
                )}
              </div>
            </div>

            {/* SYSTEM ACTIVITIES */}
            <div>
              <h3 style={styles.cardHeader}>Recent Administrative Audits</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {overview?.recentLogs?.map((log: any, i: number) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>{log.user || 'System'}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ marginTop: '0.25rem', fontWeight: '500' }}>{log.action}</p>
                  </div>
                ))}
                {(!overview?.recentLogs || overview.recentLogs.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent audit events.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <FinanceLedgerView showControls={false} />
        </div>
      )}

      {showResultSheet && activeResult && (
        <ResultSheetViewerModal 
          result={activeResult} 
          token={authService.getToken()} 
          onClose={() => setShowResultSheet(false)} 
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
}

// ==========================================
// STYLES OBJECT - VANILLA STYLE CSS PROPERTIES
// ==========================================
const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: 'var(--bg-card)',
    borderBottom: '2.5px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: 'var(--shadow-sm)',
    transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer'
  },
  logoCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  headerArabic: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: 'var(--primary)',
    letterSpacing: '0.5px'
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'var(--text-main)',
    margin: 0
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontSize: '0.8rem',
    lineHeight: '1.2'
  },
  userName: {
    fontWeight: '600',
    color: 'var(--text-main)'
  },
  userBadge: {
    color: 'var(--secondary-dark)',
    fontWeight: 'bold',
    fontSize: '0.7rem'
  },
  navButton: {
    padding: '0.5rem 1rem',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-main)'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    border: '1.5px solid #ef4444',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: 'var(--error-glow)',
    color: '#ef4444'
  },
  loginBtn: {
    padding: '0.5rem 1.25rem',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    border: '1.5px solid var(--primary)',
    boxShadow: 'var(--shadow-sm)'
  },
  marqueeContainer: {
    backgroundColor: 'var(--primary-glow)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem 1.5rem',
    fontSize: '0.85rem',
    overflow: 'hidden'
  },
  marqueeHeader: {
    fontWeight: 'bold',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    marginRight: '1rem'
  },
  marqueeBody: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative'
  },
  marqueeText: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    animation: 'fadeIn 0.5s ease-in-out'
  },
  heroSection: {
    background: 'radial-gradient(circle at 10% 20%, rgba(30, 86, 49, 0.05) 0%, rgba(212, 175, 55, 0.05) 90%)',
    borderBottom: '1px solid var(--border)'
  },
  heroBadge: {
    display: 'inline-block',
    padding: '0.4rem 1rem',
    backgroundColor: 'var(--primary-glow)',
    color: 'var(--primary-light)',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-full)',
    marginBottom: '1rem'
  },
  heroHeadline: {
    fontSize: '2.5rem',
    color: 'var(--primary-dark)',
    fontWeight: '800',
    marginBottom: '1rem',
    lineHeight: '1.2'
  },
  heroSubtext: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
    lineHeight: '1.6'
  },
  heroPrimaryBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'bold',
    boxShadow: 'var(--shadow-md)'
  },
  heroSecondaryBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'var(--primary)',
    border: '1.5px solid var(--primary)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: '1.75rem',
    textAlign: 'center',
    color: 'var(--primary-dark)',
    marginBottom: '0.5rem'
  },
  sectionSubtitle: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    marginBottom: '2rem'
  },
  curriculumTabs: {
    display: 'flex',
    backgroundColor: 'var(--bg-base)',
    padding: '0.35rem',
    borderRadius: 'var(--radius-md)',
    gap: '0.25rem',
    maxWidth: '500px',
    margin: '0 auto 1.5rem auto',
    border: '1px solid var(--border)'
  },
  curriculumTab: {
    flex: 1,
    padding: '0.6rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)'
  },
  curriculumTabActive: {
    flex: 1,
    padding: '0.6rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)'
  },
  curriculumCard: {
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    boxShadow: 'var(--shadow-lg)'
  },
  cardHeader: {
    fontSize: '1.35rem',
    color: 'var(--primary)',
    marginBottom: '1rem'
  },
  cardBodyText: {
    color: 'var(--text-muted)',
    lineHeight: '1.7',
    marginBottom: '1.5rem'
  },
  cardList: {
    listStyleType: 'square',
    paddingLeft: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    color: 'var(--text-main)'
  },
  arabicShowcase: {
    backgroundColor: 'var(--primary-dark)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem',
    textAlign: 'center'
  },
  arabicLogoLarge: {
    fontSize: '2.25rem',
    fontFamily: 'var(--font-arabic)',
    fontWeight: 'bold',
    color: 'var(--secondary)',
    marginBottom: '1rem'
  },
  arabicVerse: {
    fontFamily: 'var(--font-arabic)',
    fontSize: '1.5rem',
    lineHeight: '1.6',
    marginBottom: '0.5rem'
  },
  arabicTranslation: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic'
  },
  secularShowcase: {
    background: 'linear-gradient(135deg, var(--primary-glow) 0%, var(--secondary-glow) 100%)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  statsRow: {
    display: 'flex',
    gap: '2rem',
    textAlign: 'center'
  },
  statCell: {
    display: 'flex',
    flexDirection: 'column'
  },
  statNum: {
    fontSize: '2.25rem',
    fontWeight: '800',
    color: 'var(--primary-light)'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)'
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1.5rem'
  },
  infoBadge: {
    padding: '0.4rem 1rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.85rem',
    fontWeight: '500'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1.5rem'
  },
  loginModal: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-xl)',
    border: '1.5px solid var(--border)',
    textAlign: 'left'
  },
  closeBtn: {
    padding: '0.25rem',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)'
  },
  modalTabs: {
    display: 'flex',
    backgroundColor: 'var(--bg-base)',
    padding: '0.25rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1.5rem',
    border: '1px solid var(--border)'
  },
  modalTab: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)'
  },
  modalTabActive: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)'
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '0.4rem'
  },
  submitBtn: {
    padding: '0.75rem',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    marginTop: '0.5rem',
    boxShadow: 'var(--shadow-md)'
  },
  submitBtnParent: {
    padding: '0.75rem',
    backgroundColor: 'var(--secondary-dark)',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    marginTop: '0.5rem',
    boxShadow: 'var(--shadow-md)'
  },
  errorAlert: {
    backgroundColor: 'var(--error-glow)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    textAlign: 'center'
  },
  dashboardStatsRow: {
    marginBottom: '1.5rem'
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    border: '1.5px solid var(--border)',
    boxShadow: 'var(--shadow-sm)'
  },
  statCardLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)'
  },
  statCardValue: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: 'var(--text-main)',
    marginTop: '0.25rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-card)',
    marginTop: '1rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    textAlign: 'left'
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    textAlign: 'left'
  },
  deleteBtn: {
    padding: '0.35rem 0.75rem',
    backgroundColor: 'var(--error-glow)',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem'
  },
  approveBtn: {
    padding: '0.35rem 0.75rem',
    backgroundColor: 'var(--primary-glow)',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  rejectBtn: {
    padding: '0.35rem 0.75rem',
    backgroundColor: 'var(--secondary-glow)',
    color: 'var(--secondary-dark)',
    border: '1px solid var(--secondary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  statusBadgeApproved: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--success-glow)',
    color: 'var(--success)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  statusBadgePending: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--warning-glow)',
    color: 'var(--warning)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  statusBadgeUnpaid: {
    display: 'inline-block',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--error-glow)',
    color: 'var(--error)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  studentListItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
  },
  formSectionHeader: {
    fontSize: '1.1rem',
    color: 'var(--primary)',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '0.4rem',
    marginBottom: '1rem',
    fontWeight: '600'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    gap: '1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)'
  },
  reportModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '2rem'
  },
  reportCardSheet: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '2rem',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-xl)',
    border: '1.5px solid var(--border)'
  },
  cardPreviewBody: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    color: '#000',
    padding: '1.5rem',
    border: '2px solid var(--primary)'
  },
  reportSheetHeader: {
    textAlign: 'center',
    borderBottom: '2.5px double var(--primary)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem'
  },
  reportMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    fontSize: '0.85rem',
    borderBottom: '1.5px solid var(--primary)',
    paddingBottom: '0.75rem',
    marginBottom: '1.25rem'
  },
  reportMainLayout: {
    display: 'flex',
    gap: '1.5rem'
  },
  reportSectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: 'var(--primary-dark)',
    borderBottom: '1.5px solid var(--primary-light)',
    paddingBottom: '0.25rem',
    marginBottom: '0.5rem'
  },
  tahfeezhProgressGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.85rem',
    backgroundColor: 'var(--bg-base)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)'
  },
  reportSheetFooterComments: {
    marginTop: '1.5rem',
    backgroundColor: 'var(--bg-base)',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: '0.85rem'
  },
  aiForecastBox: {
    backgroundColor: 'var(--primary-glow)',
    border: '1px solid var(--primary-light)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
    marginTop: '1rem',
    animation: 'fadeIn 0.4s ease'
  },
  footer: {
    backgroundColor: 'var(--bg-card)',
    borderTop: '1px solid var(--border)',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: 'auto'
  }
};
