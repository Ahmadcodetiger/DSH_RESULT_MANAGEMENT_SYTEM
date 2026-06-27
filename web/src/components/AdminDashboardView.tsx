import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Bell, X, Shield, Award, Settings as SettingsIcon, Menu, LogOut,
  Sun, Moon, BookOpen, Sliders
} from 'lucide-react';
import api, { authService, classService, subjectService } from '../services/api';

interface User {
  _id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'PARENT' | 'ACCOUNTANT' | 'DIRECTOR';
  assignedClasses?: { level: string; section: string; subjectName?: string }[];
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

interface Result {
  _id: string;
  studentId: string | { _id: string; name: string; admissionNumber: string; level: string; section: string };
  academicYear: string;
  term: string;
  level: string;
  section: string;
  subjects: any[];
  tahfeezhDetails: any;
  evaluationElements: any[];
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

interface Notification {
  _id: string;
  title: string;
  message: string;
  targetRole: string;
  createdBy: string;
  createdAt: string;
}

interface SchoolClass {
  _id: string;
  className: string;
  section: string;
  annex: string;
  order: number;
  isActive: boolean;
}

interface AdminDashboardViewProps {
  schoolSettings: any;
  onUpdateSettings: () => void;
  styles: any;
  ResultSheetViewerModal: React.ComponentType<any>;
  FinanceLedgerView: React.ComponentType<any>;
  currentUser: any;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function AdminDashboardView({ 
  schoolSettings, 
  onUpdateSettings, 
  styles, 
  ResultSheetViewerModal, 
  FinanceLedgerView,
  currentUser,
  onLogout,
  theme = 'light',
  onToggleTheme
}: AdminDashboardViewProps) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [filterResultsTerm, setFilterResultsTerm] = useState('All');
  const [filterResultsYear, setFilterResultsYear] = useState('All');
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'users' | 'classes' | 'subjects' | 'settings' | 'results' | 'announcements' | 'finances'>('users');
  const [userTab, setUserTab] = useState<'teachers' | 'students'>('teachers');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [activeResult, setActiveResult] = useState<Result | null>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);

  const openResultSheet = (result: Result) => {
    setActiveResult(result);
    setShowResultSheet(true);
  };

  // Forms states
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherLevel, setNewTeacherLevel] = useState('5');
  const [newTeacherSection, setNewTeacherSection] = useState('ALLO');
  const [newTeacherSubject, setNewTeacherSubject] = useState("Al-Qur'an Karem (Hifz)");

  const [studentCsvFile, setStudentCsvFile] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [studentAddMode, setStudentAddMode] = useState<'csv' | 'manual'>('csv');
  const [manualStudent, setManualStudent] = useState({
    name: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: schoolSettings?.currentAcademicYear || '2025/2026',
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

  // School Settings form states
  const [settingsSchoolName, setSettingsSchoolName] = useState(schoolSettings?.schoolName || '');
  const [settingsAddress, setSettingsAddress] = useState(schoolSettings?.address || '');
  const [settingsPhone, setSettingsPhone] = useState(schoolSettings?.phoneNumbers || '');
  const [settingsEmail, setSettingsEmail] = useState(schoolSettings?.email || '');
  const [settingsBankName, setSettingsBankName] = useState(schoolSettings?.bankName || '');
  const [settingsAccountName, setSettingsAccountName] = useState(schoolSettings?.accountName || '');
  const [settingsAccountNumber, setSettingsAccountNumber] = useState(schoolSettings?.accountNumber || '');
  const [settingsTerm, setSettingsTerm] = useState(schoolSettings?.currentTerm || 'Second Term');
  const [settingsYear, setSettingsYear] = useState(schoolSettings?.currentAcademicYear || '2025/2026');

  // Promotions form states
  const [promoFromLevel, setPromoFromLevel] = useState('1');
  const [promoToLevel, setPromoToLevel] = useState('2');
  const [promoSelectedStudents, setPromoSelectedStudents] = useState<string[]>([]);

// School classes & annexes state
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [annexes, setAnnexes] = useState<string[]>([]);
  const [newAnnexName, setNewAnnexName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSection, setNewClassSection] = useState('');
  const [newClassAnnex, setNewClassAnnex] = useState('');
  const [newClassOrder, setNewClassOrder] = useState(0);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editClassForm, setEditClassForm] = useState({ className: '', section: '', annex: '', order: 0 });

  // Subject CRUD states
  interface Subject {
    _id: string;
    name: string;
    nameArabic: string;
    section: 'academic' | 'tahfeezh' | 'islamic';
    isActive: boolean;
  }
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjNameArabic, setNewSubjNameArabic] = useState('');
  const [newSubjSection, setNewSubjSection] = useState<'academic' | 'tahfeezh' | 'islamic'>('academic');
  const [editingSubj, setEditingSubj] = useState<Subject | null>(null);
  const [editSubjForm, setEditSubjForm] = useState({ name: '', nameArabic: '', section: 'academic' as 'academic' | 'tahfeezh' | 'islamic' });

  // Teacher editing & multiple assignments states
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', username: '', password: '', assignedClasses: [] as { level: string; section: string; subjectName?: string }[] });
  
  // Temp assignments for teacher creation form
  const [tempAssignments, setTempAssignments] = useState<{ level: string; section: string; subjectName?: string }[]>([]);

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
    fetchResults();
    fetchAdminNotifications();
    fetchSchoolClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (schoolSettings) {
      setSettingsSchoolName(schoolSettings.schoolName || '');
      setSettingsAddress(schoolSettings.address || '');
      setSettingsPhone(schoolSettings.phoneNumbers || '');
      setSettingsEmail(schoolSettings.email || '');
      setSettingsBankName(schoolSettings.bankName || '');
      setSettingsAccountName(schoolSettings.accountName || '');
      setSettingsAccountNumber(schoolSettings.accountNumber || '');
      setSettingsTerm(schoolSettings.currentTerm || 'Second Term');
      setSettingsYear(schoolSettings.currentAcademicYear || '2025/2026');
      setAnnexes(schoolSettings.annexes || []);
    }
  }, [schoolSettings]);

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

  const fetchResults = async (termVal = filterResultsTerm, yearVal = filterResultsYear) => {
    try {
      const params = [];
      if (termVal !== 'All') params.push(`term=${termVal}`);
      if (yearVal !== 'All') params.push(`academicYear=${yearVal}`);
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await api.get(`/admin/results${queryString}`);
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

  const fetchSchoolClasses = async () => {
    try {
      const data = await classService.getClasses(false);
      setSchoolClasses(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await subjectService.getSubjects(false);
      setSubjectsList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subjectService.createSubject({
        name: newSubjName,
        nameArabic: newSubjNameArabic,
        section: newSubjSection,
      });
      setNewSubjName('');
      setNewSubjNameArabic('');
      fetchSubjects();
      alert('Subject created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubj) return;
    try {
      await subjectService.updateSubject(editingSubj._id, editSubjForm);
      setEditingSubj(null);
      fetchSubjects();
      alert('Subject updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectService.deleteSubject(id);
      fetchSubjects();
    } catch (err) {
      alert('Failed to delete subject');
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      await api.put(`/admin/teachers/${editingTeacher._id}`, {
        name: editTeacherForm.name,
        username: editTeacherForm.username,
        password: editTeacherForm.password || undefined,
        assignedClasses: editTeacherForm.assignedClasses,
      });
      setEditingTeacher(null);
      fetchTeachers();
      alert('Teacher updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update teacher');
    }
  };

  // Helpers to get unique levels and sections from dynamic classes
  const activeClasses = schoolClasses.filter(c => c.isActive);
  const uniqueSections = [...new Set(activeClasses.map(c => c.section))];
  const sectionGroups = uniqueSections.reduce((acc, sec) => {
    acc[sec] = activeClasses.filter(c => c.section === sec).sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<string, SchoolClass[]>);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await classService.createClass({
        className: newClassName,
        section: newClassSection,
        annex: newClassAnnex,
        order: newClassOrder,
      });
      setNewClassName('');
      setNewClassOrder(0);
      fetchSchoolClasses();
      alert('Class created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create class');
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await classService.updateClass(editingClass._id, editClassForm);
      setEditingClass(null);
      fetchSchoolClasses();
      alert('Class updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await classService.deleteClass(id);
      fetchSchoolClasses();
    } catch (err) {
      alert('Failed to delete class');
    }
  };

  const handleAddAnnex = async () => {
    if (!newAnnexName.trim()) return;
    const updated = [...annexes, newAnnexName.trim()];
    try {
      await classService.updateAnnexes(updated);
      setAnnexes(updated);
      setNewAnnexName('');
      onUpdateSettings();
    } catch (err) {
      alert('Failed to update annexes');
    }
  };

  const handleRemoveAnnex = async (annexToRemove: string) => {
    if (!confirm(`Remove annex "${annexToRemove}"?`)) return;
    const updated = annexes.filter(a => a !== annexToRemove);
    try {
      await classService.updateAnnexes(updated);
      setAnnexes(updated);
      onUpdateSettings();
    } catch (err) {
      alert('Failed to update annexes');
    }
  };

  const handleAddTempAssignment = () => {
    if (!newTeacherLevel || !newTeacherSection || !newTeacherSubject) {
      alert('Please select Class, Section, and Subject first');
      return;
    }
    const exists = tempAssignments.some(a => a.level === newTeacherLevel && a.section === newTeacherSection && a.subjectName === newTeacherSubject);
    if (exists) {
      alert('This class/subject assignment is already in the list.');
      return;
    }
    setTempAssignments([...tempAssignments, { level: newTeacherLevel, section: newTeacherSection, subjectName: newTeacherSubject }]);
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempAssignments.length === 0) {
      alert('Please add at least one class/subject assignment to this teacher.');
      return;
    }
    try {
      await api.post('/admin/teachers', {
        name: newTeacherName,
        username: newTeacherUsername,
        password: newTeacherPassword,
        assignedClasses: tempAssignments
      });
      setNewTeacherName('');
      setNewTeacherUsername('');
      setNewTeacherPassword('');
      setTempAssignments([]);
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
          academicYear: schoolSettings?.currentAcademicYear || '2025/2026',
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

  const handleUpdateSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/admin/settings', {
        schoolName: settingsSchoolName,
        address: settingsAddress,
        phoneNumbers: settingsPhone,
        email: settingsEmail,
        bankName: settingsBankName,
        accountName: settingsAccountName,
        accountNumber: settingsAccountNumber,
        currentTerm: settingsTerm,
        currentAcademicYear: settingsYear
      });
      alert('School settings updated successfully!');
      onUpdateSettings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings');
    }
  };

  const handlePromoteStudents = async () => {
    if (promoSelectedStudents.length === 0) return;
    if (promoFromLevel === promoToLevel) {
      alert('Source and target levels cannot be the same!');
      return;
    }
    const confirmMsg = `Are you sure you want to promote the ${promoSelectedStudents.length} selected student(s) from Level ${promoFromLevel} to Level ${promoToLevel}? This will batch-update their class levels.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.post('/admin/students/promote', {
        studentIds: promoSelectedStudents,
        toLevel: promoToLevel
      });
      alert(res.data?.message || 'Students promoted successfully!');
      setPromoSelectedStudents([]);
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to execute promotions');
    }
  };

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
          <span className="brand-title">{schoolSettings?.schoolName || 'Admin Portal'}</span>
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
            <h1 className="brand-title">{schoolSettings?.schoolName || 'Admin Portal'}</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-btn ${activeAdminSubTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('users'); setIsMobileSidebarOpen(false); }}>
            <Users size={16} /> User Management
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'classes' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('classes'); setIsMobileSidebarOpen(false); }}>
            <BookOpen size={16} /> Manage Classes
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'subjects' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('subjects'); setIsMobileSidebarOpen(false); }}>
            <Sliders size={16} /> Manage Subjects
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('settings'); setIsMobileSidebarOpen(false); }}>
            <SettingsIcon size={16} /> School Settings
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'results' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('results'); setIsMobileSidebarOpen(false); }}>
            <Award size={16} /> Result Approval ({results.filter(r => !r.isApproved).length})
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('announcements'); setIsMobileSidebarOpen(false); }}>
            <Bell size={16} /> Announcements
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'finances' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('finances'); setIsMobileSidebarOpen(false); }}>
            <DollarSign size={16} /> Finance Ledger
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', width: '100%' }}>
            <div className="user-profile">
              <span className="user-name">{currentUser?.name || 'Administrator'}</span>
              <span className="user-role">{currentUser?.role || 'ADMIN'}</span>
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
          <Shield size={28} color="var(--primary)" /> Admin: {
            activeAdminSubTab === 'users' ? 'User Management' :
            activeAdminSubTab === 'classes' ? 'Manage Classes & Annexes' :
            activeAdminSubTab === 'subjects' ? 'Manage Academic Subjects' :
            activeAdminSubTab === 'settings' ? 'School Settings & Calendar' :
            activeAdminSubTab === 'results' ? 'Result Sheets Queue' :
            activeAdminSubTab === 'announcements' ? 'Broadcasting & Notifications' :
            'Finance & Reserves Ledger'
          }
        </h2>

        {/* 1. USER MANAGEMENT TAB */}
        {activeAdminSubTab === 'users' && (
          <div>
            <div className="curriculum-tabs-container">
              <button 
                type="button" 
                onClick={() => setUserTab('teachers')}
                className={`curriculum-tab-btn ${userTab === 'teachers' ? 'active' : ''}`}
              >
                Teachers / Faculty ({teachers.length})
              </button>
              <button 
                type="button" 
                onClick={() => setUserTab('students')}
                className={`curriculum-tab-btn ${userTab === 'students' ? 'active' : ''}`}
              >
                Students Registry ({students.length})
              </button>
            </div>

            {userTab === 'teachers' ? (
              <>
                <div className="grid-cols-3">
                <div className="span-2-desktop glass dashboard-card">
                  <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Registered Faculty</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Directory of registered teacher accounts and their assigned class levels.
                  </p>
                  <div style={styles.tableWrapper}>
                    <table className="custom-table">
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
                              {t.assignedClasses?.map(c => `Lvl ${c.level}-${c.section} (${c.subjectName || 'both'})`).join(', ') || 'None'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'var(--success-glow)',
                                    color: 'var(--success)',
                                    border: '1px solid var(--success)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }} 
                                  onClick={() => {
                                    setEditingTeacher(t);
                                    setEditTeacherForm({
                                      name: t.name,
                                      username: t.username,
                                      password: '',
                                      assignedClasses: t.assignedClasses || []
                                    });
                                  }}
                                >
                                  Edit
                                </button>
                                <button style={styles.deleteBtn} onClick={() => handleDeleteTeacher(t._id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="glass dashboard-card">
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
                      <div style={{ padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', marginBottom: '0.5rem' }}>
                        <label style={{ ...styles.label, fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Add Class & Subject Assignment</label>
                        <div className="form-row-responsive" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ ...styles.label, fontSize: '0.75rem' }}>Class</label>
                            <select value={newTeacherLevel} onChange={e => setNewTeacherLevel(e.target.value)}>
                              <option value="">Select Class</option>
                              {Object.entries(sectionGroups).map(([sec, classes]) => (
                                <optgroup key={sec} label={sec}>
                                  {classes.map(c => (
                                    <option key={c._id} value={c.className}>{c.className}</option>
                                  ))}
                                </optgroup>
                              ))}
                              {activeClasses.length === 0 && <option disabled>No classes configured</option>}
                            </select>
                          </div>
                          <div>
                            <label style={{ ...styles.label, fontSize: '0.75rem' }}>Section</label>
                            <select value={newTeacherSection} onChange={e => setNewTeacherSection(e.target.value)}>
                              <option value="">Select Section</option>
                              {uniqueSections.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {uniqueSections.length === 0 && <option disabled>No sections configured</option>}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ ...styles.label, fontSize: '0.75rem' }}>Assigned Subject</label>
                          <select value={newTeacherSubject} onChange={e => setNewTeacherSubject(e.target.value)}>
                            <option value="">Select Subject</option>
                            {subjectsList.filter(s => s.isActive).map(s => (
                              <option key={s._id} value={s.name}>{s.name} ({s.section})</option>
                            ))}
                            {subjectsList.filter(s => s.isActive).length === 0 && <option disabled>No subjects configured</option>}
                          </select>
                        </div>
                        <button type="button" onClick={handleAddTempAssignment} style={{ ...styles.submitBtn, padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                          + Add Assignment
                        </button>
                      </div>

                      {tempAssignments.length > 0 && (
                        <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', marginBottom: '0.5rem' }}>
                          <label style={{ ...styles.label, fontSize: '0.75rem', fontWeight: 'bold' }}>Teacher Assignments Stack ({tempAssignments.length})</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                            {tempAssignments.map((a, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '3px', border: '1px solid var(--border)' }}>
                                <span>Lvl {a.level} - {a.section} ({a.subjectName})</span>
                                <button type="button" onClick={() => setTempAssignments(tempAssignments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button type="submit" style={{ ...styles.submitBtn, marginTop: '0.5rem' }}>Save Faculty Account</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* EDIT TEACHER MODAL */}
              {editingTeacher && (
                <div className="modal-overlay-blur">
                  <div className="modal-card animate-scale-in" style={{ maxWidth: '550px' }}>
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--primary)' }}>Edit Teacher Details</h3>
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => setEditingTeacher(null)}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleUpdateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={styles.label}>Full Name</label>
                        <input 
                          type="text" 
                          required 
                          value={editTeacherForm.name} 
                          onChange={e => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Username</label>
                        <input 
                          type="text" 
                          required 
                          value={editTeacherForm.username} 
                          onChange={e => setEditTeacherForm({ ...editTeacherForm, username: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={styles.label}>Reset Password (leave blank to keep current)</label>
                        <input 
                          type="password" 
                          value={editTeacherForm.password} 
                          onChange={e => setEditTeacherForm({ ...editTeacherForm, password: e.target.value })} 
                          placeholder="New Password" 
                        />
                      </div>

                      <div style={{ padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)' }}>
                        <label style={{ ...styles.label, fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Add Class & Subject Assignment</label>
                        <div className="form-row-responsive" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ ...styles.label, fontSize: '0.75rem' }}>Class</label>
                            <select id="edit-teacher-class-select">
                              <option value="">Select Class</option>
                              {Object.entries(sectionGroups).map(([sec, classes]) => (
                                <optgroup key={sec} label={sec}>
                                  {classes.map(c => (
                                    <option key={c._id} value={c.className}>{c.className}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ ...styles.label, fontSize: '0.75rem' }}>Section</label>
                            <select id="edit-teacher-section-select">
                              <option value="">Select Section</option>
                              {uniqueSections.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ ...styles.label, fontSize: '0.75rem' }}>Assigned Subject</label>
                          <select id="edit-teacher-subject-select">
                            <option value="">Select Subject</option>
                            {subjectsList.filter(s => s.isActive).map(s => (
                              <option key={s._id} value={s.name}>{s.name} ({s.section})</option>
                            ))}
                          </select>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const classSel = document.getElementById('edit-teacher-class-select') as HTMLSelectElement;
                            const secSel = document.getElementById('edit-teacher-section-select') as HTMLSelectElement;
                            const subjSel = document.getElementById('edit-teacher-subject-select') as HTMLSelectElement;
                            if (!classSel?.value || !secSel?.value || !subjSel?.value) {
                              alert('Please select Class, Section, and Subject first');
                              return;
                            }
                            // Check duplicates
                            const exists = editTeacherForm.assignedClasses.some(a => a.level === classSel.value && a.section === secSel.value && a.subjectName === subjSel.value);
                            if (exists) {
                              alert('This class/subject assignment is already in the list.');
                              return;
                            }
                            setEditTeacherForm({
                              ...editTeacherForm,
                              assignedClasses: [...editTeacherForm.assignedClasses, { level: classSel.value, section: secSel.value, subjectName: subjSel.value }]
                            });
                          }} 
                          style={{ ...styles.submitBtn, padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          + Add Assignment
                        </button>
                      </div>

                      <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)' }}>
                        <label style={{ ...styles.label, fontSize: '0.75rem', fontWeight: 'bold' }}>Current Assignments ({editTeacherForm.assignedClasses.length})</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                          {editTeacherForm.assignedClasses.map((a, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '3px', border: '1px solid var(--border)' }}>
                              <span>Lvl {a.level} - {a.section} ({a.subjectName})</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setEditTeacherForm({
                                    ...editTeacherForm,
                                    assignedClasses: editTeacherForm.assignedClasses.filter((_, i) => i !== idx)
                                  });
                                }} 
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="submit" style={{ ...styles.submitBtn, flex: 1 }}>Save Changes</button>
                        <button
                          type="button"
                          style={{ ...styles.deleteBtn, flex: 1, margin: 0, padding: '0.75rem' }}
                          onClick={() => setEditingTeacher(null)}
                        >Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : (
              <div className="grid-cols-3">
                <div className="span-2-desktop glass dashboard-card">
                  <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Student Roll Call</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Active student roll registry, admission numbers, parental access codes, and configured school fees.
                  </p>
                  <div style={styles.tableWrapper}>
                    <table className="custom-table">
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
                                    backgroundColor: 'var(--success-glow)',
                                    color: 'var(--success)',
                                    border: '1px solid var(--success)',
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
                                    backgroundColor: 'var(--error-glow)',
                                    color: 'var(--error)',
                                    border: '1px solid var(--error)',
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
                  <div className="glass dashboard-card">
                    <h3 style={styles.cardHeader}>Manage Students</h3>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--bg-base)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <button 
                        type="button" 
                        onClick={() => { setStudentAddMode('csv'); setUploadStatus(''); }}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          background: studentAddMode === 'csv' ? 'var(--primary)' : 'transparent',
                          color: studentAddMode === 'csv' ? '#fff' : 'var(--text-main)',
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
                          background: studentAddMode === 'manual' ? 'var(--primary)' : 'transparent',
                          color: studentAddMode === 'manual' ? '#fff' : 'var(--text-main)',
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
                          style={{ fontFamily: 'monospace' }}
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
                          />
                        </div>
                        <div className="form-row-responsive">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level *</label>
                            <select 
                              required
                              value={manualStudent.level}
                              onChange={e => setManualStudent({ ...manualStudent, level: e.target.value })}
                            >
                              <option value="">Select Level</option>
                              {Object.entries(sectionGroups).map(([sec, classes]) => (
                                <optgroup key={sec} label={sec}>
                                  {classes.map(c => (
                                    <option key={c._id} value={c.className}>{c.className}</option>
                                  ))}
                                </optgroup>
                              ))}
                              {activeClasses.length === 0 && <option disabled>No classes configured</option>}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section *</label>
                            <select 
                              required
                              value={manualStudent.section}
                              onChange={e => setManualStudent({ ...manualStudent, section: e.target.value })}
                            >
                              <option value="">Select Section</option>
                              {uniqueSections.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {uniqueSections.length === 0 && <option disabled>No sections configured</option>}
                            </select>
                          </div>
                        </div>
                        <div className="form-row-responsive">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Academic Year *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. 2025/2026"
                              value={manualStudent.academicYear}
                              onChange={e => setManualStudent({ ...manualStudent, academicYear: e.target.value })}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent PIN (Opt)</label>
                            <input 
                              type="text" 
                              placeholder="Autogenerated if blank"
                              value={manualStudent.parentPin}
                              onChange={e => setManualStudent({ ...manualStudent, parentPin: e.target.value })}
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
                          />
                        </div>
                        <button type="submit" style={{ ...styles.submitBtn, marginTop: '0.5rem' }}>Add Student</button>
                      </form>
                    )}
                    {uploadStatus && <div style={{ ...styles.badgeRow, marginTop: '1rem' }}>{uploadStatus}</div>}
                  </div>
                </div>
              </div>
            )}

            {editingStudent && (
              <div className="modal-overlay-blur">
                <div className="modal-card modal-card-sm animate-scale-in" style={{ maxWidth: '500px' }}>
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
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission Number *</label>
                      <input 
                        type="text" 
                        required
                        value={editStudentForm.admissionNumber}
                        onChange={e => setEditStudentForm({ ...editStudentForm, admissionNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-row-responsive">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level *</label>
                        <select 
                          required
                          value={editStudentForm.level}
                          onChange={e => setEditStudentForm({ ...editStudentForm, level: e.target.value })}
                        >
                          <option value="">Select Level</option>
                          {Object.entries(sectionGroups).map(([sec, classes]) => (
                            <optgroup key={sec} label={sec}>
                              {classes.map(c => (
                                <option key={c._id} value={c.className}>{c.className}</option>
                              ))}
                            </optgroup>
                          ))}
                          {activeClasses.length === 0 && <option disabled>No classes configured</option>}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section *</label>
                        <select 
                          required
                          value={editStudentForm.section}
                          onChange={e => setEditStudentForm({ ...editStudentForm, section: e.target.value })}
                        >
                          <option value="">Select Section</option>
                          {uniqueSections.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          {uniqueSections.length === 0 && <option disabled>No sections configured</option>}
                        </select>
                      </div>
                    </div>
                    <div className="form-row-responsive">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Academic Year *</label>
                        <input 
                          type="text" 
                          required
                          value={editStudentForm.academicYear}
                          onChange={e => setEditStudentForm({ ...editStudentForm, academicYear: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Parent PIN</label>
                        <input 
                          type="text" 
                          value={editStudentForm.parentPin}
                          onChange={e => setEditStudentForm({ ...editStudentForm, parentPin: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>School Fees (₦)</label>
                      <input 
                        type="number" 
                        value={editStudentForm.schoolFees}
                        onChange={e => setEditStudentForm({ ...editStudentForm, schoolFees: Number(e.target.value) || 0 })}
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

        {/* 2a. SCHOOL SETTINGS & CALENDAR TAB */}
        {activeAdminSubTab === 'settings' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="glass dashboard-card card-lg">
              <h3 style={styles.cardHeader}>School Profile & Calendar</h3>
              <form onSubmit={handleUpdateSchoolSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Academic Calendar</h4>
                <div className="form-row-responsive">
                  <div>
                    <label style={styles.label}>Academic Session / Year</label>
                    <input 
                      type="text" 
                      required 
                      value={settingsYear} 
                      onChange={e => setSettingsYear(e.target.value)} 
                      placeholder="e.g. 2025/2026" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Active Term</label>
                    <select value={settingsTerm} onChange={e => setSettingsTerm(e.target.value)}>
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Branding & Contact Info</h4>
                <div>
                  <label style={styles.label}>School Name</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsSchoolName} 
                    onChange={e => setSettingsSchoolName(e.target.value)} 
                    placeholder="School Name" 
                  />
                </div>
                <div>
                  <label style={styles.label}>School Address</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsAddress} 
                    onChange={e => setSettingsAddress(e.target.value)} 
                    placeholder="Address" 
                  />
                </div>
                <div className="form-row-responsive">
                  <div>
                    <label style={styles.label}>Phone Numbers</label>
                    <input 
                      type="text" 
                      required 
                      value={settingsPhone} 
                      onChange={e => setSettingsPhone(e.target.value)} 
                      placeholder="Phone numbers" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={settingsEmail} 
                      onChange={e => setSettingsEmail(e.target.value)} 
                      placeholder="Email Address" 
                    />
                  </div>
                </div>

                <h4 style={{ color: 'var(--primary)', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Bank Transfer Info</h4>
                <div>
                  <label style={styles.label}>Bank Name</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsBankName} 
                    onChange={e => setSettingsBankName(e.target.value)} 
                    placeholder="Bank Name" 
                  />
                </div>
                <div className="form-row-responsive">
                  <div>
                    <label style={styles.label}>Account Name</label>
                    <input 
                      type="text" 
                      required 
                      value={settingsAccountName} 
                      onChange={e => setSettingsAccountName(e.target.value)} 
                      placeholder="Account Name" 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Account Number</label>
                    <input 
                      type="text" 
                      required 
                      value={settingsAccountNumber} 
                      onChange={e => setSettingsAccountNumber(e.target.value)} 
                      placeholder="Account Number" 
                    />
                  </div>
                </div>

                <button type="submit" style={{ ...styles.submitBtn, marginTop: '1rem' }}>Save & Apply Settings</button>
              </form>
            </div>
          </div>
        )}

        {/* 2b. MANAGE CLASSES & ANNEXES TAB */}
        {activeAdminSubTab === 'classes' && (
          <div className="grid-cols-2">
            <div>
              {/* ANNEX MANAGER */}
              <div className="glass dashboard-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={styles.cardHeader}>School Annexes / Branches</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Define different school locations or branches. Classes can be assigned to specific annexes.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. Takushara Annex"
                    value={newAnnexName}
                    onChange={e => setNewAnnexName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={handleAddAnnex} style={{ ...styles.submitBtn, padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>Add Annex</button>
                </div>
                {annexes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {annexes.map(a => (
                      <span key={a} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.75rem',
                        backgroundColor: 'var(--primary-glow)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'var(--primary)'
                      }}>
                        {a}
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnex(a)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontWeight: 'bold', fontSize: '1rem', lineHeight: 1, padding: 0 }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No annexes defined yet. Add one above.</p>
                )}
              </div>

              {/* CLASS MANAGER */}
              <div className="glass dashboard-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={styles.cardHeader}>Class Configuration</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Define classes grouped under sections. Example: "Foundation 1" under section "Foundation", "Basic 1" under section "Primary".
                </p>

                {/* Create New Class Form */}
                <form onSubmit={handleCreateClass} style={{
                  display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  padding: '1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-base)', marginBottom: '1.5rem'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Add New Class</h4>
                  <div className="form-row-responsive">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class Name *</label>
                      <input type="text" required placeholder="e.g. Foundation 1" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section (Group) *</label>
                      <input type="text" required placeholder="e.g. Foundation" value={newClassSection} onChange={e => setNewClassSection(e.target.value)} list="section-suggestions" />
                      <datalist id="section-suggestions">
                        {uniqueSections.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="form-row-responsive">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Annex (Optional)</label>
                      <select value={newClassAnnex} onChange={e => setNewClassAnnex(e.target.value)}>
                        <option value="">All Annexes / None</option>
                        {annexes.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sort Order</label>
                      <input type="number" value={newClassOrder} onChange={e => setNewClassOrder(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <button type="submit" style={{ ...styles.submitBtn, alignSelf: 'flex-start' }}>Create Class</button>
                </form>

                {/* Classes Table grouped by Section */}
                {Object.keys(sectionGroups).length > 0 ? (
                  Object.entries(sectionGroups).map(([sec, classes]) => (
                    <div key={sec} style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        borderBottom: '2px solid var(--primary)',
                        paddingBottom: '0.35rem',
                        marginBottom: '0.75rem'
                      }}>
                        {sec}
                      </h4>
                      <div style={styles.tableWrapper}>
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Class Name</th>
                              <th>Annex</th>
                              <th>Order</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classes.map(c => (
                              <tr key={c._id}>
                                <td style={{ fontWeight: '600' }}>{c.className}</td>
                                <td>{c.annex || '—'}</td>
                                <td>{c.order}</td>
                                <td>
                                  <span style={{
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    backgroundColor: c.isActive ? 'var(--success-glow)' : 'var(--error-glow)',
                                    color: c.isActive ? 'var(--success)' : 'var(--error)',
                                    border: `1px solid ${c.isActive ? 'var(--success)' : 'var(--error)'}`,
                                  }}>
                                    {c.isActive ? 'Active' : 'Disabled'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      type="button"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: 'var(--success-glow)',
                                        color: 'var(--success)',
                                        border: '1px solid var(--success)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => {
                                        setEditingClass(c);
                                        setEditClassForm({ className: c.className, section: c.section, annex: c.annex, order: c.order });
                                      }}
                                    >Edit</button>
                                    <button
                                      type="button"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: 'var(--error-glow)',
                                        color: 'var(--error)',
                                        border: '1px solid var(--error)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleDeleteClass(c._id)}
                                    >Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)'
                  }}>
                    <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No classes configured yet</p>
                    <p style={{ fontSize: '0.85rem' }}>Use the form above to create your first class.</p>
                  </div>
                )}

                {/* Also show inactive classes if any */}
                {schoolClasses.filter(c => !c.isActive).length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Disabled Classes</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {schoolClasses.filter(c => !c.isActive).map(c => (
                        <span key={c._id} style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          textDecoration: 'line-through'
                        }}>
                          {c.className} ({c.section})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>

              {/* EDIT CLASS MODAL */}
              {editingClass && (
                <div className="modal-overlay-blur">
                  <div className="modal-card modal-card-sm animate-scale-in" style={{ maxWidth: '450px' }}>
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--primary)' }}>Edit Class</h3>
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => setEditingClass(null)}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleUpdateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class Name *</label>
                        <input
                          type="text"
                          required
                          value={editClassForm.className}
                          onChange={e => setEditClassForm({ ...editClassForm, className: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Section (Group) *</label>
                        <input
                          type="text"
                          required
                          value={editClassForm.section}
                          onChange={e => setEditClassForm({ ...editClassForm, section: e.target.value })}
                          list="edit-section-suggestions"
                        />
                        <datalist id="edit-section-suggestions">
                          {uniqueSections.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </div>
                      <div className="form-row-responsive">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Annex</label>
                          <select value={editClassForm.annex} onChange={e => setEditClassForm({ ...editClassForm, annex: e.target.value })}>
                            <option value="">All / None</option>
                            {annexes.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sort Order</label>
                          <input
                            type="number"
                            value={editClassForm.order}
                            onChange={e => setEditClassForm({ ...editClassForm, order: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button type="submit" style={{ ...styles.submitBtn, flex: 1 }}>Save Changes</button>
                        <button
                          type="button"
                          style={{ ...styles.deleteBtn, flex: 1, margin: 0, padding: '0.75rem' }}
                          onClick={() => setEditingClass(null)}
                        >Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              <div className="glass dashboard-card card-lg">
                <h3 style={styles.cardHeader}>Class Promotion Manager</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Promote students from one class level to another in batch. Selected students will have their level updated instantly.
                </p>
                
                <div className="form-row-responsive" style={{ marginBottom: '1.25rem' }}>
                  <div>
                    <label style={styles.label}>From Class</label>
                    <select value={promoFromLevel} onChange={e => {
                      setPromoFromLevel(e.target.value);
                      setPromoSelectedStudents([]);
                    }}>
                      <option value="">Select Class</option>
                      {Object.entries(sectionGroups).map(([sec, classes]) => (
                        <optgroup key={sec} label={sec}>
                          {classes.map(c => (
                            <option key={c._id} value={c.className}>{c.className}</option>
                          ))}
                        </optgroup>
                      ))}
                      {activeClasses.length === 0 && <option disabled>No classes configured</option>}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>To Target Class</label>
                    <select value={promoToLevel} onChange={e => setPromoToLevel(e.target.value)}>
                      <option value="">Select Class</option>
                      {Object.entries(sectionGroups).map(([sec, classes]) => (
                        <optgroup key={sec} label={sec}>
                          {classes.map(c => (
                            <option key={c._id} value={c.className}>{c.className}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="Graduated">Graduated</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={styles.label}>Select Students to Promote ({promoSelectedStudents.length})</label>
                  <div style={{ 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    border: '1.5px solid var(--border)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-base)'
                  }}>
                    {students.filter(s => s.level === promoFromLevel).length === 0 ? (
                      <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        No active students found in Level {promoFromLevel}
                      </div>
                    ) : (
                      students.filter(s => s.level === promoFromLevel).map(s => {
                        const isChecked = promoSelectedStudents.includes(s._id);
                        return (
                          <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              style={{ width: 'auto', height: 'auto', cursor: 'pointer' }}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPromoSelectedStudents([...promoSelectedStudents, s._id]);
                                } else {
                                  setPromoSelectedStudents(promoSelectedStudents.filter(id => id !== s._id));
                                }
                              }}
                            />
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{s.name} ({s.admissionNumber})</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {students.filter(s => s.level === promoFromLevel).length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setPromoSelectedStudents(students.filter(s => s.level === promoFromLevel).map(s => s._id))}
                        style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}
                      >
                        Select All
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPromoSelectedStudents([])}
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={handlePromoteStudents}
                  disabled={promoSelectedStudents.length === 0}
                  style={{
                    ...styles.submitBtn, 
                    backgroundColor: promoSelectedStudents.length === 0 ? 'var(--text-muted)' : 'var(--primary)',
                    cursor: promoSelectedStudents.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Execute Batch Promotion ({promoSelectedStudents.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2c. MANAGE SUBJECTS TAB */}
        {activeAdminSubTab === 'subjects' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* SUBJECTS CONFIGURATION MANAGER */}
            <div className="glass dashboard-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={styles.cardHeader}>Subjects Configuration</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Define subjects and categorize them under Academic (Secular) or Tahfeezh (Quranic) sections.
              </p>

              {/* Create New Subject Form */}
              <form onSubmit={handleCreateSubject} style={{
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                padding: '1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-base)', marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Add New Subject</h4>
                <div className="form-row-responsive">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Subject Name *</label>
                    <input type="text" required placeholder="e.g. Literacy" value={newSubjName} onChange={e => setNewSubjName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Arabic Translation (Opt)</label>
                    <input type="text" placeholder="e.g. معرفة القراءة والكتابة" value={newSubjNameArabic} onChange={e => setNewSubjNameArabic(e.target.value)} style={{ fontFamily: 'var(--font-arabic)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category / Section *</label>
                  <select value={newSubjSection} onChange={e => setNewSubjSection(e.target.value as any)}>
                    <option value="academic">Academic (Secular)</option>
                    <option value="tahfeezh">Tahfeezh (Qur'an & Hifz)</option>
                    <option value="islamic">Islamic Studies</option>
                  </select>
                </div>
                <button type="submit" style={{ ...styles.submitBtn, alignSelf: 'flex-start' }}>Create Subject</button>
              </form>

              {/* List of Subjects */}
              {subjectsList.length > 0 ? (
                <div style={styles.tableWrapper}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Arabic Name</th>
                        <th>Section</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectsList.map(s => (
                        <tr key={s._id}>
                          <td style={{ fontWeight: '600' }}>{s.name}</td>
                          <td style={{ fontFamily: 'var(--font-arabic)' }}>{s.nameArabic || '—'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{s.section}</td>
                          <td>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: s.isActive ? 'var(--success-glow)' : 'var(--error-glow)',
                              color: s.isActive ? 'var(--success)' : 'var(--error)',
                              border: `1px solid ${s.isActive ? 'var(--success)' : 'var(--error)'}`,
                            }}>
                              {s.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: 'var(--success-glow)',
                                  color: 'var(--success)',
                                  border: '1px solid var(--success)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setEditingSubj(s);
                                  setEditSubjForm({ name: s.name, nameArabic: s.nameArabic, section: s.section });
                                }}
                              >Edit</button>
                              <button
                                type="button"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: 'var(--error-glow)',
                                  color: 'var(--error)',
                                  border: '1px solid var(--error)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleDeleteSubject(s._id)}
                              >Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No subjects defined yet. Add one above.</p>
              )}
            </div>

            {/* EDIT SUBJECT MODAL */}
            {editingSubj && (
              <div className="modal-overlay-blur">
                <div className="modal-card modal-card-sm animate-scale-in" style={{ maxWidth: '450px' }}>
                  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>Edit Subject</h3>
                    <button
                      type="button"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => setEditingSubj(null)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={styles.label}>Subject Name *</label>
                      <input
                        type="text"
                        required
                        value={editSubjForm.name}
                        onChange={e => setEditSubjForm({ ...editSubjForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={styles.label}>Arabic Translation</label>
                      <input
                        type="text"
                        value={editSubjForm.nameArabic}
                        onChange={e => setEditSubjForm({ ...editSubjForm, nameArabic: e.target.value })}
                        style={{ fontFamily: 'var(--font-arabic)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={styles.label}>Category / Section *</label>
                      <select
                        value={editSubjForm.section}
                        onChange={e => setEditSubjForm({ ...editSubjForm, section: e.target.value as any })}
                      >
                        <option value="academic">Academic (Secular)</option>
                        <option value="tahfeezh">Tahfeezh (Qur'an & Hifz)</option>
                        <option value="islamic">Islamic Studies</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" style={{ ...styles.submitBtn, flex: 1 }}>Save Changes</button>
                      <button
                        type="button"
                        style={{ ...styles.deleteBtn, flex: 1, margin: 0, padding: '0.75rem' }}
                        onClick={() => setEditingSubj(null)}
                      >Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. RESULTS TAB */}
        {activeAdminSubTab === 'results' && (
          <div className="glass dashboard-card">
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Academic Report Sheets Queue</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Pending and approved student academic report sheets. Filter by term and academic year.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Term Filter</label>
                  <select 
                    value={filterResultsTerm} 
                    onChange={e => {
                      setFilterResultsTerm(e.target.value);
                      fetchResults(e.target.value, filterResultsYear);
                    }}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="All">All Terms</option>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Year Filter</label>
                  <select 
                    value={filterResultsYear} 
                    onChange={e => {
                      setFilterResultsYear(e.target.value);
                      fetchResults(filterResultsTerm, e.target.value);
                    }}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="All">All Years</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={styles.tableWrapper}>
              <table className="custom-table">
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
                            <button style={styles.navButton} onClick={() => openResultSheet(r)}>View</button>
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

        {/* 4. ANNOUNCEMENTS TAB */}
        {activeAdminSubTab === 'announcements' && (
          <div className="grid-cols-3">
            <div className="span-2-desktop glass dashboard-card">
              <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Announcement History</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Past broadcasted messages sent to teachers, parents, or all portal users.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {adminNotifications.map(n => (
                  <div key={n._id} className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              <div className="glass dashboard-card">
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

        {/* 5. FINANCE LEDGER TAB */}
        {activeAdminSubTab === 'finances' && (
          <div>
            <h3 style={styles.cardHeader}>Finance & Reserves Ledger</h3>
            <FinanceLedgerView showControls={false} />
          </div>
        )}
      </main>

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
