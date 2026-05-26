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
  FlatList
} from 'react-native';
import api from '../../services/api';

interface AdminDashboardProps {
  onLogout: () => void;
  navigateToBulkUpload: () => void;
}

export default function AdminDashboard({ onLogout, navigateToBulkUpload }: AdminDashboardProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Modals and form state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // Assigned classes inputs for new teacher
  const [tempLevel, setTempLevel] = useState('');
  const [tempSection, setTempSection] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<Array<{ level: string; section: string }>>([]);

  const [savingTeacher, setSavingTeacher] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch functions
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

  useEffect(() => {
    fetchTeachers();
    fetchStudents();
  }, []);

  const handleAddClass = () => {
    if (!tempLevel || !tempSection) {
      Alert.alert('Validation', 'Please fill in both Level and Section');
      return;
    }
    // Prevent duplicates
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

  const handleCreateTeacher = async () => {
    if (!teacherName || !teacherUsername || !teacherPassword) {
      setErrorMessage('Please fill in all required fields');
      return;
    }
    setErrorMessage('');
    setSavingTeacher(true);
    try {
      await api.post('/admin/teachers', {
        name: teacherName,
        username: teacherUsername,
        password: teacherPassword,
        assignedClasses
      });
      
      Alert.alert('Success', 'Teacher account created successfully');
      
      // Reset form
      setTeacherName('');
      setTeacherUsername('');
      setTeacherPassword('');
      setAssignedClasses([]);
      setIsTeacherModalOpen(false);
      
      fetchTeachers();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error creating teacher');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/teachers/${id}`);
              Alert.alert('Deleted', 'Teacher removed.');
              fetchTeachers();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete teacher');
            }
          }
        }
      ]
    );
  };

  const handleDeleteStudent = (id: string, name: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete student ${name}? This will permanently delete all related result sheets.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/students/${id}`);
              Alert.alert('Deleted', 'Student and reports removed.');
              fetchStudents();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete student');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Control Center</Text>
          <Text style={styles.headerSubtitle}>Home of Young Huffaz Academy</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{teachers.length}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#d4af37' }]}>
            <Text style={[styles.statVal, { color: '#d4af37' }]}>{students.length}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setIsTeacherModalOpen(true)}>
            <Text style={styles.actionBtnText}>+ Add Teacher</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.bulkBtn]} onPress={navigateToBulkUpload}>
            <Text style={styles.actionBtnText}>Bulk Student Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Teachers List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Teachers & Class Allocations</Text>
          <TouchableOpacity onPress={fetchTeachers}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingTeachers ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 20 }} />
        ) : teachers.length === 0 ? (
          <Text style={styles.emptyText}>No teachers found. Click '+ Add Teacher' to add.</Text>
        ) : (
          teachers.map((teacher) => (
            <View key={teacher._id} style={styles.listCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.teacherNameText}>{teacher.name}</Text>
                  <Text style={styles.teacherUsernameText}>@{teacher.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteIcon}
                  onPress={() => handleDeleteTeacher(teacher._id, teacher.name)}
                >
                  <Text style={styles.deleteIconText}>✕</Text>
                </TouchableOpacity>
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

        {/* Students List Section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Active Students</Text>
          <TouchableOpacity onPress={fetchStudents}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingStudents ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 20 }} />
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
                <TouchableOpacity
                  style={styles.studentDeleteBtn}
                  onPress={() => handleDeleteStudent(student._id, student.name)}
                >
                  <Text style={styles.studentDeleteBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Teacher Modal */}
      <Modal visible={isTeacherModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Teacher Account</Text>

            {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

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

              <Text style={styles.inputLabel}>Password</Text>
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
                onPress={handleCreateTeacher}
                disabled={savingTeacher}
              >
                {savingTeacher ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Create Account</Text>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#b3d1b3',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsBox: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 8,
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
  refreshText: {
    color: '#1E5631',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 15,
  },
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
  deleteIcon: {
    padding: 5,
  },
  deleteIconText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: 'bold',
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
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E5631',
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
    marginBottom: 12,
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
