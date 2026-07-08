import React, { useState, useEffect } from 'react';
import { 
  Users, Coins, Bell, X, Shield, Award, Settings as SettingsIcon, Menu, LogOut,
  Sun, Moon, BookOpen, Sliders, Sparkles, CreditCard
} from 'lucide-react';
import api, { authService, classService, subjectService, aiService } from '../services/api';
import { BillingPortalView } from './BillingPortalView';

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
  nameArabic?: string;
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
  nextTermSchoolFees?: string;
  status: string;
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
  tenant: any;
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
  tenant,
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
  const isAlQalam = tenant?.slug === 'alqalam';
  const isConventional = schoolSettings?.curriculumType === 'conventional';
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [filterResultsTerm, setFilterResultsTerm] = useState('All');
  const [filterResultsYear, setFilterResultsYear] = useState('All');
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'users' | 'classes' | 'subjects' | 'settings' | 'results' | 'announcements' | 'finances' | 'billing'>('users');
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
  const [newTeacherRole, setNewTeacherRole] = useState<'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'DIRECTOR'>('TEACHER');
  const [settingsLogo, setSettingsLogo] = useState(schoolSettings?.logo || '');
  const [settingsIslamicLogo, setSettingsIslamicLogo] = useState(schoolSettings?.islamicLogo || '');
  const [selectedRollCallClass, setSelectedRollCallClass] = useState<string>('All');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedRollCallClass]);
  const [newTeacherLevel, setNewTeacherLevel] = useState('5');
  const [newTeacherSection, setNewTeacherSection] = useState('ALLO');
  const [newTeacherSubject, setNewTeacherSubject] = useState("Al-Qur'an Karem (Hifz)");

  // Approval Modal states
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedResultForApproval, setSelectedResultForApproval] = useState<Result | null>(null);
  const [headTeacherComments, setHeadTeacherComments] = useState('');
  const [nextTermBegins, setNextTermBegins] = useState('2026-09-15');
  const [nextTermSchoolFees, setNextTermSchoolFees] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [approvingResult, setApprovingResult] = useState(false);

  const [studentCsvFile, setStudentCsvFile] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [studentAddMode, setStudentAddMode] = useState<'csv' | 'manual'>('csv');
  const [csvTab, setCsvTab] = useState<'conventional' | 'islamic'>('conventional');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ uploadedCount: number; skipped: any[] } | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  useEffect(() => {
    if (!studentCsvFile.trim()) {
      setCsvPreview([]);
      return;
    }
    try {
      const lines = studentCsvFile.split(/\r?\n/);
      if (lines.length === 0) {
        setCsvPreview([]);
        return;
      }
      const parseCsvLineClient = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const firstLineParts = parseCsvLineClient(lines[0]);
      const hasHeader = firstLineParts.some(part => {
        const lower = part.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lower.includes('name') ||
          lower.includes('admission') ||
          lower.includes('level') ||
          lower.includes('class') ||
          lower.includes('section')
        );
      });

      let nameIdx = -1;
      let nameArabicIdx = -1;
      let admissionNumberIdx = -1;
      let levelIdx = -1;
      let sectionIdx = -1;
      let academicYearIdx = -1;
      let parentPinIdx = -1;
      let schoolFeesIdx = -1;
      let dobIdx = -1;
      let genderIdx = -1;
      let houseIdx = -1;
      let clubIdx = -1;

      if (hasHeader) {
        for (let i = 0; i < firstLineParts.length; i++) {
          const col = firstLineParts[i].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (col === 'name' || col === 'studentname' || col === 'fullname') nameIdx = i;
          else if (col === 'namearabic' || col === 'arabicname' || col === 'arabic') nameArabicIdx = i;
          else if (
            col === 'admissionnumber' ||
            col === 'admissionno' ||
            col === 'admno' ||
            col === 'regno' ||
            col === 'regnumber'
          )
            admissionNumberIdx = i;
          else if (col === 'level' || col === 'class') levelIdx = i;
          else if (col === 'section') sectionIdx = i;
          else if (col === 'academicyear' || col === 'session') academicYearIdx = i;
          else if (col === 'parentpin' || col === 'pin') parentPinIdx = i;
          else if (col === 'schoolfees' || col === 'fees') schoolFeesIdx = i;
          else if (col === 'dob' || col === 'dateofbirth' || col === 'birthdate') dobIdx = i;
          else if (col === 'gender' || col === 'sex') genderIdx = i;
          else if (col === 'house') houseIdx = i;
          else if (col === 'club' || col === 'society') clubIdx = i;
        }
      }

      const parsed: any[] = [];
      const startIdx = hasHeader ? 1 : 0;
      const defaultActiveYear = schoolSettings?.currentAcademicYear || '2025/2026';

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const parts = parseCsvLineClient(line);
        if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

        let rowName = '';
        let rowNameArabic = '';
        let rowAdmission = '';
        let rowLevel = '';
        let rowSection = '';
        let rowAcademicYear = defaultActiveYear;
        let rowParentPin = '';
        let rowSchoolFees = 0;
        let rowDob = '';
        let rowGender = '';
        let rowHouse = '';
        let rowClub = '';

        if (hasHeader) {
          if (nameIdx !== -1) rowName = parts[nameIdx] || '';
          if (nameArabicIdx !== -1) rowNameArabic = parts[nameArabicIdx] || '';
          if (admissionNumberIdx !== -1) rowAdmission = parts[admissionNumberIdx] || '';
          if (levelIdx !== -1) rowLevel = parts[levelIdx] || '';
          if (sectionIdx !== -1) rowSection = parts[sectionIdx] || '';
          if (academicYearIdx !== -1) rowAcademicYear = parts[academicYearIdx] || defaultActiveYear;
          if (parentPinIdx !== -1) rowParentPin = parts[parentPinIdx] || '';
          if (schoolFeesIdx !== -1) rowSchoolFees = Number(parts[schoolFeesIdx]) || 0;
          if (dobIdx !== -1) rowDob = parts[dobIdx] || '';
          if (genderIdx !== -1) rowGender = parts[genderIdx] || '';
          if (houseIdx !== -1) rowHouse = parts[houseIdx] || '';
          if (clubIdx !== -1) rowClub = parts[clubIdx] || '';
        } else {
          // Positional fallback
          if (parts.length <= 6) {
            rowName = parts[0] || '';
            rowAdmission = parts[1] || '';
            rowLevel = parts[2] || '';
            rowSection = parts[3] || '';
            rowParentPin = parts[4] || '';
            rowSchoolFees = Number(parts[5]) || 0;
          } else {
            rowName = parts[0] || '';
            rowNameArabic = parts[1] || '';
            rowAdmission = parts[2] || '';
            rowLevel = parts[3] || '';
            rowSection = parts[4] || '';
            rowAcademicYear = parts[5] || defaultActiveYear;
            rowParentPin = parts[6] || '';
            rowSchoolFees = Number(parts[7]) || 0;
            rowDob = parts[8] || '';
            rowGender = parts[9] || '';
            rowHouse = parts[10] || '';
            rowClub = parts[11] || '';
          }
        }

        parsed.push({
          name: rowName,
          nameArabic: rowNameArabic,
          admissionNumber: rowAdmission,
          level: rowLevel,
          section: rowSection,
          academicYear: rowAcademicYear,
          parentPin: rowParentPin,
          schoolFees: rowSchoolFees,
          dob: rowDob,
          gender: rowGender,
          house: rowHouse,
          club: rowClub
        });
      }
      setCsvPreview(parsed);
    } catch (e) {
      console.error(e);
    }
  }, [studentCsvFile, schoolSettings]);

  const downloadTemplate = (type: 'conventional' | 'islamic') => {
    let headers = '';
    let row = '';
    if (type === 'conventional') {
      headers = 'name,admissionNumber,level,section,academicYear,parentPin,schoolFees,dob,gender,house,club\n';
      row = 'AMAANI YAHUZA,DSH/015,5,ALLO,2025/2026,1234,180000,2015-05-12,MALE,Yellow House,Press Club\n';
    } else {
      headers = 'name,nameArabic,admissionNumber,level,section,academicYear,parentPin,schoolFees,dob,gender,house,club\n';
      row = 'AMAANI YAHUZA,أماني ياهوزا,DSH/015,5,ALLO,2025/2026,1234,180000,2015-05-12,MALE,Yellow House,Press Club\n';
    }
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_template_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySampleData = (type: 'conventional' | 'islamic') => {
    let content = '';
    if (type === 'conventional') {
      content = `name,admissionNumber,level,section,academicYear,parentPin,schoolFees,dob,gender,house,club
AMAANI YAHUZA,DSH/015,5,ALLO,2025/2026,1234,180000,2015-05-12,MALE,Yellow House,Press Club
KHANSAU ABDULLAHI,DSH/016,5,ALLO,2025/2026,5678,180000,2015-08-20,FEMALE,Blue House,Debate Club`;
    } else {
      content = `name,nameArabic,admissionNumber,level,section,academicYear,parentPin,schoolFees,dob,gender,house,club
AMAANI YAHUZA,أماني ياهوزا,DSH/015,5,ALLO,2025/2026,1234,180000,2015-05-12,MALE,Yellow House,Press Club
KHANSAU ABDULLAHI,خنساء عبد الله,DSH/016,5,ALLO,2025/2026,5678,180000,2015-08-20,FEMALE,Blue House,Debate Club`;
    }
    navigator.clipboard.writeText(content).then(() => {
      alert('Sample CSV copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy to clipboard.');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setStudentCsvFile(text);
          setUploadStatus('');
          setUploadResults(null);
        };
        reader.readAsText(file);
      } else {
        alert('Please drop a valid CSV file');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setStudentCsvFile(text);
        setUploadStatus('');
        setUploadResults(null);
      };
      reader.readAsText(file);
    }
  };
  const [manualStudent, setManualStudent] = useState({
    name: '',
    nameArabic: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: schoolSettings?.currentAcademicYear || '2025/2026',
    parentPin: '',
    schoolFees: '',
    picture: '',
    dob: '',
    gender: '',
    house: '',
    club: ''
  });

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    nameArabic: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: '',
    parentPin: '',
    schoolFees: 0,
    picture: '',
    dob: '',
    gender: '',
    house: '',
    club: ''
  });

  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [newNotifRole, setNewNotifRole] = useState('ALL');

  // School Settings form states
  const [settingsSchoolName, setSettingsSchoolName] = useState(schoolSettings?.schoolName || '');
  const [settingsSchoolNameArabic, setSettingsSchoolNameArabic] = useState((schoolSettings as any)?.schoolNameArabic || '');
  const [settingsSchoolSubHeader, setSettingsSchoolSubHeader] = useState((schoolSettings as any)?.schoolSubHeader || '');
  const [settingsAddress, setSettingsAddress] = useState(schoolSettings?.address || '');
  const [settingsPhone, setSettingsPhone] = useState(schoolSettings?.phoneNumbers || '');
  const [settingsEmail, setSettingsEmail] = useState(schoolSettings?.email || '');
  const [settingsBankName, setSettingsBankName] = useState(schoolSettings?.bankName || '');
  const [settingsAccountName, setSettingsAccountName] = useState(schoolSettings?.accountName || '');
  const [settingsAccountNumber, setSettingsAccountNumber] = useState(schoolSettings?.accountNumber || '');
  const [settingsAccountantWhatsApp, setSettingsAccountantWhatsApp] = useState(schoolSettings?.accountantWhatsApp || '');
  const [settingsTerm, setSettingsTerm] = useState(schoolSettings?.currentTerm || 'Second Term');
  const [settingsYear, setSettingsYear] = useState(schoolSettings?.currentAcademicYear || '2025/2026');
  const [settingsCurriculumType, setSettingsCurriculumType] = useState((schoolSettings as any)?.curriculumType || 'dual');
  const [settingsAllowMultiClassTeacher, setSettingsAllowMultiClassTeacher] = useState<boolean>((schoolSettings as any)?.academicConfig?.allowMultipleClassTeacherAssignments || false);
  const [settingsAllowClassTeacherNextTerm, setSettingsAllowClassTeacherNextTerm] = useState<boolean>((schoolSettings as any)?.academicConfig?.allowClassTeacherNextTermEdit !== false);

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
    classSection?: string;
    isActive: boolean;
  }
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjNameArabic, setNewSubjNameArabic] = useState('');
  const [newSubjSection, setNewSubjSection] = useState<'academic' | 'tahfeezh' | 'islamic'>('academic');
  const [newSubjClassSection, setNewSubjClassSection] = useState('');
  const [editingSubj, setEditingSubj] = useState<Subject | null>(null);
  const [editSubjForm, setEditSubjForm] = useState({ name: '', nameArabic: '', section: 'academic' as 'academic' | 'tahfeezh' | 'islamic', classSection: '' });

  // Teacher editing & multiple assignments states
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', username: '', role: 'TEACHER' as any, password: '', assignedClasses: [] as { level: string; section: string; subjectName?: string }[], classTeacherClasses: [] as { level: string; section: string }[] });
  
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
      setSettingsSchoolNameArabic((schoolSettings as any).schoolNameArabic || '');
      setSettingsSchoolSubHeader((schoolSettings as any).schoolSubHeader || '');
      setSettingsAddress(schoolSettings.address || '');
      setSettingsPhone(schoolSettings.phoneNumbers || '');
      setSettingsEmail(schoolSettings.email || '');
      setSettingsBankName(schoolSettings.bankName || '');
      setSettingsAccountName(schoolSettings.accountName || '');
      setSettingsAccountNumber(schoolSettings.accountNumber || '');
      setSettingsAccountantWhatsApp(schoolSettings.accountantWhatsApp || '');
      setSettingsTerm(schoolSettings.currentTerm || 'Second Term');
      setSettingsYear(schoolSettings.currentAcademicYear || '2025/2026');
      setAnnexes(schoolSettings.annexes || []);
      setSettingsLogo(schoolSettings.logo || '');
      setSettingsIslamicLogo((schoolSettings as any).islamicLogo || '');
      setSettingsCurriculumType((schoolSettings as any).curriculumType || 'dual');
      setSettingsAllowMultiClassTeacher((schoolSettings as any)?.academicConfig?.allowMultipleClassTeacherAssignments || false);
      setSettingsAllowClassTeacherNextTerm((schoolSettings as any)?.academicConfig?.allowClassTeacherNextTermEdit !== false);
    }
  }, [schoolSettings]);
  const processImageFile = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        callback(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

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
        classSection: newSubjClassSection,
      });
      setNewSubjName('');
      setNewSubjNameArabic('');
      setNewSubjClassSection('');
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
        role: editTeacherForm.role,
        assignedClasses: editTeacherForm.role === 'TEACHER' ? editTeacherForm.assignedClasses : [],
        classTeacherClasses: editTeacherForm.role === 'TEACHER' ? editTeacherForm.classTeacherClasses : [],
      });
      setEditingTeacher(null);
      fetchTeachers();
      alert('Staff updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update staff');
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
    if (newTeacherRole === 'TEACHER' && tempAssignments.length === 0) {
      alert('Please add at least one class/subject assignment to this teacher.');
      return;
    }
    try {
      await api.post('/admin/teachers', {
        name: newTeacherName,
        username: newTeacherUsername,
        password: newTeacherPassword,
        role: newTeacherRole,
        assignedClasses: newTeacherRole === 'TEACHER' ? tempAssignments : [],
        classTeacherClasses: []
      });
      setNewTeacherName('');
      setNewTeacherUsername('');
      setNewTeacherPassword('');
      setNewTeacherRole('TEACHER');
      setTempAssignments([]);
      fetchTeachers();
      alert('Staff user created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create staff user');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await api.delete(`/admin/teachers/${id}`);
      fetchTeachers();
    } catch (err) {
      alert('Failed to delete teacher');
    }
  };

  const triggerAiCommentGen = async (resultObj: Result) => {
    setAiGenerating(true);
    try {
      const studentName = typeof resultObj.studentId === 'object' && resultObj.studentId ? resultObj.studentId.name : 'Student';
      const response = await api.post('/ai/head-teacher-feedback', {
        studentName,
        finalAverage: resultObj.finalAverage,
        generalGrade: resultObj.generalGrade,
        subjects: resultObj.subjects
      });
      if (response.status === 202 && response.data.jobId) {
        const comment = await aiService.pollJob(response.data.jobId);
        setHeadTeacherComments(comment);
      } else if (response.data && response.data.comment) {
        setHeadTeacherComments(response.data.comment);
      }
    } catch (err) {
      setHeadTeacherComments("An Outstanding Performance. Keep it up.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleTriggerApproval = (resultObj: Result) => {
    setSelectedResultForApproval(resultObj);
    setNextTermBegins(resultObj.nextTermBegins || '2026-09-15');
    setNextTermSchoolFees(resultObj.nextTermSchoolFees || '₦45,000');
    setHeadTeacherComments(resultObj.headTeacherComments || '');
    setApprovalModalOpen(true);
    
    // Automatically trigger AI remark generation if there is no comment already
    if (!resultObj.headTeacherComments) {
      triggerAiCommentGen(resultObj);
    }
  };

  const handleConfirmApproval = async () => {
    if (!selectedResultForApproval) return;
    setApprovingResult(true);
    try {
      await api.patch(`/admin/results/${selectedResultForApproval._id}/status`, { 
        isApproved: true,
        headTeacherComments,
        nextTermBegins,
        nextTermSchoolFees
      });
      setApprovalModalOpen(false);
      setSelectedResultForApproval(null);
      fetchResults();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      const details = err.response?.data?.error || '';
      alert(`Failed to approve result sheet: ${msg} ${details}`);
    } finally {
      setApprovingResult(false);
    }
  };

  const handleToggleResult = async (id: string, currentStatus: boolean) => {
    if (!currentStatus) {
      // Find the result object to trigger the approval dialog
      const rObj = results.find(r => r._id === id);
      if (rObj) {
        handleTriggerApproval(rObj);
        return;
      }
    }
    
    // If revoking (currentStatus is true), just do it directly
    try {
      await api.patch(`/admin/results/${id}/status`, { isApproved: false });
      fetchResults();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to update result status: ${msg}`);
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
      setUploadResults(null);
      const response = await api.post('/admin/students/upload', { csvData: studentCsvFile });
      setUploadStatus(`Successfully processed!`);
      setUploadResults({
        uploadedCount: response.data.uploaded?.length || 0,
        skipped: response.data.skipped || []
      });
      setStudentCsvFile('');
      fetchStudents();
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'CSV parse or upload failed.');
      setUploadResults(null);
    }
  };

  const startEditStudent = (s: Student) => {
    setEditingStudent(s);
    setEditStudentForm({
      name: s.name,
      nameArabic: s.nameArabic || '',
      admissionNumber: s.admissionNumber,
      level: s.level,
      section: s.section,
      academicYear: s.academicYear,
      parentPin: s.parentPin,
      schoolFees: s.schoolFees || 0,
      picture: (s as any).picture || '',
      dob: (s as any).dob || '',
      gender: (s as any).gender || '',
      house: (s as any).house || '',
      club: (s as any).club || ''
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

  const visibleStudents = students.filter(s => selectedRollCallClass === 'All' || s.level === selectedRollCallClass);
  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every(s => selectedStudentIds.includes(s._id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = visibleStudents.map(s => s._id);
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = visibleStudents.map(s => s._id);
      setSelectedStudentIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleDeleteSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedStudentIds.length} selected students?`)) return;
    try {
      setUploadStatus('Deleting selected students...');
      await api.post('/admin/students/delete-batch', { ids: selectedStudentIds });
      setUploadStatus('Selected students deleted successfully!');
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err: any) {
      setUploadStatus(err.response?.data?.message || 'Failed to delete selected students.');
    }
  };

  const handleAddStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, nameArabic, admissionNumber, level, section, academicYear, parentPin, schoolFees, picture, dob, gender, house, club } = manualStudent;
    if (!name.trim() || !admissionNumber.trim() || !level.trim() || !section.trim() || !academicYear.trim()) {
      alert('Please fill all required fields');
      return;
    }
    if ((isAlQalam || isConventional) && (!dob.trim() || !gender.trim() || !house.trim() || !club.trim())) {
      alert('Please fill out all Al-Qalam student profile fields: Date of Birth, Gender, House, Club / Society');
      return;
    }
    try {
      setUploadStatus('Adding student...');
      const payload = {
        students: [
          {
            name: name.trim(),
            nameArabic: nameArabic.trim() || undefined,
            admissionNumber: admissionNumber.trim(),
            level: level.trim(),
            section: section.trim(),
            academicYear: academicYear.trim(),
            parentPin: parentPin.trim() || undefined,
            schoolFees: schoolFees ? Number(schoolFees) : 0,
            picture: picture.trim() || undefined,
            dob: dob.trim() || undefined,
            gender: gender.trim() || undefined,
            house: house.trim() || undefined,
            club: club.trim() || undefined
          }
        ]
      };
      const response = await api.post('/admin/students/upload', payload);
      const { uploaded, skipped } = response.data;
      if (uploaded && uploaded.length > 0) {
        setUploadStatus(`Student added successfully! Parent PIN: ${uploaded[0].pin}`);
        setManualStudent({
          name: '',
          nameArabic: '',
          admissionNumber: '',
          level: '',
          section: '',
          academicYear: schoolSettings?.currentAcademicYear || '2025/2026',
          parentPin: '',
          schoolFees: '',
          picture: '',
          dob: '',
          gender: '',
          house: '',
          club: ''
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
        schoolNameArabic: settingsSchoolNameArabic,
        schoolSubHeader: settingsSchoolSubHeader,
        address: settingsAddress,
        phoneNumbers: settingsPhone,
        email: settingsEmail,
        bankName: settingsBankName,
        accountName: settingsAccountName,
        accountNumber: settingsAccountNumber,
        accountantWhatsApp: settingsAccountantWhatsApp,
        currentTerm: settingsTerm,
        currentAcademicYear: settingsYear,
        logo: settingsLogo,
        islamicLogo: settingsIslamicLogo,
        curriculumType: settingsCurriculumType,
        allowMultipleClassTeacherAssignments: settingsAllowMultiClassTeacher,
        allowClassTeacherNextTermEdit: settingsAllowClassTeacherNextTerm,
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
          <img src={schoolSettings?.logo || "/logo.png"} alt="School Logo" className="logo-circle" style={{ objectFit: 'cover', border: '1px solid var(--border)' }} />
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
          <img src={schoolSettings?.logo || "/logo.png"} alt="School Logo" className="logo-circle" style={{ objectFit: 'cover', border: '1.5px solid var(--border)' }} />
          <div>
            {schoolSettings?.schoolNameArabic && <div className="brand-arabic">{schoolSettings.schoolNameArabic}</div>}
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
            <Award size={16} /> Result Approval ({results.filter(r => r.status !== 'approved').length})
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('announcements'); setIsMobileSidebarOpen(false); }}>
            <Bell size={16} /> Announcements
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'finances' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('finances'); setIsMobileSidebarOpen(false); }}>
            <Coins size={16} /> Finance Ledger
          </button>
          <button className={`sidebar-btn ${activeAdminSubTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveAdminSubTab('billing'); setIsMobileSidebarOpen(false); }}>
            <CreditCard size={16} /> Billing & Subscriptions
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
            activeAdminSubTab === 'finances' ? 'Finance & Reserves Ledger' :
            'Billing & Subscriptions'
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
                  <h3 style={{ ...styles.cardHeader, marginBottom: '0.25rem' }}>Registered Staff & Faculty</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Directory of registered teacher and administrative staff accounts.
                  </p>
                  <div style={styles.tableWrapper}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Role</th>
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
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                backgroundColor: t.role === 'ADMIN' ? 'var(--error-glow)' : t.role === 'ACCOUNTANT' ? 'var(--primary-glow)' : t.role === 'DIRECTOR' ? 'var(--warning-glow)' : 'var(--success-glow)',
                                color: t.role === 'ADMIN' ? 'var(--error)' : t.role === 'ACCOUNTANT' ? 'var(--primary-dark)' : t.role === 'DIRECTOR' ? 'var(--warning)' : 'var(--success)',
                                border: '1px solid currentColor'
                              }}>
                                {t.role || 'TEACHER'}
                              </span>
                            </td>
                            <td>
                              {(!t.role || t.role === 'TEACHER') ? (
                                [
                                  ...(t.assignedClasses?.map(c => `Lvl ${c.level}-${c.section} (${c.subjectName || 'both'})`) || []),
                                  ...((t as any).classTeacherClasses?.map((c: any) => `Lvl ${c.level}-${c.section} (Class Master)`) || [])
                                ].join(', ') || 'None'
                              ) : 'N/A'}
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
                                      role: t.role || 'TEACHER',
                                      password: '',
                                      assignedClasses: t.assignedClasses || [],
                                      classTeacherClasses: (t as any).classTeacherClasses || []
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
                    <h3 style={styles.cardHeader}>Register New Staff</h3>
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
                      <div>
                        <label style={styles.label}>Staff Role</label>
                        <select value={newTeacherRole} onChange={e => setNewTeacherRole(e.target.value as any)}>
                          <option value="TEACHER">Teacher / Faculty</option>
                          <option value="ADMIN">Administrator</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="DIRECTOR">Director / Proprietor</option>
                        </select>
                      </div>

                      {newTeacherRole === 'TEACHER' && (
                        <>
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
                        </>
                      )}
                      
                      <button type="submit" style={{ ...styles.submitBtn, marginTop: '0.5rem' }}>Save Faculty Account</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* EDIT STAFF MODAL */}
              {editingTeacher && (
                <div className="modal-overlay-blur">
                  <div className="modal-card animate-scale-in" style={{ maxWidth: '550px' }}>
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--primary)' }}>Edit Staff Details</h3>
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
                      <div>
                        <label style={styles.label}>Role</label>
                        <select value={editTeacherForm.role} onChange={e => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as any })}>
                          <option value="TEACHER">Teacher / Faculty</option>
                          <option value="ADMIN">Administrator</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="DIRECTOR">Director / Proprietor</option>
                        </select>
                      </div>

                      {editTeacherForm.role === 'TEACHER' && (
                        <>
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

                          {/* Class Teacher Assignment Section */}
                          <div style={{ marginTop: '1rem', padding: '0.75rem', border: '2px solid #8B1A1A', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(139,26,26,0.05)' }}>
                            <label style={{ ...styles.label, fontSize: '0.8rem', fontWeight: 'bold', color: '#8B1A1A', marginBottom: '0.5rem', display: 'block' }}>🏫 Class Teacher Assignment</label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Assign this teacher as Class Master/Mistress for a specific class. One active assignment per class.</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <select id="edit-ct-class-select" style={{ flex: '1', minWidth: '80px', fontSize: '0.8rem', padding: '0.35rem' }}>
                                <option value="">Level</option>
                                {[...new Set(activeClasses.map(c => c.className))].sort().map(lvl => (
                                  <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                              </select>
                              <select id="edit-ct-section-select" style={{ flex: '1', minWidth: '80px', fontSize: '0.8rem', padding: '0.35rem' }}>
                                <option value="">Section</option>
                                {uniqueSections.map(sec => (
                                  <option key={sec} value={sec}>{sec}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const lvlSel = document.getElementById('edit-ct-class-select') as HTMLSelectElement;
                                  const secSel = document.getElementById('edit-ct-section-select') as HTMLSelectElement;
                                  if (!lvlSel?.value || !secSel?.value) {
                                    alert('Please select Level and Section');
                                    return;
                                  }
                                  const exists = editTeacherForm.classTeacherClasses.some(c => c.level === lvlSel.value && c.section === secSel.value);
                                  if (exists) { alert('Already assigned as Class Teacher for this class.'); return; }
                                  setEditTeacherForm({ ...editTeacherForm, classTeacherClasses: [...editTeacherForm.classTeacherClasses, { level: lvlSel.value, section: secSel.value }] });
                                }}
                                style={{ ...styles.submitBtn, padding: '0.35rem 0.65rem', fontSize: '0.78rem', backgroundColor: '#8B1A1A', borderColor: '#8B1A1A' }}
                              >+ Assign</button>
                            </div>
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto' }}>
                              {editTeacherForm.classTeacherClasses.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Class Teacher assignments yet.</span>
                              ) : editTeacherForm.classTeacherClasses.map((c, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0.5rem', backgroundColor: 'rgba(139,26,26,0.1)', borderRadius: '3px', border: '1px solid rgba(139,26,26,0.3)' }}>
                                  <span>🏫 {c.level} — {c.section}</span>
                                  <button type="button" onClick={() => setEditTeacherForm({ ...editTeacherForm, classTeacherClasses: editTeacherForm.classTeacherClasses.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#8B1A1A', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ ...styles.cardHeader, margin: 0 }}>Student Roll Call</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                        Active student roll registry, parental access codes, and configured school fees.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeleteSelectedStudents}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: 'var(--error)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.825rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Delete Selected ({selectedStudentIds.length})
                        </button>
                      )}
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Filter Class:</label>
                      <select 
                        value={selectedRollCallClass} 
                        onChange={e => setSelectedRollCallClass(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-base)', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="All">All Classes</option>
                        {[...new Set(activeClasses.map(c => c.className))].sort().map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={styles.tableWrapper}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={allVisibleSelected} 
                              onChange={handleToggleSelectAll} 
                              style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                            />
                          </th>
                          <th>Name</th>
                          <th>Adm Number</th>
                          <th>Class</th>
                          <th>Parent PIN</th>
                          <th>School Fees</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map(s => (
                          <tr key={s._id}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedStudentIds.includes(s._id)} 
                                onChange={() => handleToggleSelectStudent(s._id)}
                                style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                              />
                            </td>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Section tabs for Conventional vs Islamic */}
                        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => { setCsvTab('conventional'); setUploadResults(null); }}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              background: 'transparent',
                              borderBottom: csvTab === 'conventional' ? '3px solid var(--primary)' : 'none',
                              color: csvTab === 'conventional' ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              marginBottom: '-5px',
                              transition: 'all 0.2s'
                            }}
                          >
                            Conventional Section
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCsvTab('islamic'); setUploadResults(null); }}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              background: 'transparent',
                              borderBottom: csvTab === 'islamic' ? '3px solid var(--primary)' : 'none',
                              color: csvTab === 'islamic' ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              marginBottom: '-5px',
                              transition: 'all 0.2s'
                            }}
                          >
                            Islamic / Tahfeez Section
                          </button>
                        </div>

                        {/* Guide text & template downloads */}
                        <div style={{ backgroundColor: 'var(--bg-base)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
                            {csvTab === 'conventional' ? 'Conventional Student CSV Template' : 'Islamic / Tahfeez Student CSV Template'}
                          </span>
                          <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
                            {csvTab === 'conventional'
                              ? 'Required columns: name, admissionNumber, level, section. Profile details like DOB, Gender, House, and Club are optional but recommended.'
                              : 'Required columns: name (English), nameArabic (Arabic Name for report cards), admissionNumber, level, section. Profile details are optional but recommended.'}
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => downloadTemplate(csvTab)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.75rem',
                                border: '1px solid var(--primary)',
                                background: 'var(--primary-glow)',
                                color: 'var(--primary)',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              📥 Download Template
                            </button>
                            <button
                              type="button"
                              onClick={() => copySampleData(csvTab)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              📋 Copy Sample CSV
                            </button>
                          </div>
                        </div>

                        {/* File upload drag and drop zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          style={{
                            border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                            backgroundColor: isDragging ? 'var(--primary-glow)' : 'var(--bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileInputChange}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem' }}>📂</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              Drag & Drop CSV File here
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              or click to browse local files
                            </span>
                          </div>
                        </div>

                        {/* Manual paste / edit textarea */}
                        <form onSubmit={handleUploadStudents} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Or Paste/Edit Raw CSV Text
                            </label>
                             <textarea
                              rows={6}
                              style={{ fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                              placeholder=""
                              value={studentCsvFile}
                              onChange={e => { setStudentCsvFile(e.target.value); setUploadResults(null); }}
                            />
                          </div>

                          {/* Preview Grid */}
                          {csvPreview.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', backgroundColor: 'var(--bg-base)' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                👀 Live Import Preview ({csvPreview.length} students detected)
                              </span>
                              <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                      <th style={{ padding: '0.3rem 0.5rem' }}>Name (En)</th>
                                      {csvTab === 'islamic' && <th style={{ padding: '0.3rem 0.5rem' }}>Name (Ar)</th>}
                                      <th style={{ padding: '0.3rem 0.5rem' }}>Admission</th>
                                      <th style={{ padding: '0.3rem 0.5rem' }}>Class</th>
                                      <th style={{ padding: '0.3rem 0.5rem' }}>Sec</th>
                                      <th style={{ padding: '0.3rem 0.5rem' }}>Gender</th>
                                      <th style={{ padding: '0.3rem 0.5rem' }}>House</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {csvPreview.slice(0, 10).map((row, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '0.3rem 0.5rem', fontWeight: 'bold' }}>{row.name}</td>
                                        {csvTab === 'islamic' && <td dir="rtl" style={{ padding: '0.3rem 0.5rem', fontFamily: 'Cairo, sans-serif' }}>{row.nameArabic}</td>}
                                        <td style={{ padding: '0.3rem 0.5rem' }}><code>{row.admissionNumber}</code></td>
                                        <td style={{ padding: '0.3rem 0.5rem' }}>{row.level}</td>
                                        <td style={{ padding: '0.3rem 0.5rem' }}>{row.section}</td>
                                        <td style={{ padding: '0.3rem 0.5rem' }}>{row.gender || '-'}</td>
                                        <td style={{ padding: '0.3rem 0.5rem' }}>{row.house || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {csvPreview.length > 10 && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                                    Showing first 10 of {csvPreview.length} rows...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <button type="submit" style={styles.submitBtn}>
                            🚀 Upload {csvPreview.length > 0 ? csvPreview.length : ''} Students
                          </button>
                        </form>

                        {/* Detailed Results Reporting Card */}
                        {uploadResults && (
                          <div style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: 'var(--shadow-sm)'
                          }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
                              🎉 Processing Summary
                            </h4>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                              <span>✅ Registered: <span style={{ color: 'var(--success)' }}>{uploadResults.uploadedCount}</span></span>
                              <span>⚠️ Skipped: <span style={{ color: uploadResults.skipped.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{uploadResults.skipped.length}</span></span>
                            </div>

                            {uploadResults.skipped.length > 0 && (
                              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ backgroundColor: 'var(--bg-base)', padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                  Skipped Students List (Duplicates / Incomplete Data)
                                </div>
                                <div style={{ overflowY: 'auto', maxHeight: '120px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.3rem 0.5rem' }}>Name</th>
                                        <th style={{ padding: '0.3rem 0.5rem' }}>Adm Number</th>
                                        <th style={{ padding: '0.3rem 0.5rem' }}>Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {uploadResults.skipped.map((skip, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                          <td style={{ padding: '0.3rem 0.5rem', fontWeight: 'bold' }}>{skip.name || 'Unnamed Student'}</td>
                                          <td style={{ padding: '0.3rem 0.5rem' }}><code>{skip.admissionNumber || '-'}</code></td>
                                          <td style={{ padding: '0.3rem 0.5rem', color: 'var(--error)', fontWeight: '500' }}>{skip.reason}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleAddStudentManual} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name (English) *</label>
                          <input 
                            type="text" 
                            required
                            placeholder=""
                            value={manualStudent.name}
                            onChange={e => setManualStudent({ ...manualStudent, name: e.target.value })}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name (Arabic - optional)</label>
                          <input 
                            type="text" 
                            placeholder=""
                            value={manualStudent.nameArabic}
                            onChange={e => setManualStudent({ ...manualStudent, nameArabic: e.target.value })}
                            dir="rtl"
                            style={{ fontFamily: 'Cairo, sans-serif', textAlign: 'right' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admission Number *</label>
                          <input 
                            type="text" 
                            required
                            placeholder=""
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
                              placeholder=""
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
                            placeholder=""
                            value={manualStudent.schoolFees}
                            onChange={e => setManualStudent({ ...manualStudent, schoolFees: e.target.value })}
                          />
                        </div>
                        {(isAlQalam || isConventional) && (
                          <>
                            <div className="form-row-responsive">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date of Birth *</label>
                                <input 
                                  type="date" 
                                  required
                                  value={manualStudent.dob}
                                  onChange={e => setManualStudent({ ...manualStudent, dob: e.target.value })}
                                  onClick={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                                  onFocus={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Gender *</label>
                                <select 
                                  required
                                  value={manualStudent.gender}
                                  onChange={e => setManualStudent({ ...manualStudent, gender: e.target.value })}
                                >
                                  <option value="">Select Gender</option>
                                  <option value="MALE">MALE</option>
                                  <option value="FEMALE">FEMALE</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-row-responsive">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>House *</label>
                                <input 
                                  type="text" 
                                  required
                                  placeholder=""
                                  value={manualStudent.house}
                                  onChange={e => setManualStudent({ ...manualStudent, house: e.target.value })}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Club / Society *</label>
                                <input 
                                  type="text" 
                                  required
                                  placeholder=""
                                  value={manualStudent.club}
                                  onChange={e => setManualStudent({ ...manualStudent, club: e.target.value })}
                                />
                              </div>
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Passport Photo</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  processImageFile(file, (base64) => {
                                    setManualStudent({ ...manualStudent, picture: base64 });
                                  });
                                }
                              }}
                              style={{ width: 'auto' }}
                            />
                            {manualStudent.picture && (
                              <div style={{ position: 'relative' }}>
                                <img 
                                  src={manualStudent.picture} 
                                  alt="Preview" 
                                  style={{ width: '40px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => setManualStudent({ ...manualStudent, picture: '' })}
                                  style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    background: 'var(--danger)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    fontSize: '9px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
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
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name (English) *</label>
                      <input 
                        type="text" 
                        required
                        value={editStudentForm.name}
                        onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name (Arabic - optional)</label>
                      <input 
                        type="text" 
                        value={editStudentForm.nameArabic}
                        onChange={e => setEditStudentForm({ ...editStudentForm, nameArabic: e.target.value })}
                        dir="rtl"
                        style={{ fontFamily: 'Cairo, sans-serif', textAlign: 'right' }}
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
                    {(isAlQalam || isConventional) && (
                      <>
                        <div className="form-row-responsive">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date of Birth *</label>
                            <input 
                              type="date" 
                              required
                              value={editStudentForm.dob}
                              onChange={e => setEditStudentForm({ ...editStudentForm, dob: e.target.value })}
                              onClick={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                              onFocus={e => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Gender *</label>
                            <select 
                              required
                              value={editStudentForm.gender}
                              onChange={e => setEditStudentForm({ ...editStudentForm, gender: e.target.value })}
                            >
                              <option value="">Select Gender</option>
                              <option value="MALE">MALE</option>
                              <option value="FEMALE">FEMALE</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-row-responsive">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>House *</label>
                            <input 
                              type="text" 
                              required
                              placeholder=""
                              value={editStudentForm.house}
                              onChange={e => setEditStudentForm({ ...editStudentForm, house: e.target.value })}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Club / Society *</label>
                            <input 
                              type="text" 
                              required
                              placeholder=""
                              value={editStudentForm.club}
                              onChange={e => setEditStudentForm({ ...editStudentForm, club: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Passport Photo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              processImageFile(file, (base64) => {
                                setEditStudentForm({ ...editStudentForm, picture: base64 });
                              });
                            }
                          }}
                          style={{ width: 'auto' }}
                        />
                        {editStudentForm.picture && (
                          <div style={{ position: 'relative' }}>
                            <img 
                              src={editStudentForm.picture} 
                              alt="Preview" 
                              style={{ width: '40px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} 
                            />
                            <button
                              type="button"
                              onClick={() => setEditStudentForm({ ...editStudentForm, picture: '' })}
                              style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: 'var(--danger)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '14px',
                                height: '14px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                  <label style={styles.label}>School Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processImageFile(file, (base64) => {
                            setSettingsLogo(base64);
                          });
                        }
                      }}
                      style={{ width: 'auto' }}
                    />
                    {settingsLogo ? (
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={settingsLogo} 
                          alt="School Logo Preview" 
                          style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setSettingsLogo('')}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No logo selected (default: DSH Logo)</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                  <label style={styles.label}>Islamic / Tahfeez Section Badge</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processImageFile(file, (base64) => {
                            setSettingsIslamicLogo(base64);
                          });
                        }
                      }}
                      style={{ width: 'auto' }}
                    />
                    {settingsIslamicLogo ? (
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={settingsIslamicLogo} 
                          alt="Islamic Badge Preview" 
                          style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} 
                        />
                        <button
                          type="button"
                          onClick={() => setSettingsIslamicLogo('')}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: 'var(--error)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No section badge selected (falls back to main school logo)</span>
                    )}
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Curriculum Focus</label>
                  <select value={settingsCurriculumType} onChange={e => setSettingsCurriculumType(e.target.value as any)}>
                    <option value="dual">Islamic & Academic Dual Curriculum (Tahfeez)</option>
                    <option value="conventional">Conventional Section / Academic Only</option>
                  </select>
                </div>

                <div style={{ padding: '0.75rem', border: '2px solid #8B1A1A', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(139,26,26,0.04)' }}>
                  <h4 style={{ color: '#8B1A1A', fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '0.9rem' }}>🏫 Class Teacher (Class Master/Mistress) Settings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settingsAllowMultiClassTeacher}
                        onChange={e => setSettingsAllowMultiClassTeacher(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>
                        <strong>Allow Class Teacher to manage multiple classes</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>If unchecked, a teacher can only be Class Teacher for one class at a time.</span>
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settingsAllowClassTeacherNextTerm}
                        onChange={e => setSettingsAllowClassTeacherNextTerm(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>
                        <strong>Allow Class Teacher to edit Next Term information</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>If unchecked, only Admin can set next term dates and fees on report cards.</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>School Name (English)</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsSchoolName} 
                    onChange={e => setSettingsSchoolName(e.target.value)} 
                    placeholder="English School Name" 
                  />
                </div>
                <div>
                  <label style={styles.label}>School Name (Arabic)</label>
                  <input 
                    type="text" 
                    value={settingsSchoolNameArabic} 
                    onChange={e => setSettingsSchoolNameArabic(e.target.value)} 
                    placeholder="أكاديمية دار صغار الحفاظ" 
                    dir="rtl"
                  />
                </div>
                <div>
                  <label style={styles.label}>School Sub-Header (PDF Curriculum/Annexes line)</label>
                  <input 
                    type="text" 
                    required 
                    value={settingsSchoolSubHeader} 
                    onChange={e => setSettingsSchoolSubHeader(e.target.value)} 
                    placeholder="Early Years · Elementary · Islamic/Tahfeezh (Dual Curriculum)" 
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

                <div style={{ marginTop: '1rem' }}>
                  <label style={styles.label}>Accountant WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={settingsAccountantWhatsApp} 
                    onChange={e => setSettingsAccountantWhatsApp(e.target.value)} 
                    placeholder="e.g. +2348012345678" 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Enter with international prefix (e.g. +234...) so the parent WhatsApp button links correctly.
                  </span>
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
                <div className="form-row-responsive">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category / Section *</label>
                    <select value={newSubjSection} onChange={e => setNewSubjSection(e.target.value as any)}>
                      <option value="academic">Academic (Secular)</option>
                      <option value="tahfeezh">Tahfeezh (Qur'an & Hifz)</option>
                      <option value="islamic">Islamic Studies</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Class Section *</label>
                    <select
                      required
                      value={newSubjClassSection}
                      onChange={e => setNewSubjClassSection(e.target.value)}
                    >
                      <option value="">Select Section</option>
                      {uniqueSections.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
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
                        <th>Category</th>
                        <th>Class Section</th>
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
                          <td style={{ fontWeight: '600' }}>{s.classSection || '—'}</td>
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
                                  setEditSubjForm({ name: s.name, nameArabic: s.nameArabic, section: s.section, classSection: s.classSection || '' });
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={styles.label}>Class Section *</label>
                      <select
                        required
                        value={editSubjForm.classSection}
                        onChange={e => setEditSubjForm({ ...editSubjForm, classSection: e.target.value })}
                      >
                        <option value="">Select Section</option>
                        {uniqueSections.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
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
                          <span style={r.status === 'approved' ? styles.statusBadgeApproved : styles.statusBadgePending}>
                            {r.status === 'approved' ? 'Approved' : 'Pending Approval'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={styles.navButton} onClick={() => openResultSheet(r)}>View</button>
                            <button 
                              style={r.status === 'approved' ? styles.rejectBtn : styles.approveBtn}
                              onClick={() => handleToggleResult(r._id, r.status === 'approved')}
                            >
                              {r.status === 'approved' ? 'Revoke' : 'Approve'}
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

        {/* 6. BILLING PORTAL TAB */}
        {activeAdminSubTab === 'billing' && (
          <div>
            <h3 style={styles.cardHeader}>Billing & Subscriptions</h3>
            <BillingPortalView />
          </div>
        )}
      </main>

      {approvalModalOpen && selectedResultForApproval && (
        <div className="modal-overlay-blur">
          <div className="modal-card modal-card-sm animate-scale-in" style={{ maxWidth: '500px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} /> Approve Student Report
              </h3>
              <button 
                type="button" 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => { setApprovalModalOpen(false); setSelectedResultForApproval(null); }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Student Name:</span>
              <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {typeof selectedResultForApproval.studentId === 'object' && selectedResultForApproval.studentId ? selectedResultForApproval.studentId.name : 'Student'}
              </strong>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Head Teacher Comments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div className="flex-between">
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Head Teacher's Remarks
                  </label>
                  <button 
                    type="button"
                    className="ai-remarks-btn"
                    disabled={aiGenerating}
                    onClick={() => triggerAiCommentGen(selectedResultForApproval)}
                    style={{
                      border: 'none',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Sparkles size={11} /> {aiGenerating ? 'AI Generating...' : 'AI Remarks'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={headTeacherComments}
                  onChange={e => setHeadTeacherComments(e.target.value)}
                  placeholder="Write Head Teacher's remarks here or use the AI Sparks generator above..."
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              {/* Next Term Begins */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Next Term Begins
                </label>
                <input
                  type="text"
                  value={nextTermBegins}
                  onChange={e => setNextTermBegins(e.target.value)}
                  placeholder="e.g. 2026-09-15"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>

              {/* Next Term School Fees */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Next Term School Fees
                </label>
                <input
                  type="text"
                  value={nextTermSchoolFees}
                  onChange={e => setNextTermSchoolFees(e.target.value)}
                  placeholder="e.g. ₦45,000 or ₦45,000.00"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                className="btn" 
                disabled={approvingResult}
                onClick={handleConfirmApproval}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {approvingResult ? 'Approving...' : 'Confirm Approval'}
              </button>
              <button 
                type="button" 
                onClick={() => { setApprovalModalOpen(false); setSelectedResultForApproval(null); }}
                style={{ ...styles.deleteBtn, flex: 1, margin: 0, padding: '0.65rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
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
