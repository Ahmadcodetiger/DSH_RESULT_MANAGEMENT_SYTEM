import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
  Dimensions,
  Animated,
  Platform,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdminDashboardProps {
  onLogout: () => void;
  navigateToBulkUpload: () => void;
  onSelectStudentGrading?: (student: any, term: string, academicYear: string) => void;
}

export default function AdminDashboard({ onLogout, navigateToBulkUpload, onSelectStudentGrading }: AdminDashboardProps) {
  // Navigation panel selector
  const [activePanel, setActivePanel] = useState<'students' | 'teachers' | 'results' | 'subjects' | 'credentials' | 'notifications'>('students');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarAnim = React.useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  // Active Admin Profile states
  const [adminName, setAdminName] = useState('Administrator');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Core Data Collections
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Loading indicator states
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingGlobalResults, setLoadingGlobalResults] = useState(false);

  // Teacher Modals and Form state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  
  // Teacher Class Allocations
  const [tempLevel, setTempLevel] = useState('');
  const [tempSection, setTempSection] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<Array<{ level: string; section: string }>>([]);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  // Results Management
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedStudentForResults, setSelectedStudentForResults] = useState<any>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Dynamic Subjects states
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectArabic, setSubjectArabic] = useState('');
  const [subjectSection, setSubjectSection] = useState<'tahfeezh' | 'academic'>('academic');
  const [subjectIsGraded, setSubjectIsGraded] = useState(true);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);

  // Notifications states
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementTarget, setAnnouncementTarget] = useState<'ALL' | 'TEACHER' | 'PARENT'>('ALL');

  // --- Initializing Data Fetching on mount ---
  useEffect(() => {
    fetchAdminProfile();
    fetchTeachers();
    fetchStudents();
    fetchGlobalResults();
    loadDynamicSubjects();
    loadNotifications();
  }, []);

  // --- Sidebar animation triggers ---
  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: isSidebarOpen ? 0 : -SCREEN_WIDTH * 0.78,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarNavigation = (panel: typeof activePanel) => {
    setActivePanel(panel);
    setIsSidebarOpen(false);
  };

  // --- Fetch Admin Profile ---
  const fetchAdminProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/admin/profile');
      setAdminName(res.data.name || 'Administrator');
      setAdminUsername(res.data.username || 'admin');
    } catch (err: any) {
      console.log('Error loading admin profile:', err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  // --- Fetch Core Data from Server ---
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await api.get('/admin/teachers');
      setTeachers(res.data);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load teachers list');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load students list');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchGlobalResults = async () => {
    setLoadingGlobalResults(true);
    try {
      const res = await api.get('/admin/results');
      setGlobalResults(res.data);
    } catch (err: any) {
      console.log('Error loading global results:', err.message);
    } finally {
      setLoadingGlobalResults(false);
    }
  };

  // --- Dynamic Subject Handlers via AsyncStorage ---
  const loadDynamicSubjects = async () => {
    try {
      const stored = await AsyncStorage.getItem('huffaz_subjects');
      if (stored) {
        setSubjects(JSON.parse(stored));
      } else {
        const defaultList = [
          { subjectName: "Al-Qur'an Karem (Hifz)", subjectNameArabic: "القرآن الكريم ( حفظ )", isGraded: true, section: 'tahfeezh' },
          { subjectName: "Al-Qur'an (Writing)", subjectNameArabic: "القرآن كتابة", isGraded: false, section: 'tahfeezh' },
          { subjectName: "Arabic", subjectNameArabic: "العربية", isGraded: true, section: 'tahfeezh' },
          { subjectName: "Grammar VERBAL", subjectNameArabic: "القواعد", isGraded: true, section: 'tahfeezh' },
          { subjectName: "Islamic Subjects", subjectNameArabic: "المواد الإسلامية", isGraded: true, section: 'tahfeezh' },
          { subjectName: "Science", subjectNameArabic: "علوم", isGraded: true, section: 'academic' },
          { subjectName: "Literacy", subjectNameArabic: "معرفة القراءة والكتابة", isGraded: true, section: 'academic' },
          { subjectName: "Numeracy", subjectNameArabic: "الحساب", isGraded: true, section: 'academic' },
          { subjectName: "Phonics", subjectNameArabic: "سماع الصوت", isGraded: false, section: 'academic' },
          { subjectName: "Social Habits", subjectNameArabic: "العادات الاجتماعية", isGraded: false, section: 'academic' }
        ];
        await AsyncStorage.setItem('huffaz_subjects', JSON.stringify(defaultList));
        setSubjects(defaultList);
      }
    } catch (err) {
      console.log('Error loading dynamic subjects:', err);
    }
  };

  const openSubjectModal = (index: number | null = null) => {
    if (index !== null) {
      setEditingSubjectIndex(index);
      setSubjectTitle(subjects[index].subjectName);
      setSubjectArabic(subjects[index].subjectNameArabic);
      setSubjectSection(subjects[index].section || 'academic');
      setSubjectIsGraded(subjects[index].isGraded !== undefined ? subjects[index].isGraded : true);
    } else {
      setEditingSubjectIndex(null);
      setSubjectTitle('');
      setSubjectArabic('');
      setSubjectSection('academic');
      setSubjectIsGraded(true);
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectTitle || !subjectArabic) {
      Alert.alert('Validation', 'Please fill in both English and Arabic subject names');
      return;
    }

    const updated = [...subjects];
    const newSubject = {
      subjectName: subjectTitle.trim(),
      subjectNameArabic: subjectArabic.trim(),
      section: subjectSection,
      isGraded: subjectIsGraded
    };

    if (editingSubjectIndex !== null) {
      updated[editingSubjectIndex] = newSubject;
      Alert.alert('Success', 'Subject updated successfully.');
    } else {
      updated.push(newSubject);
      Alert.alert('Success', 'New subject added successfully.');
    }

    await AsyncStorage.setItem('huffaz_subjects', JSON.stringify(updated));
    setSubjects(updated);
    setIsSubjectModalOpen(false);
    
    // Log action to notifications
    addNotificationLog('Subject Inventory Updated', `Admin updated subject: "${newSubject.subjectName}"`);
  };

  const handleDeleteSubject = (index: number) => {
    Alert.alert('Delete Subject', `Are you sure you want to remove "${subjects[index].subjectName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const name = subjects[index].subjectName;
          const updated = subjects.filter((_, i) => i !== index);
          await AsyncStorage.setItem('huffaz_subjects', JSON.stringify(updated));
          setSubjects(updated);
          addNotificationLog('Subject Deleted', `Admin removed subject: "${name}"`);
        }
      }
    ]);
  };

  // --- Secure Admin Credentials handler ---
  const handleUpdateAdminProfile = async () => {
    if (!adminName.trim() || !adminUsername.trim()) {
      Alert.alert('Validation', 'Name and Username cannot be empty');
      return;
    }
    setUpdatingProfile(true);
    try {
      const payload: any = {
        name: adminName,
        username: adminUsername
      };
      if (adminPassword.trim() !== '') {
        payload.password = adminPassword;
      }
      await api.put('/admin/profile', payload);
      Alert.alert('Success', 'Admin credentials updated successfully.');
      setAdminPassword('');
      fetchAdminProfile();
      addNotificationLog('Credentials Updated', 'Administrator credentials updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // --- Notifications via Backend API ---
  const loadNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setNotifications(res.data || []);
    } catch (err: any) {
      console.log('Error loading notifications from backend:', err.message);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addNotificationLog = async (title: string, message: string) => {
    // Internal system logs: saved to backend as ALL-targeted notifications
    try {
      await api.post('/admin/notifications', { title, message, targetRole: 'ALL' });
      await loadNotifications();
    } catch (err: any) {
      console.log('Error saving notification log:', err.message);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMsg.trim()) {
      Alert.alert('Validation', 'Please provide a title and announcement message');
      return;
    }
    setSendingAnnouncement(true);
    try {
      await api.post('/admin/notifications', {
        title: announcementTitle,
        message: announcementMsg,
        targetRole: announcementTarget || 'ALL',
      });
      await loadNotifications();
      Alert.alert('Announcement Sent', `Broadcast sent to ${announcementTarget || 'ALL'} portals successfully.`);
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      setIsAnnouncementModalOpen(false);
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not broadcast announcement');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const clearAllNotifications = () => {
    Alert.alert('Clear All', 'This will permanently delete ALL sent notifications. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete each one by ID
            const current = await api.get('/admin/notifications');
            const all: any[] = current.data || [];
            await Promise.all(all.map((n: any) => api.delete(`/admin/notifications/${n._id}`)));
            setNotifications([]);
            Alert.alert('Cleared', 'All notifications deleted.');
          } catch (err: any) {
            Alert.alert('Error', 'Could not clear notifications.');
          }
        },
      },
    ]);
  };


  // --- Teacher Actions ---
  const handleAddClass = () => {
    if (!tempLevel || !tempSection) {
      Alert.alert('Validation', 'Please fill in both Level and Section');
      return;
    }
    if (assignedClasses.some(c => c.level === tempLevel && c.section === tempSection)) {
      Alert.alert('Duplicate', 'Class allocation already added.');
      return;
    }
    setAssignedClasses([...assignedClasses, { level: tempLevel, section: tempSection }]);
    setTempLevel('');
    setTempSection('');
  };

  const handleRemoveClass = (index: number) => {
    setAssignedClasses(assignedClasses.filter((_, i) => i !== index));
  };

  const handleSaveTeacher = async () => {
    if (!teacherName || !teacherUsername || (!teacherPassword && !editingTeacherId)) {
      setTeacherError('Please fill in all required fields');
      return;
    }
    setTeacherError('');
    setSavingTeacher(true);
    try {
      const payload: any = {
        name: teacherName,
        username: teacherUsername,
        assignedClasses
      };
      if (teacherPassword) payload.password = teacherPassword;

      if (editingTeacherId) {
        await api.put(`/admin/teachers/${editingTeacherId}`, payload);
        Alert.alert('Success', 'Teacher account updated successfully');
        addNotificationLog('Teacher Updated', `Teacher details updated for ${teacherName}`);
      } else {
        await api.post('/admin/teachers', payload);
        Alert.alert('Success', 'Teacher account created successfully');
        addNotificationLog('Teacher Registered', `New teacher registered: ${teacherName}`);
      }
      
      setTeacherName('');
      setTeacherUsername('');
      setTeacherPassword('');
      setAssignedClasses([]);
      setEditingTeacherId(null);
      setIsTeacherModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      setTeacherError(err.response?.data?.message || 'Error saving teacher');
    } finally {
      setSavingTeacher(false);
    }
  };

  const openTeacherModal = (teacher: any = null) => {
    if (teacher) {
      setEditingTeacherId(teacher._id);
      setTeacherName(teacher.name);
      setTeacherUsername(teacher.username);
      setTeacherPassword('');
      setAssignedClasses(teacher.assignedClasses || []);
    } else {
      setEditingTeacherId(null);
      setTeacherName('');
      setTeacherUsername('');
      setTeacherPassword('');
      setAssignedClasses([]);
    }
    setTeacherError('');
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    Alert.alert('Delete Teacher', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/teachers/${id}`);
            Alert.alert('Deleted', 'Teacher removed.');
            fetchTeachers();
            addNotificationLog('Teacher Removed', `Teacher account deleted for ${name}`);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete teacher');
          }
        }
      }
    ]);
  };

  // --- Student Actions ---
  const handleDeleteStudent = (id: string, name: string) => {
    Alert.alert('Delete Student', `Are you sure you want to delete student ${name}? This will permanently delete all related results.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/students/${id}`);
            Alert.alert('Deleted', 'Student and reports removed.');
            fetchStudents();
            fetchGlobalResults();
            addNotificationLog('Student Deleted', `Student report and profile deleted for: ${name}`);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete student');
          }
        }
      }
    ]);
  };

  const openStudentResults = async (student: any) => {
    setSelectedStudentForResults(student);
    setIsResultsModalOpen(true);
    fetchStudentResults(student._id);
  };

  const fetchStudentResults = async (studentId: string) => {
    setLoadingResults(true);
    try {
      const res = await api.get(`/grading/student/${studentId}`);
      setStudentResults(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch student results');
    } finally {
      setLoadingResults(false);
    }
  };

  // --- Results approval actions ---
  const handleToggleResultStatus = async (resultId: string) => {
    try {
      await api.patch(`/admin/results/${resultId}/status`);
      fetchGlobalResults();
      if (selectedStudentForResults) {
        fetchStudentResults(selectedStudentForResults._id);
      }
      addNotificationLog('Result Status Toggled', `Admin toggled status for result ID: ${resultId}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update result status');
    }
  };

  const handleDeleteResult = (resultId: string) => {
    Alert.alert('Delete Result', 'Are you sure you want to delete this report sheet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/results/${resultId}`);
            fetchGlobalResults();
            if (selectedStudentForResults) {
              fetchStudentResults(selectedStudentForResults._id);
            }
            addNotificationLog('Result Deleted', `Admin deleted report sheet ID: ${resultId}`);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete result');
          }
        }
      }
    ]);
  };

  const handleEditResult = (result: any) => {
    setIsResultsModalOpen(false);
    if (onSelectStudentGrading && selectedStudentForResults) {
      onSelectStudentGrading(selectedStudentForResults, result.term, result.academicYear);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Premium Banner Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity style={styles.menuTrigger} onPress={toggleSidebar}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
          <Image
            source={require('../../../assets/images/dsh_logo.png')}
            style={styles.headerLogo}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>
              {activePanel === 'students' && '👥 Manage Students'}
              {activePanel === 'teachers' && '🎓 Manage Teachers'}
              {activePanel === 'results' && '📝 Manage Results'}
              {activePanel === 'subjects' && '📖 Manage Subjects'}
              {activePanel === 'credentials' && '🔐 Admin Settings'}
              {activePanel === 'notifications' && '🔔 Notification Hub'}
            </Text>
            <Text style={styles.headerSubtitle}>Home of Young Huffaz Academy</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.notificationBell} 
          onPress={() => setActivePanel('notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{notifications.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Panel Content Area */}
      <View style={{ flex: 1 }}>
        
        {/* PANEL 1: MANAGE STUDENTS */}
        {activePanel === 'students' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Ionicons name="school" size={24} color="#1E5631" />
                <Text style={styles.statVal}>{students.length}</Text>
                <Text style={styles.statLabel}>Active Students</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: '#d4af37' }]}>
                <Ionicons name="document-text" size={24} color="#d4af37" />
                <Text style={[styles.statVal, { color: '#d4af37' }]}>{globalResults.length}</Text>
                <Text style={styles.statLabel}>Results Sheets</Text>
              </View>
            </View>

            {/* Quick action buttons */}
            <View style={styles.actionsBox}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.bulkBtn]} 
                onPress={navigateToBulkUpload}
              >
                <Ionicons name="cloud-upload" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Bulk Student Upload</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Students Inventory</Text>
              <TouchableOpacity onPress={fetchStudents}>
                <Ionicons name="refresh" size={16} color="#1E5631" />
              </TouchableOpacity>
            </View>

            {loadingStudents ? (
              <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
            ) : students.length === 0 ? (
              <Text style={styles.emptyText}>No students uploaded yet. Use 'Bulk Student Upload'.</Text>
            ) : (
              <View style={styles.studentsWrapper}>
                {students.map((student) => (
                  <View key={student._id} style={styles.studentItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentSub}>
                        {student.admissionNumber} | Level {student.level} ({student.section})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.studentDeleteBtn, { borderColor: '#d0ebd0', backgroundColor: '#eaf5ea' }]}
                        onPress={() => openStudentResults(student)}
                      >
                        <Text style={[styles.studentDeleteBtnText, { color: '#1E5631' }]}>Results</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.studentDeleteBtn}
                        onPress={() => handleDeleteStudent(student._id, student.name)}
                      >
                        <Text style={styles.studentDeleteBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* PANEL 2: MANAGE TEACHERS */}
        {activePanel === 'teachers' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.actionsBox}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openTeacherModal()}>
                <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Add Teacher Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Teachers & Class Allocations</Text>
              <TouchableOpacity onPress={fetchTeachers}>
                <Ionicons name="refresh" size={16} color="#1E5631" />
              </TouchableOpacity>
            </View>

            {loadingTeachers ? (
              <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
            ) : teachers.length === 0 ? (
              <Text style={styles.emptyText}>No teacher accounts created yet. Click above to add.</Text>
            ) : (
              teachers.map((teacher) => (
                <View key={teacher._id} style={styles.listCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.teacherNameText}>{teacher.name}</Text>
                      <Text style={styles.teacherUsernameText}>@{teacher.username}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={styles.editBtnSmall}
                        onPress={() => openTeacherModal(teacher)}
                      >
                        <Ionicons name="create-outline" size={16} color="#1E5631" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtnSmall}
                        onPress={() => handleDeleteTeacher(teacher._id, teacher.name)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#d32f2f" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.allocTitle}>Assigned Classes:</Text>
                  <View style={styles.allocBadges}>
                    {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
                      teacher.assignedClasses.map((cls: any, i: number) => (
                        <View key={i} style={styles.badge}>
                          <Text style={styles.badgeText}>Level {cls.level} - {cls.section}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noAllocText}>No class allocated</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* PANEL 3: MANAGE RESULTS (Global Results Dashboard) */}
        {activePanel === 'results' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Global Report Sheets Dashboard</Text>
              <TouchableOpacity onPress={fetchGlobalResults}>
                <Ionicons name="refresh" size={16} color="#1E5631" />
              </TouchableOpacity>
            </View>

            {loadingGlobalResults ? (
              <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
            ) : globalResults.length === 0 ? (
              <Text style={styles.emptyText}>No report sheets exist. Go to 'Students' to grade a student.</Text>
            ) : (
              globalResults.map((result) => (
                <View key={result._id} style={styles.listCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teacherNameText}>{result.studentId?.name || 'Deleted Student'}</Text>
                      <Text style={styles.teacherUsernameText}>
                        {result.studentId?.admissionNumber || 'N/A'} | Level {result.level} - {result.section}
                      </Text>
                      <Text style={styles.resultDetailsText}>{result.term} | {result.academicYear}</Text>
                    </View>
                    
                    <View style={[
                      styles.badge, 
                      { 
                        backgroundColor: result.status === 'approved' ? '#eaf5ea' : '#fff3e0', 
                        borderColor: result.status === 'approved' ? '#1E5631' : '#ff9800' 
                      }
                    ]}>
                      <Text style={[styles.badgeText, { color: result.status === 'approved' ? '#1E5631' : '#ff9800' }]}>
                        {result.status === 'approved' ? 'APPROVED' : 'DRAFT'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultsStatsSummary}>
                    <Text style={styles.statSummaryLabel}>
                      Grade: <Text style={{ fontWeight: 'bold', color: '#1E5631' }}>{result.generalGrade}</Text>
                    </Text>
                    <Text style={styles.statSummaryLabel}>
                      Average: <Text style={{ fontWeight: 'bold' }}>{result.finalAverage}%</Text>
                    </Text>
                    <Text style={styles.statSummaryLabel}>
                      Total Score: <Text style={{ fontWeight: 'bold' }}>{result.totalMark}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity 
                      style={[styles.resultActionBtn, { backgroundColor: '#1E5631' }]}
                      onPress={() => {
                        setSelectedStudentForResults(result.studentId);
                        handleEditResult(result);
                      }}
                    >
                      <Text style={styles.resultActionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.resultActionBtn, { backgroundColor: result.status === 'approved' ? '#ff9800' : '#1E5631' }]}
                      onPress={() => handleToggleResultStatus(result._id)}
                    >
                      <Text style={styles.resultActionBtnText}>
                        {result.status === 'approved' ? 'Unapprove' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.resultActionBtn, { backgroundColor: '#d32f2f' }]}
                      onPress={() => handleDeleteResult(result._id)}
                    >
                      <Text style={styles.resultActionBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* PANEL 4: MANAGE SUBJECTS */}
        {activePanel === 'subjects' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.actionsBox}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openSubjectModal()}>
                <Ionicons name="add-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Create New Subject</Text>
              </TouchableOpacity>
            </View>

            {/* Tahfeezh group */}
            <Text style={styles.subjectSectionDivider}>📖 Tahfeezh Section Subjects</Text>
            {subjects.filter(s => s.section === 'tahfeezh').map((sub, i) => {
              const globalIdx = subjects.findIndex(s => s.subjectName === sub.subjectName);
              return (
                <View key={i} style={styles.subjectItemCard}>
                  <View>
                    <Text style={styles.subjectItemTitle}>{sub.subjectName}</Text>
                    <Text style={styles.subjectItemArTitle}>{sub.subjectNameArabic}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.badge, { backgroundColor: sub.isGraded ? '#eaf5ea' : '#f0f0f0', borderColor: sub.isGraded ? '#1E5631' : '#ccc' }]}>
                      <Text style={[styles.badgeText, { color: sub.isGraded ? '#1E5631' : '#666', fontSize: 10 }]}>
                        {sub.isGraded ? 'GRADED' : 'UNGRADED'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openSubjectModal(globalIdx)}>
                      <Ionicons name="create-outline" size={18} color="#1E5631" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSubject(globalIdx)}>
                      <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Academic group */}
            <Text style={[styles.subjectSectionDivider, { marginTop: 25 }]}>📚 Academic Section Subjects</Text>
            {subjects.filter(s => s.section === 'academic').map((sub, i) => {
              const globalIdx = subjects.findIndex(s => s.subjectName === sub.subjectName);
              return (
                <View key={i} style={styles.subjectItemCard}>
                  <View>
                    <Text style={styles.subjectItemTitle}>{sub.subjectName}</Text>
                    <Text style={styles.subjectItemArTitle}>{sub.subjectNameArabic}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.badge, { backgroundColor: sub.isGraded ? '#eaf5ea' : '#f0f0f0', borderColor: sub.isGraded ? '#1E5631' : '#ccc' }]}>
                      <Text style={[styles.badgeText, { color: sub.isGraded ? '#1E5631' : '#666', fontSize: 10 }]}>
                        {sub.isGraded ? 'GRADED' : 'UNGRADED'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openSubjectModal(globalIdx)}>
                      <Ionicons name="create-outline" size={18} color="#1E5631" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSubject(globalIdx)}>
                      <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* PANEL 5: MANAGE CREDENTIALS (Admin Profile update) */}
        {activePanel === 'credentials' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileEditCard}>
              <Text style={styles.profileEditTitle}>Update Administrator Credentials</Text>
              <Text style={styles.profileEditSub}>Update secure name, username, and password credentials here.</Text>

              {loadingProfile ? (
                <ActivityIndicator color="#1E5631" style={{ marginVertical: 30 }} />
              ) : (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.inputLabel}>Administrator Full Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter Full Name"
                    value={adminName}
                    onChangeText={setAdminName}
                  />

                  <Text style={styles.inputLabel}>Secure Login Username</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter Username"
                    autoCapitalize="none"
                    value={adminUsername}
                    onChangeText={setAdminUsername}
                  />

                  <Text style={styles.inputLabel}>New Secure Password (leave blank to keep current)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter New Password"
                    secureTextEntry
                    autoCapitalize="none"
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                  />

                  <TouchableOpacity
                    style={styles.saveProfileBtn}
                    onPress={handleUpdateAdminProfile}
                    disabled={updatingProfile}
                  >
                    {updatingProfile ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.saveProfileBtnText}>Update Credentials</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* PANEL 6: NOTIFICATION HUB */}
        {activePanel === 'notifications' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.actionsBox}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => setIsAnnouncementModalOpen(true)}
              >
                <Ionicons name="megaphone" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>📢 Broadcast Announcement</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#d32f2f' }]} 
                onPress={clearAllNotifications}
              >
                <Ionicons name="trash-bin" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>🗑 Delete All Notifications</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sent Notifications (Teacher &amp; Parent)</Text>
              <TouchableOpacity onPress={loadNotifications}>
                <Text style={{ color: '#1E5631', fontWeight: 'bold', fontSize: 12 }}>↺ Refresh</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications sent yet. Use "Broadcast Announcement" to send one.</Text>
            ) : (
              notifications.map((notif: any) => (
                <View key={notif._id || notif.id} style={styles.notificationCard}>
                  <View style={styles.notificationHeader}>
                    <Text style={[styles.notificationTitle, { flex: 1 }]}>{notif.title}</Text>
                    <View style={[styles.notificationCard, { padding: 4, marginBottom: 0, backgroundColor: '#e8f5e9' }]}>
                      <Text style={{ fontSize: 10, color: '#2e7d32', fontWeight: 'bold' }}>{notif.targetRole || 'ALL'}</Text>
                    </View>
                  </View>
                  <Text style={styles.notificationMsg}>{notif.message}</Text>
                  <Text style={styles.notificationDate}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleString('en-GB') : (notif.date || '')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

      </View>

      {/* --- SIDEBAR NAV DRAWER COMPONENT --- */}
      {isSidebarOpen && (
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1} 
          onPress={toggleSidebar}
        />
      )}

      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Image
            source={require('../../../assets/images/dsh_logo.png')}
            style={styles.sidebarLogo}
            resizeMode="contain"
          />
          <Text style={styles.sidebarProfileName} numberOfLines={1}>{adminName}</Text>
          <Text style={styles.sidebarProfileRole}>SYSTEM ADMINISTRATOR</Text>
        </View>

        <ScrollView contentContainerStyle={styles.sidebarNavList}>
          
          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'students' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('students')}
          >
            <Ionicons name="people" size={20} color={activePanel === 'students' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'students' && styles.sidebarNavTextActive]}>
              Manage Students
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'teachers' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('teachers')}
          >
            <Ionicons name="school" size={20} color={activePanel === 'teachers' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'teachers' && styles.sidebarNavTextActive]}>
              Manage Teachers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'results' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('results')}
          >
            <Ionicons name="documents" size={20} color={activePanel === 'results' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'results' && styles.sidebarNavTextActive]}>
              Manage Results
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'subjects' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('subjects')}
          >
            <Ionicons name="book" size={20} color={activePanel === 'subjects' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'subjects' && styles.sidebarNavTextActive]}>
              Manage Subjects
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'credentials' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('credentials')}
          >
            <Ionicons name="key" size={20} color={activePanel === 'credentials' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'credentials' && styles.sidebarNavTextActive]}>
              Manage Credentials
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sidebarNavItem, activePanel === 'notifications' && styles.sidebarNavItemActive]}
            onPress={() => handleSidebarNavigation('notifications')}
          >
            <Ionicons name="notifications" size={20} color={activePanel === 'notifications' ? '#d4af37' : '#fff'} />
            <Text style={[styles.sidebarNavText, activePanel === 'notifications' && styles.sidebarNavTextActive]}>
              Notifications Hub
            </Text>
          </TouchableOpacity>

        </ScrollView>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
            <Text style={styles.sidebarLogoutText}>Logout Account</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* --- ADD/EDIT TEACHER MODAL --- */}
      <Modal visible={isTeacherModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTeacherId ? 'Edit Teacher Account' : 'Create Teacher Account'}</Text>

            {teacherError ? <Text style={styles.errorBanner}>{teacherError}</Text> : null}

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Teacher's Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Khansau Abdullahi"
                placeholderTextColor="#bbb"
                value={teacherName}
                onChangeText={setTeacherName}
              />

              <Text style={styles.inputLabel}>Username (for login)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. khansau_teacher"
                placeholderTextColor="#bbb"
                value={teacherUsername}
                onChangeText={setTeacherUsername}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password {editingTeacherId ? '(Leave blank to keep current)' : ''}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter password"
                placeholderTextColor="#bbb"
                value={teacherPassword}
                onChangeText={setTeacherPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* Class Allocation Form */}
              <View style={styles.allocFormBox}>
                <Text style={styles.allocFormTitle}>Allocate Level & Section</Text>
                <View style={styles.allocInputsRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                    placeholder="Level (e.g. 5)"
                    placeholderTextColor="#bbb"
                    value={tempLevel}
                    onChangeText={setTempLevel}
                  />
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Section (e.g. ALLO)"
                    placeholderTextColor="#bbb"
                    value={tempSection}
                    onChangeText={setTempSection}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity style={styles.addClassBtn} onPress={handleAddClass}>
                  <Text style={styles.addClassBtnText}>+ Alloc Class</Text>
                </TouchableOpacity>

                <View style={styles.allocBadgesRow}>
                  {assignedClasses.map((cls, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.allocBadgeDelete}
                      onPress={() => handleRemoveClass(idx)}
                    >
                      <Text style={styles.allocBadgeDeleteText}>
                        Level {cls.level}-{cls.section} ✕
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn]}
                onPress={() => setIsTeacherModalOpen(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveTeacher}
                disabled={savingTeacher}
              >
                {savingTeacher ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>{editingTeacherId ? 'Save Changes' : 'Create Account'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- STUDENT RESULTS MODAL --- */}
      <Modal visible={isResultsModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.modalTitle}>
                Results: {selectedStudentForResults?.name}
              </Text>
              <TouchableOpacity onPress={() => setIsResultsModalOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {loadingResults ? (
              <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 20 }} />
            ) : studentResults.length === 0 ? (
              <Text style={styles.emptyText}>No results found for this student.</Text>
            ) : (
              <FlatList
                data={studentResults}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.listCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.teacherNameText}>{item.term}</Text>
                        <Text style={styles.teacherUsernameText}>{item.academicYear}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: item.status === 'approved' ? '#eaf5ea' : '#fff3e0', borderColor: item.status === 'approved' ? '#1E5631' : '#ff9800' }]}>
                        <Text style={[styles.badgeText, { color: item.status === 'approved' ? '#1E5631' : '#ff9800' }]}>
                          {item.status === 'approved' ? 'APPROVED' : 'DRAFT'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ fontSize: 13, marginBottom: 15, color: '#555' }}>
                      Grade: <Text style={{ fontWeight: 'bold' }}>{item.generalGrade}</Text> | Avg: {item.finalAverage}%
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { paddingVertical: 8, flex: 1 }]} 
                        onPress={() => handleEditResult(item)}
                      >
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { paddingVertical: 8, flex: 1.5, backgroundColor: item.status === 'approved' ? '#ff9800' : '#1E5631' }]} 
                        onPress={() => handleToggleResultStatus(item._id)}
                      >
                        <Text style={styles.actionBtnText}>
                          {item.status === 'approved' ? 'Unapprove' : 'Approve'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { paddingVertical: 8, flex: 1, backgroundColor: '#d32f2f' }]} 
                        onPress={() => handleDeleteResult(item._id)}
                      >
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.bulkBtn, { marginTop: 15, width: '100%' }]}
              onPress={() => {
                setIsResultsModalOpen(false);
                if (onSelectStudentGrading && selectedStudentForResults) {
                  onSelectStudentGrading(selectedStudentForResults, 'First Term', '2025/2026');
                }
              }}
            >
              <Text style={styles.actionBtnText}>+ Create New Result</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- ADD/EDIT SUBJECT MODAL --- */}
      <Modal visible={isSubjectModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSubjectIndex !== null ? 'Modify Subject Details' : 'Add Subject to Inventory'}
            </Text>

            <Text style={styles.inputLabel}>Subject Name (English)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Mathematics"
              value={subjectTitle}
              onChangeText={setSubjectTitle}
            />

            <Text style={styles.inputLabel}>Subject Name (Arabic)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. الرياضيات"
              value={subjectArabic}
              onChangeText={setSubjectArabic}
            />

            <Text style={styles.inputLabel}>School Section Grouping</Text>
            <View style={styles.sectionGroupingSelector}>
              <TouchableOpacity
                style={[styles.sectionSelectorBtn, subjectSection === 'tahfeezh' && styles.sectionSelectorBtnActive]}
                onPress={() => setSubjectSection('tahfeezh')}
              >
                <Text style={[styles.sectionSelectorBtnText, subjectSection === 'tahfeezh' && styles.sectionSelectorBtnTextActive]}>
                  Tahfeezh Section
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sectionSelectorBtn, subjectSection === 'academic' && styles.sectionSelectorBtnActive]}
                onPress={() => setSubjectSection('academic')}
              >
                <Text style={[styles.sectionSelectorBtnText, subjectSection === 'academic' && styles.sectionSelectorBtnTextActive]}>
                  Academic Section
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gradedToggleRow}>
              <Text style={styles.gradedToggleLabel}>Require Letter Grading (Exam + Tests)</Text>
              <TouchableOpacity
                style={[styles.gradedToggleBtn, subjectIsGraded && styles.gradedToggleBtnActive]}
                onPress={() => setSubjectIsGraded(!subjectIsGraded)}
              >
                <Ionicons 
                  name={subjectIsGraded ? "checkbox" : "square-outline"} 
                  size={22} 
                  color={subjectIsGraded ? "#1E5631" : "#888"} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn]}
                onPress={() => setIsSubjectModalOpen(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveSubject}
              >
                <Text style={styles.modalSaveText}>Save Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- BROADCAST ANNOUNCEMENT MODAL --- */}
      <Modal visible={isAnnouncementModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Compose Global Broadcast</Text>
            <Text style={styles.modalSubTitle}>This will post an announcement log accessible by teachers and parent portals.</Text>

            <Text style={styles.inputLabel}>Announcement Headline</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. End of Term Holidays Notice"
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
            />

            <Text style={styles.inputLabel}>Announcement Message Body</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Write announcement details..."
              multiline
              value={announcementMsg}
              onChangeText={setAnnouncementMsg}
            />

            <Text style={styles.inputLabel}>Target Audience</Text>
            <View style={styles.targetRoleContainer}>
              {(['ALL', 'TEACHER', 'PARENT'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.targetRoleBtn,
                    announcementTarget === role && styles.targetRoleBtnActive
                  ]}
                  onPress={() => setAnnouncementTarget(role)}
                >
                  <Text
                    style={[
                      styles.targetRoleBtnText,
                      announcementTarget === role && styles.targetRoleBtnTextActive
                    ]}
                  >
                    {role === 'ALL' ? '🌍 All' : role === 'TEACHER' ? '🎓 Teachers' : '👥 Parents'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCloseBtn]}
                onPress={() => setIsAnnouncementModalOpen(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSendAnnouncement}
                disabled={sendingAnnouncement}
              >
                {sendingAnnouncement ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Broadcast</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  header: {
    backgroundColor: '#1E5631',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTrigger: {
    padding: 4,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#fff',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#b3d1b3',
    fontSize: 11,
    marginTop: 1,
  },
  notificationBell: {
    position: 'relative',
    padding: 6,
  },
  bellBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: '#ff4d4d',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#1E5631',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E5631',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  actionsBox: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  bulkBtn: {
    backgroundColor: '#d4af37',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 25,
  },
  // List Cards
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  teacherNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  teacherUsernameText: {
    fontSize: 12,
    color: '#777',
    marginTop: 1,
  },
  resultDetailsText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  resultsStatsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fcf9',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef3ee',
  },
  statSummaryLabel: {
    fontSize: 12,
    color: '#555',
  },
  resultActionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  resultActionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editBtnSmall: {
    backgroundColor: '#eef6ee',
    padding: 6,
    borderRadius: 6,
  },
  deleteBtnSmall: {
    backgroundColor: '#fff0f0',
    padding: 6,
    borderRadius: 6,
  },
  allocTitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  allocBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#f1f8f3',
    borderColor: '#b3d1b3',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: '#1E5631',
    fontWeight: '600',
  },
  noAllocText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  // Students UI
  studentsWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e6e2',
    overflow: 'hidden',
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  studentSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  studentDeleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffebe8',
    backgroundColor: '#fff8f7',
  },
  studentDeleteBtnText: {
    color: '#d32f2f',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Profile settings
  profileEditCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e6e2',
  },
  profileEditTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  profileEditSub: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    lineHeight: 16,
  },
  saveProfileBtn: {
    backgroundColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  saveProfileBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Dynamic Subjects Inventory Styling
  subjectSectionDivider: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E5631',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subjectItemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eef3eef',
  },
  subjectItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  subjectItemArTitle: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  sectionGroupingSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  sectionSelectorBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  sectionSelectorBtnActive: {
    backgroundColor: '#e6f3e6',
    borderColor: '#1E5631',
  },
  sectionSelectorBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  sectionSelectorBtnTextActive: {
    color: '#1E5631',
  },
  gradedToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 15,
  },
  gradedToggleLabel: {
    fontSize: 12,
    color: '#444',
  },
  gradedToggleBtn: {
    padding: 4,
  },
  // Notifications Hub styling
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
    borderWidth: 1,
    borderColor: '#e8ece8',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationDate: {
    fontSize: 10,
    color: '#999',
  },
  notificationMsg: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  // SIDEBAR NAV STYLING (Premium glassmorphic drawer)
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 90,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1E5631',
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 20,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 15,
  },
  sidebarLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sidebarProfileName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sidebarProfileRole: {
    color: '#d4af37',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  sidebarNavList: {
    paddingHorizontal: 10,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarNavItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarNavText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 12,
    fontWeight: '600',
  },
  sidebarNavTextActive: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  sidebarLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sidebarLogoutText: {
    color: '#ff4d4d',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  // Modal layout
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#777',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorBanner: {
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#f8faf8',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  targetRoleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 8,
  },
  targetRoleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8faf8',
  },
  targetRoleBtnActive: {
    backgroundColor: '#1E5631',
    borderColor: '#1E5631',
  },
  targetRoleBtnText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  targetRoleBtnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  allocFormBox: {
    backgroundColor: '#f9fbf9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e1',
    padding: 10,
    marginVertical: 10,
  },
  allocFormTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 8,
  },
  allocInputsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  addClassBtn: {
    backgroundColor: '#e1ebe1',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  addClassBtnText: {
    color: '#1E5631',
    fontSize: 12,
    fontWeight: 'bold',
  },
  allocBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  allocBadgeDelete: {
    backgroundColor: '#fff',
    borderColor: '#d32f2f',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  allocBadgeDeleteText: {
    fontSize: 11,
    color: '#d32f2f',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#f0f0f0',
  },
  modalCloseText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    backgroundColor: '#1E5631',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
