import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, DollarSign, Brain, FileText, Check, X, Shield, 
  Lock, Bell, LogOut, ArrowRight, Download, Award, TrendingUp, Info, Menu
} from 'lucide-react';
import api, { authService } from './services/api';
import { SURAHS } from './utils/surahs';

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
  payments: { amount: number; date: string; reference: string }[];
  createdAt: string;
}

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  targetRole: string;
  createdBy: string;
  createdAt: string;
}

export default function App() {
  // Navigation & User session states
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Public Announcements state
  const [publicNotifications, setPublicNotifications] = useState<Notification[]>([]);
  const [curriculumTab, setCurriculumTab] = useState<'tahfeezh' | 'academic' | 'about'>('tahfeezh');

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
      <header className="nav-header">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => { setActiveTab('landing'); setIsMenuOpen(false); }}>
            <div className="nav-logo-circle">DSH</div>
            <div>
              <div className="nav-header-arabic">دار صغار الحفاظ</div>
              <h1 className="nav-header-title">HOME OF YOUNG HUFFAZ ACADEMY</h1>
            </div>
          </div>

          <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle navigation menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`nav-actions ${isMenuOpen ? 'open' : ''}`}>
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
          />
        )}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && <AdminDashboardView />}
        {activeTab === 'teacher' && currentUser?.role === 'TEACHER' && <TeacherDashboardView teacher={currentUser} />}
        {activeTab === 'parent' && currentUser?.role === 'PARENT' && <ParentDashboardView parent={currentUser as unknown as Student} token={token} />}
        {activeTab === 'accountant' && currentUser?.role === 'ACCOUNTANT' && <AccountantDashboardView />}
        {activeTab === 'director' && currentUser?.role === 'DIRECTOR' && <DirectorDashboardView />}
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div className="container flex-between" style={{ padding: '1.5rem' }}>
          <p>© 2026 Home of Young Huffaz Academy, Abuja, Nigeria. All Rights Reserved.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Dual-Curriculum: Islamic/Tahfeezh & Secular Academic</span>
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div className="animate-scale-in" style={styles.loginModal}>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={22} color="var(--primary)" />
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
function LandingView({ curriculumTab, setCurriculumTab, onOpenLogin }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '800px', padding: '4rem 1.5rem' }}>
          <span style={styles.heroBadge}>Home of Young Huffaz Academy</span>
          <h2 style={styles.heroHeadline}>Islamic Dual-Curriculum Education for Outstanding Young Learners</h2>
          <p style={styles.heroSubtext}>
            Nurturing young minds in Abuja, Nigeria with the noble Hifz Al-Qur'an memorization curriculum alongside complete, high-standard Secular Academic training.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button style={styles.heroPrimaryBtn} onClick={onOpenLogin}>
              Access Student Reports <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
            </button>
            <button style={styles.heroSecondaryBtn} onClick={() => setCurriculumTab('tahfeezh')}>
              Explore Curriculum
            </button>
          </div>
        </div>
      </section>

      {/* CURRICULUM EXPLORER */}
      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <h3 style={styles.sectionTitle}>Dual-Curriculum System</h3>
        <p style={styles.sectionSubtitle}>Discover how we balance sacred Islamic knowledge with worldly excellence.</p>
        
        {/* TABS */}
        <div style={styles.curriculumTabs}>
          <button 
            style={curriculumTab === 'tahfeezh' ? styles.curriculumTabActive : styles.curriculumTab}
            onClick={() => setCurriculumTab('tahfeezh')}
          >
            <BookOpen size={18} style={{ marginRight: '0.5rem' }} /> Qur'an & Tahfeezh
          </button>
          <button 
            style={curriculumTab === 'academic' ? styles.curriculumTabActive : styles.curriculumTab}
            onClick={() => setCurriculumTab('academic')}
          >
            <Award size={18} style={{ marginRight: '0.5rem' }} /> Secular Academics
          </button>
          <button 
            style={curriculumTab === 'about' ? styles.curriculumTabActive : styles.curriculumTab}
            onClick={() => setCurriculumTab('about')}
          >
            <Info size={18} style={{ marginRight: '0.5rem' }} /> Academy Overview
          </button>
        </div>

        {/* TAB BODY */}
        <div className="glass" style={styles.curriculumCard}>
          {curriculumTab === 'tahfeezh' && (
            <div className="grid-cols-2">
              <div>
                <h4 style={styles.cardHeader}>Sacred Tahfeezh Foundation</h4>
                <p style={styles.cardBodyText}>
                  Our main focal point is the thorough memorization (Hifz) of the Holy Qur'an with proper rules of Tajweed. We keep small, focused class sizes allowing teachers to follow up daily on each student's recitation correctness, sound, and page-by-page progress.
                </p>
                <ul style={styles.cardList}>
                  <li>daily Qur'an Hifz and revision (Muruja'ah)</li>
                  <li>Arabic Writing and Orthography (القرآن كتابة)</li>
                  <li>Tajweed principles and recitation performance</li>
                  <li>Islamic values, Manners (Adab), and core beliefs</li>
                </ul>
              </div>
              <div style={styles.arabicShowcase}>
                <div style={styles.arabicLogoLarge}>دار صغار الحفاظ</div>
                <div style={styles.arabicVerse}>"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ"</div>
                <div style={styles.arabicTranslation}>"The best of you is he who learns the Qur'an and teaches it."</div>
              </div>
            </div>
          )}

          {curriculumTab === 'academic' && (
            <div className="grid-cols-2">
              <div>
                <h4 style={styles.cardHeader}>Rigorous Secular Curriculum</h4>
                <p style={styles.cardBodyText}>
                  Alongside spiritual growth, we provide a complete educational package that prepares our learners to compete globally in academic disciplines.
                </p>
                <ul style={styles.cardList}>
                  <li><strong>Numeracy & Mathematics:</strong> Logic and arithmetic logic</li>
                  <li><strong>Literacy & English:</strong> Critical reading and comprehension</li>
                  <li><strong>Science:</strong> Biology, Physics, and environmental science basics</li>
                  <li><strong>Phonics & Phonetics:</strong> Foundation for speech clarity</li>
                  <li><strong>Social Habits:</strong> Civic duties, community respect, hygiene</li>
                </ul>
              </div>
              <div style={styles.secularShowcase}>
                <div style={styles.statsRow}>
                  <div style={styles.statCell}>
                    <span style={styles.statNum}>100%</span>
                    <span style={styles.statLabel}>English & Arabic Bilingual</span>
                  </div>
                  <div style={styles.statCell}>
                    <span style={styles.statNum}>1:15</span>
                    <span style={styles.statLabel}>Student-Teacher Ratio</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {curriculumTab === 'about' && (
            <div style={{ padding: '1rem 0' }}>
              <h4 style={styles.cardHeader}>Home of Young Huffaz Academy</h4>
              <p style={{ ...styles.cardBodyText, maxWidth: '800px' }}>
                Established in Abuja, Nigeria, Home of Young Huffaz Academy has grown into a leading institution for kids' Islamic and academic education. Our mission is to produce children who memorize the Quran and possess the highest level of academic knowledge, combined with moral uprightness and integrity.
              </p>
              <div style={styles.badgeRow}>
                <span style={styles.infoBadge}>📍 Abuja, Nigeria</span>
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
function AdminDashboardView() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'teachers' | 'students' | 'results' | 'announcements'>('teachers');


  // Forms states
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherLevel, setNewTeacherLevel] = useState('5');
  const [newTeacherSection, setNewTeacherSection] = useState('ALLO');

  const [studentCsvFile, setStudentCsvFile] = useState<string>(''); // Base64 or Text representation
  const [uploadStatus, setUploadStatus] = useState('');
  const [studentAddMode, setStudentAddMode] = useState<'csv' | 'manual'>('csv');
  const [manualStudent, setManualStudent] = useState({
    name: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: '2025/2026',
    parentPin: '',
    schoolFees: ''
  });

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: '',
    parentPin: '',
    schoolFees: 0
  });

  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [newNotifRole, setNewNotifRole] = useState('ALL');

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchResults();
    fetchAdminNotifications();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/admin/teachers');
      setTeachers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await api.get('/admin/results');
      setResults(res.data?.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setAdminNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/teachers', {
        name: newTeacherName,
        username: newTeacherUsername,
        password: newTeacherPassword,
        assignedClasses: [{ level: newTeacherLevel, section: newTeacherSection }]
      });
      setNewTeacherName('');
      setNewTeacherUsername('');
      setNewTeacherPassword('');
      fetchTeachers();
      alert('Teacher created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create teacher');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      alert('Failed to delete teacher');
    }
  };

  const handleToggleResult = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/results/${id}/status`, { isApproved: !currentStatus });
      fetchResults();
    } catch (err) {
      alert('Failed to update result status');
    }
  };

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Are you sure you want to delete this result sheet?')) return;
    try {
      await api.delete(`/admin/results/${id}`);
      fetchResults();
    } catch (err) {
      alert('Failed to delete result');
    }
  };

  const handleUploadStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCsvFile.trim()) {
      alert('Please enter CSV data');
      return;
    }
    try {
      setUploadStatus('Uploading...');
      await api.post('/admin/students/upload', { csvData: studentCsvFile });
      setUploadStatus('Upload successful!');
      setStudentCsvFile('');
      fetchStudents();
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'CSV parse or upload failed.');
    }
  };

  const startEditStudent = (s: Student) => {
    setEditingStudent(s);
    setEditStudentForm({
      name: s.name,
      admissionNumber: s.admissionNumber,
      level: s.level,
      section: s.section,
      academicYear: s.academicYear,
      parentPin: s.parentPin,
      schoolFees: s.schoolFees || 0
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setUploadStatus('Updating student...');
      await api.put(`/admin/students/${editingStudent._id}`, editStudentForm);
      setUploadStatus('Student updated successfully!');
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'Failed to update student.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      setUploadStatus('Deleting student...');
      await api.delete(`/admin/students/${id}`);
      setUploadStatus('Student deleted successfully!');
      fetchStudents();
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  const handleAddStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, admissionNumber, level, section, academicYear, parentPin, schoolFees } = manualStudent;
    if (!name.trim() || !admissionNumber.trim() || !level.trim() || !section.trim() || !academicYear.trim()) {
      alert('Please fill all required fields');
      return;
    }
    try {
      setUploadStatus('Adding student...');
      const payload = {
        students: [
          {
            name: name.trim(),
            admissionNumber: admissionNumber.trim(),
            level: level.trim(),
            section: section.trim(),
            academicYear: academicYear.trim(),
            parentPin: parentPin.trim() || undefined,
            schoolFees: schoolFees ? Number(schoolFees) : 0
          }
        ]
      };
      const response = await api.post('/admin/students/upload', payload);
      const { uploaded, skipped } = response.data;
      if (uploaded && uploaded.length > 0) {
        setUploadStatus(`Student added successfully! Parent PIN: ${uploaded[0].pin}`);
        setManualStudent({
          name: '',
          admissionNumber: '',
          level: '',
          section: '',
          academicYear: '2025/2026',
          parentPin: '',
          schoolFees: ''
        });
        fetchStudents();
      } else if (skipped && skipped.length > 0) {
        setUploadStatus(`Failed: ${skipped[0].reason}`);
      } else {
        setUploadStatus('Could not add student.');
      }
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'Failed to add student.');
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications', {
        title: newNotifTitle,
        message: newNotifMessage,
        targetRole: newNotifRole
      });
      setNewNotifTitle('');
      setNewNotifMessage('');
      fetchAdminNotifications();
      alert('Notification sent!');
    } catch (err) {
      alert('Failed to send notification');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/admin/notifications/${id}`);
      fetchAdminNotifications();
    } catch (err) {
      alert('Failed to delete notification');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={28} color="var(--primary)" /> Administrator Management Dashboard
      </h2>

      {/* ADMIN INNER TABS */}
      <div style={styles.curriculumTabs}>
        <button style={activeAdminSubTab === 'teachers' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveAdminSubTab('teachers')}>
          Teachers ({teachers.length})
        </button>
        <button style={activeAdminSubTab === 'students' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveAdminSubTab('students')}>
          Students ({students.length})
        </button>
        <button style={activeAdminSubTab === 'results' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveAdminSubTab('results')}>
          Results Approval ({results.filter(r => !r.isApproved).length} pending)
        </button>
        <button style={activeAdminSubTab === 'announcements' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveAdminSubTab('announcements')}>
          Announcements
        </button>
      </div>

      {/* TEACHERS TAB */}
      {activeAdminSubTab === 'teachers' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Registered Faculty</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Assigned Classes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t._id}>
                      <td>{t.name}</td>
                      <td><code>{t.username}</code></td>
                      <td>
                        {t.assignedClasses?.map(c => `Lvl ${c.level}-${c.section}`).join(', ') || 'None'}
                      </td>
                      <td>
                        <button style={styles.deleteBtn} onClick={() => handleDeleteTeacher(t._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={styles.cardHeader}>Register New Teacher</h3>
              <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={styles.label}>Full Name</label>
                  <input type="text" required value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="e.g. Khansau Abdullahi" />
                </div>
                <div>
                  <label style={styles.label}>Username</label>
                  <input type="text" required value={newTeacherUsername} onChange={e => setNewTeacherUsername(e.target.value)} placeholder="e.g. khansau" />
                </div>
                <div>
                  <label style={styles.label}>Password</label>
                  <input type="password" required value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Class Level</label>
                    <select value={newTeacherLevel} onChange={e => setNewTeacherLevel(e.target.value)}>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                      <option value="5">Level 5</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Section</label>
                    <select value={newTeacherSection} onChange={e => setNewTeacherSection(e.target.value)}>
                      <option value="ALLO">ALLO</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style={styles.submitBtn}>Save Faculty Account</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeAdminSubTab === 'students' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Student Roll Call</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Adm Number</th>
                    <th>Class</th>
                    <th>Parent PIN</th>
                    <th>School Fees</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td><code>{s.admissionNumber}</code></td>
                      <td>Level {s.level} - {s.section}</td>
                      <td><code>{s.parentPin}</code></td>
                      <td>₦{(s.schoolFees || 0).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #16a34a',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }} 
                            onClick={() => startEditStudent(s)}
                          >
                            Edit
                          </button>
                          <button 
                            type="button" 
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#fff5f5',
                              color: '#ef4444',
                              border: '1px solid #ef4444',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }} 
                            onClick={() => handleDeleteStudent(s._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={styles.cardHeader}>Manage Students</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.05)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
                <button 
                  type="button" 
                  onClick={() => { setStudentAddMode('csv'); setUploadStatus(''); }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: studentAddMode === 'csv' ? 'var(--primary-color)' : 'transparent',
                    color: studentAddMode === 'csv' ? '#fff' : 'var(--text-color)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Bulk CSV Upload
                </button>
                <button 
                  type="button" 
                  onClick={() => { setStudentAddMode('manual'); setUploadStatus(''); }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: studentAddMode === 'manual' ? 'var(--primary-color)' : 'transparent',
                    color: studentAddMode === 'manual' ? '#fff' : 'var(--text-color)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Manual Add
                </button>
              </div>

              {studentAddMode === 'csv' ? (
                <form onSubmit={handleUploadStudents} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Paste raw CSV data: <code>name,admissionNumber,level,section,parentPin,schoolFees</code>
                  </p>
                  <textarea 
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    placeholder="AMAANI YAHUZA,DSH/015,5,ALLO,1234,180000"
                    value={studentCsvFile}
                    onChange={e => setStudentCsvFile(e.target.value)}
                  />
                  <button type="submit" style={styles.submitBtn}>Upload CSV Data</button>
                </form>
              ) : (
                <form onSubmit={handleAddStudentManual} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Amaani Yahuza"
                      value={manualStudent.name}
                      onChange={e => setManualStudent({ ...manualStudent, name: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission Number *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. DSH/015"
                      value={manualStudent.admissionNumber}
                      onChange={e => setManualStudent({ ...manualStudent, admissionNumber: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 5"
                        value={manualStudent.level}
                        onChange={e => setManualStudent({ ...manualStudent, level: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. ALLO"
                        value={manualStudent.section}
                        onChange={e => setManualStudent({ ...manualStudent, section: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Academic Year *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 2025/2026"
                        value={manualStudent.academicYear}
                        onChange={e => setManualStudent({ ...manualStudent, academicYear: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent PIN (Opt)</label>
                      <input 
                        type="text" 
                        placeholder="Autogenerated if blank"
                        value={manualStudent.parentPin}
                        onChange={e => setManualStudent({ ...manualStudent, parentPin: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>School Fees (₦)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 180000"
                      value={manualStudent.schoolFees}
                      onChange={e => setManualStudent({ ...manualStudent, schoolFees: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <button type="submit" style={{ ...styles.submitBtn, marginTop: '0.5rem' }}>Add Student</button>
                </form>
              )}
              {uploadStatus && <div style={{ ...styles.badgeRow, marginTop: '1rem' }}>{uploadStatus}</div>}
            </div>
          </div>
          {editingStudent && (
            <div style={styles.modalOverlay}>
              <div style={{ ...styles.loginModal, maxWidth: '500px' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Edit Student Details</h3>
                  <button 
                    type="button" 
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                    onClick={() => setEditingStudent(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name *</label>
                    <input 
                      type="text" 
                      required
                      value={editStudentForm.name}
                      onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission Number *</label>
                    <input 
                      type="text" 
                      required
                      value={editStudentForm.admissionNumber}
                      onChange={e => setEditStudentForm({ ...editStudentForm, admissionNumber: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level *</label>
                      <input 
                        type="text" 
                        required
                        value={editStudentForm.level}
                        onChange={e => setEditStudentForm({ ...editStudentForm, level: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section *</label>
                      <input 
                        type="text" 
                        required
                        value={editStudentForm.section}
                        onChange={e => setEditStudentForm({ ...editStudentForm, section: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Academic Year *</label>
                      <input 
                        type="text" 
                        required
                        value={editStudentForm.academicYear}
                        onChange={e => setEditStudentForm({ ...editStudentForm, academicYear: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent PIN</label>
                      <input 
                        type="text" 
                        value={editStudentForm.parentPin}
                        onChange={e => setEditStudentForm({ ...editStudentForm, parentPin: e.target.value })}
                        style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>School Fees (₦)</label>
                    <input 
                      type="number" 
                      value={editStudentForm.schoolFees}
                      onChange={e => setEditStudentForm({ ...editStudentForm, schoolFees: Number(e.target.value) || 0 })}
                      style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="submit" style={{ ...styles.submitBtn, flex: 1 }}>Save Changes</button>
                    <button 
                      type="button" 
                      style={{ ...styles.deleteBtn, flex: 1, margin: 0, padding: '0.75rem' }} 
                      onClick={() => setEditingStudent(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeAdminSubTab === 'results' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={styles.cardHeader}>Academic Report Sheets Queue</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Term</th>
                  <th>Final Avg</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => {
                  const sName = typeof r.studentId === 'object' && r.studentId ? r.studentId.name : 'Unknown';
                  return (
                    <tr key={r._id}>
                      <td>{sName}</td>
                      <td>Level {r.level} - {r.section}</td>
                      <td>{r.term} ({r.academicYear})</td>
                      <td>{r.finalAverage}%</td>
                      <td>
                        <span style={r.isApproved ? styles.statusBadgeApproved : styles.statusBadgePending}>
                          {r.isApproved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            style={r.isApproved ? styles.rejectBtn : styles.approveBtn}
                            onClick={() => handleToggleResult(r._id, r.isApproved)}
                          >
                            {r.isApproved ? 'Revoke' : 'Approve'}
                          </button>
                          <button style={styles.deleteBtn} onClick={() => handleDeleteResult(r._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeAdminSubTab === 'announcements' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Announcement History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {adminNotifications.map(n => (
                <div key={n._id} className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{n.title}</h4>
                    <p style={{ margin: '0.25rem 0' }}>{n.message}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Target: {n.targetRole}</span>
                      <span>•</span>
                      <span>By: {n.createdBy}</span>
                    </div>
                  </div>
                  <button style={styles.deleteBtn} onClick={() => handleDeleteNotification(n._id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={styles.cardHeader}>Post Announcement</h3>
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={styles.label}>Broadcast Title</label>
                  <input type="text" required value={newNotifTitle} onChange={e => setNewNotifTitle(e.target.value)} placeholder="e.g. Ramadan Break Announcement" />
                </div>
                <div>
                  <label style={styles.label}>Message Content</label>
                  <textarea rows={4} required value={newNotifMessage} onChange={e => setNewNotifMessage(e.target.value)} placeholder="Enter details..." />
                </div>
                <div>
                  <label style={styles.label}>Audience Role</label>
                  <select value={newNotifRole} onChange={e => setNewNotifRole(e.target.value)}>
                    <option value="ALL">ALL (Everyone)</option>
                    <option value="TEACHER">TEACHER (Faculty only)</option>
                    <option value="PARENT">PARENT (Guardians only)</option>
                  </select>
                </div>
                <button type="submit" style={styles.submitBtn}>Dispatch Broadcast</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. TEACHER DASHBOARD VIEW
// ==========================================
function TeacherDashboardView({ teacher }: { teacher: User }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Second Term');
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

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
      alert('Failed to generate AI feedback comments. Verify backend GEMINI_API_KEY settings.');
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
        <BookOpen size={28} color="var(--primary)" /> Dual-Curriculum Academic Grading
      </h2>

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
    </div>
  );
}

// ==========================================
// 4. PARENT DASHBOARD VIEW
// ==========================================
function ParentDashboardView({ parent, token }: { parent: Student; token: string | null }) {
  const [results, setResults] = useState<Result[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeResult, setActiveResult] = useState<Result | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'results' | 'finances'>('results');

  useEffect(() => {
    fetchParentResults();
    fetchInvoices();
  }, []);

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
      const res = await api.get(`/finance/invoices`);
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

  const calculateTotalOutstanding = () => {
    return invoices.reduce((acc, curr) => acc + (curr.amount - (curr.paidAmount || 0)), 0);
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

      {/* PARENT TABS */}
      <div style={styles.curriculumTabs}>
        <button style={activeSubTab === 'results' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveSubTab('results')}>
          Report Cards & Grades
        </button>
        <button style={activeSubTab === 'finances' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveSubTab('finances')}>
          Finances & Fees ({invoices.length} Bills)
        </button>
      </div>

      {/* RESULTS LIST TAB */}
      {activeSubTab === 'results' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Published Results</h3>
            {results.length === 0 ? (
              <div style={styles.emptyContainer}>
                <FileText size={36} />
                <p>No results sheets are currently published or approved for this student.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {results.map(r => (
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
                        href={`http://localhost:5000/api/results/${r._id}/pdf?token=${token}`}
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
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
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
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>No billing statements found.</td>
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
        <div style={styles.reportModalOverlay}>
          <div className="glass" style={styles.reportCardSheet}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>Result Sheet Viewer</h3>
              <div className="flex-row">
                <a 
                  href={`http://localhost:5000/api/results/${activeResult._id}/pdf?token=${token}`}
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
                <button style={styles.closeBtn} onClick={() => setShowResultSheet(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PREVIEW REPORT CARD SHEET */}
            <div style={styles.cardPreviewBody}>
              {/* HEADER SECTION */}
              <div style={styles.reportSheetHeader}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>HOME OF YOUNG HUFFAZ ACADEMY</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-light)', fontFamily: 'var(--font-arabic)' }}>دار صغار الحفاظ</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Abuja, Nigeria | Academic Term Result Assessment</div>
              </div>

              {/* STUDENT META INFO */}
              <div className="report-meta-grid">
                <div><strong>Admission No:</strong> {parent.admissionNumber}</div>
                <div><strong>Student Name:</strong> {parent.name}</div>
                <div><strong>Class Level:</strong> {activeResult.level} - {activeResult.section}</div>
                <div><strong>Term Period:</strong> {activeResult.term}</div>
                <div><strong>Academic Year:</strong> {activeResult.academicYear}</div>
                <div><strong>Date Issued:</strong> {activeResult.dateIssued}</div>
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
                        {activeResult.subjects.filter(s => s.section === 'tahfeezh').map(s => (
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
                    <div><strong>Hifz Commenced From Surah:</strong> <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.1rem' }}>{activeResult.tahfeezhDetails?.fromSurah || '—'}</span></div>
                    <div><strong>Hifz Concluded To Surah:</strong> <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.1rem' }}>{activeResult.tahfeezhDetails?.toSurah || '—'}</span></div>
                    <div><strong>Pages Memorized This Term:</strong> {activeResult.tahfeezhDetails?.memorizedPages || 0}</div>
                    <div><strong>Absence of Hifz:</strong> {activeResult.tahfeezhDetails?.absenceOfHifz || 0} days</div>
                    <div><strong>Days Present:</strong> {activeResult.tahfeezhDetails?.daysPresent || 0}</div>
                    <div><strong>Days Absent:</strong> {activeResult.tahfeezhDetails?.daysAbsent || 0}</div>
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
                        {activeResult.subjects.filter(s => s.section === 'academic').map(s => (
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
                        {activeResult.evaluationElements.map(el => (
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
                  <strong>Teacher Recommendations:</strong> {activeResult.teacherRecommendations}
                </div>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong>Supervisor Recommendations:</strong> {activeResult.supervisorRecommendations}
                </div>
                <div>
                  <strong>Head Teacher Comments:</strong> {activeResult.headTeacherComments}
                </div>
              </div>

              {/* REPORT AGGREGATE SUMMARY */}
              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '2px solid var(--primary)', paddingTop: '1rem' }}>
                <div>Total Mark: <strong>{activeResult.totalMark}</strong></div>
                <div>Final Average: <strong>{activeResult.finalAverage}%</strong></div>
                <div>General Rating Grade: <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{activeResult.generalGrade}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. ACCOUNTANT DASHBOARD VIEW
// ==========================================
function AccountantDashboardView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeFinTab, setActiveFinTab] = useState<'billing' | 'expenses'>('billing');
  
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

  useEffect(() => {
    fetchInvoices();
    fetchExpenses();
    fetchStudents();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/finance/invoices');
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/finance/expenses');
      setExpenses(res.data?.expenses || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
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
        isBatch: isBatchBilling
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
        date: expenseDate
      });
      alert('Expense recorded successfully!');
      setExpenseAmount(0);
      setExpenseDescription('');
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Expense entry failed');
    }
  };

  // GEMINI AI INTEGRATION
  const handleGenerateForecast = async () => {
    setAiForecastLoading(true);
    setAiForecastText('');
    try {
      const response = await api.get('/ai/finance-forecast');
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
    const totalBilled = invoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCollected = invoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const outstanding = totalBilled - totalCollected;
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const reserves = totalCollected - totalExpenses;
    return { totalBilled, totalCollected, outstanding, totalExpenses, reserves };
  };

  const aggregates = calculateFinanceAggregates();

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <DollarSign size={28} color="var(--primary)" /> Academy Finance & Accounting Panel
      </h2>

      {/* FINANCIAL STATS CARDS */}
      <div style={styles.dashboardStatsRow} className="grid-cols-4">
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
          <div style={styles.statCardLabel}>Operating Expenses</div>
          <div style={styles.statCardValue}>₦{aggregates.totalExpenses.toLocaleString()}</div>
        </div>
      </div>

      {/* FORECASTING & ADVISOR */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Brain size={22} />
              AI Reserve & Cash Flow Forecasting
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Uses Gemini-1.5-flash to analyze all billings, actual collections, and expenses to draft budgets.
            </p>
          </div>
          <button style={styles.navButton} onClick={handleGenerateForecast} disabled={aiForecastLoading}>
            {aiForecastLoading ? 'Consulting Gemini...' : 'Analyze Financial Reserves'}
          </button>
        </div>

        {aiForecastText && (
          <div style={styles.aiForecastBox}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Gemini Financial Assessment Report:
            </h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem' }}>{aiForecastText}</p>
          </div>
        )}
      </div>

      {/* ACCOUNTANT TABS */}
      <div style={styles.curriculumTabs}>
        <button style={activeFinTab === 'billing' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('billing')}>
          Invoices & Billings Ledger
        </button>
        <button style={activeFinTab === 'expenses' ? styles.curriculumTabActive : styles.curriculumTab} onClick={() => setActiveFinTab('expenses')}>
          Operating Expenses Ledger
        </button>
      </div>

      {/* BILLING LEDGER TAB */}
      {activeFinTab === 'billing' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Invoices Registry</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Description</th>
                    <th>Due Date</th>
                    <th>Billed</th>
                    <th>Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const studentName = inv.studentId ? inv.studentId.name : 'Unknown';
                    return (
                      <tr key={inv._id}>
                        <td>{studentName}</td>
                        <td>{inv.description}</td>
                        <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td>₦{inv.amount.toLocaleString()}</td>
                        <td>₦{(inv.paidAmount || 0).toLocaleString()}</td>
                        <td>
                          <span style={
                            inv.status === 'PAID' ? styles.statusBadgeApproved : 
                            inv.status === 'PARTIALLY_PAID' ? styles.statusBadgePending : 
                            styles.statusBadgeUnpaid
                          }>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
        </div>
      )}

      {/* EXPENSES LEDGER TAB */}
      {activeFinTab === 'expenses' && (
        <div style={{ marginTop: '1.5rem' }} className="grid-cols-3">
          <div className="span-2-desktop">
            <h3 style={styles.cardHeader}>Operating Expenses Registry</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
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
                      <td>{exp.category}</td>
                      <td>{exp.description}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 'bold' }}>-₦{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center' }}>No expenses recorded this term.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. DIRECTOR DASHBOARD VIEW
// ==========================================
function DirectorDashboardView() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Briefing Cache
  const [advisorBriefingText, setAdvisorBriefingText] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);

  useEffect(() => {
    fetchExecutiveOverview();
  }, []);

  const fetchExecutiveOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/director/overview');
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
      const response = await api.get('/ai/director-briefing');
      if (response.data && response.data.briefing) {
        setAdvisorBriefingText(response.data.briefing);
      }
    } catch (err) {
      alert('Failed to contact Gemini Strategic Advisor. Check GEMINI_API_KEY configuration.');
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

      {/* STRATEGIC ADVOSOR */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Brain size={22} />
              AI Strategic Executive Briefing
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Gemini-1.5-flash analyzes all dual-curriculum report card metrics and school accounts collections to draft a strategic brief.
            </p>
          </div>
          <button style={styles.navButton} onClick={handleGenerateAdvisorBriefing} disabled={advisorLoading}>
            {advisorLoading ? 'Consulting Advisor...' : 'Request Proprietor Strategic Review'}
          </button>
        </div>

        {advisorBriefingText && (
          <div style={styles.aiForecastBox}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Gemini Strategic Term Recommendation Briefing:
            </h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem' }}>{advisorBriefingText}</p>
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
                <button style={styles.approveBtn} onClick={() => handleApproveResult(r._id)}>
                  Approve Sheet
                </button>
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
    backgroundColor: '#fff5f5',
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
    border: '1.5px solid var(--border)'
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
    backgroundColor: '#fff5f5',
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
