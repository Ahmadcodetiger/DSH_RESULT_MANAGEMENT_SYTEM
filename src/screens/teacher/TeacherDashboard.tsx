import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Image,
  Platform,
} from 'react-native';
import api from '../../services/api';

interface TeacherDashboardProps {
  teacherUser: any;
  onLogout: () => void;
  onSelectStudentGrading: (student: any, term: string, academicYear: string) => void;
}

export default function TeacherDashboard({
  teacherUser,
  onLogout,
  onSelectStudentGrading,
}: TeacherDashboardProps) {
  const assigned = teacherUser.assignedClasses || [];

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState('Second Term');
  const [selectedYear, setSelectedYear] = useState('2025/2026');

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellAnim = useRef(new Animated.Value(0)).current;

  // Result management
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeClass = assigned[selectedClassIdx];

  // ── Fetch students ─────────────────────────────────────────────
  const fetchClassStudents = async () => {
    if (!activeClass) return;
    setLoading(true);
    try {
      const res = await api.get('/teacher/students', {
        params: {
          level: activeClass.level,
          section: activeClass.section,
          academicYear: selectedYear,
          term: selectedTerm,
        },
      });
      setStudents(res.data);
    } catch (err: any) {
      console.error('[TeacherDashboard] fetch students error:', err.message);
      Alert.alert('Error', 'Failed to retrieve students for this class.');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch notifications ────────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const data: any[] = res.data || [];
      setNotifications(data);
      setUnreadCount(data.length);

      if (data.length > 0) {
        // Ring the bell
        Animated.sequence([
          Animated.timing(bellAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      }
    } catch (err: any) {
      console.error('[TeacherDashboard] fetch notifications error:', err.message);
    }
  };

  // ── Fetch student results for result management modal ──────────
  const fetchStudentResults = async (student: any) => {
    setLoadingResults(true);
    setStudentResults([]);
    try {
      const res = await api.get(`/grading/student/${student._id}`);
      setStudentResults(res.data || []);
    } catch (err: any) {
      console.error('[TeacherDashboard] fetch student results error:', err.message);
      Alert.alert('Error', 'Could not load results for this student.');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleOpenResultManager = (student: any) => {
    setSelectedStudent(student);
    fetchStudentResults(student);
    setResultModalVisible(true);
  };

  const handleDeleteResult = async (resultId: string) => {
    Alert.alert(
      'Delete Result',
      'Are you sure you want to delete this result record? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(resultId);
            try {
              await api.delete(`/admin/results/${resultId}`);
              setStudentResults((prev) => prev.filter((r) => r._id !== resultId));
              // Refresh student list to update grading badges
              fetchClassStudents();
              Alert.alert('Deleted', 'Result record has been deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete result.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleEditResult = (result: any) => {
    if (!selectedStudent) return;
    setResultModalVisible(false);
    onSelectStudentGrading(selectedStudent, result.term, result.academicYear);
  };

  useEffect(() => {
    fetchClassStudents();
  }, [selectedClassIdx, selectedTerm, selectedYear]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for real-time-like behaviour
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/images/dsh_logo.png')}
          style={styles.headerLogo}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Teacher Portal</Text>
          <Text style={styles.headerSubtitle}>Welcome, {teacherUser.name}</Text>
        </View>

        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => {
            setNotifModalVisible(true);
            setUnreadCount(0);
          }}
          activeOpacity={0.7}
        >
          <Animated.Text
            style={[styles.bellIcon, { transform: [{ rotate: bellRotate }] }]}
          >
            🔔
          </Animated.Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Class Selector ── */}
        <Text style={styles.selectorLabel}>Select Assigned Class:</Text>
        {assigned.length === 0 ? (
          <View style={styles.noClassCard}>
            <Text style={styles.noClassText}>
              No classes assigned. Contact the administrator.
            </Text>
          </View>
        ) : (
          <View style={styles.badgeRow}>
            {assigned.map((cls: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.classBadge,
                  selectedClassIdx === idx && styles.classBadgeActive,
                ]}
                onPress={() => setSelectedClassIdx(idx)}
              >
                <Text
                  style={[
                    styles.classBadgeText,
                    selectedClassIdx === idx && styles.classBadgeTextActive,
                  ]}
                >
                  Level {cls.level} – {cls.section}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Term & Year Filters ── */}
        <View style={styles.filtersContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.selectorLabel}>Term:</Text>
            <View style={styles.termRow}>
              {['First Term', 'Second Term', 'Third Term'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.termBtn, selectedTerm === t && styles.termBtnActive]}
                  onPress={() => setSelectedTerm(t)}
                >
                  <Text
                    style={[
                      styles.termBtnText,
                      selectedTerm === t && styles.termBtnTextActive,
                    ]}
                  >
                    {t.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ width: 110 }}>
            <Text style={styles.selectorLabel}>Year:</Text>
            <TouchableOpacity
              style={styles.yearBox}
              onPress={() =>
                setSelectedYear(
                  selectedYear === '2025/2026' ? '2026/2027' : '2025/2026'
                )
              }
            >
              <Text style={styles.yearBoxText}>{selectedYear}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Students List ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            📋 Class List: Level {activeClass?.level || '–'} ({activeClass?.section || '–'})
          </Text>
          <TouchableOpacity onPress={fetchClassStudents}>
            <Text style={styles.refreshText}>↺ Reload</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
        ) : !activeClass ? (
          <Text style={styles.emptyText}>No active class selected.</Text>
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>No students found for this class.</Text>
        ) : (
          <View style={styles.studentsListWrapper}>
            {students.map((student, idx) => (
              <View
                key={student._id}
                style={[
                  styles.studentItem,
                  idx === students.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentNumber}>{student.admissionNumber}</Text>
                </View>

                {/* Grading status badge */}
                {student.hasResult ? (
                  <View style={[styles.statusBadge, styles.statusGraded]}>
                    <Text style={styles.statusTextGraded}>Graded ✓</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusPending]}>
                    <Text style={styles.statusTextPending}>Pending</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.actionBtns}>
                  {/* Add / Edit result */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      onSelectStudentGrading(student, selectedTerm, selectedYear)
                    }
                  >
                    <Text style={styles.actionBtnText}>
                      {student.hasResult ? '✏️ Edit' : '➕ Grade'}
                    </Text>
                  </TouchableOpacity>

                  {/* Manage existing results */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.manageBtn]}
                    onPress={() => handleOpenResultManager(student)}
                  >
                    <Text style={styles.manageBtnText}>📂</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          NOTIFICATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={notifModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notifModal}>
            {/* Modal header */}
            <View style={styles.notifModalHeader}>
              <Text style={styles.notifModalTitle}>🔔 Notifications</Text>
              <TouchableOpacity
                style={styles.notifCloseBtn}
                onPress={() => setNotifModalVisible(false)}
              >
                <Text style={styles.notifCloseText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Text style={styles.emptyNotifIcon}>📭</Text>
                  <Text style={styles.emptyNotifText}>No notifications yet.</Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <View key={n._id} style={styles.notifCard}>
                    <View style={styles.notifCardTop}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <View style={styles.notifTagChip}>
                        <Text style={styles.notifTag}>{n.targetRole}</Text>
                      </View>
                    </View>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifMeta}>
                      From: {n.createdBy} · {formatDate(n.createdAt)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          RESULT MANAGEMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={resultModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultModal}>
            {/* Modal header */}
            <View style={styles.resultModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultModalTitle}>Result Records</Text>
                {selectedStudent && (
                  <Text style={styles.resultModalSubtitle}>
                    {selectedStudent.name} · {selectedStudent.admissionNumber}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.notifCloseBtn}
                onPress={() => setResultModalVisible(false)}
              >
                <Text style={styles.notifCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Add New button */}
            <TouchableOpacity
              style={styles.addResultBtn}
              onPress={() => {
                setResultModalVisible(false);
                if (selectedStudent)
                  onSelectStudentGrading(selectedStudent, selectedTerm, selectedYear);
              }}
            >
              <Text style={styles.addResultBtnText}>➕ Add / Edit Result for {selectedTerm}</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {loadingResults ? (
                <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
              ) : studentResults.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Text style={styles.emptyNotifIcon}>📋</Text>
                  <Text style={styles.emptyNotifText}>No results recorded yet.</Text>
                </View>
              ) : (
                studentResults.map((result) => (
                  <View key={result._id} style={styles.resultCard}>
                    <View style={styles.resultCardLeft}>
                      <Text style={styles.resultTerm}>{result.term}</Text>
                      <Text style={styles.resultYear}>{result.academicYear}</Text>
                      <View
                        style={[
                          styles.resultStatusChip,
                          result.status === 'approved'
                            ? styles.chipApproved
                            : styles.chipDraft,
                        ]}
                      >
                        <Text style={styles.resultStatusText}>
                          {result.status === 'approved' ? '✅ Approved' : '🕐 Draft'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.resultCardRight}>
                      <Text style={styles.resultAvg}>{result.finalAverage}%</Text>
                      <Text style={styles.resultGrade}>{result.generalGrade}</Text>
                    </View>

                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={styles.resultEditBtn}
                        onPress={() => handleEditResult(result)}
                      >
                        <Text style={styles.resultEditText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resultDeleteBtn}
                        onPress={() => handleDeleteResult(result._id)}
                        disabled={deletingId === result._id}
                      >
                        {deletingId === result._id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.resultDeleteText}>🗑 Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f5' },

  // ── Header ──
  header: {
    backgroundColor: '#1E5631',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#fff',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#b3d1b3', fontSize: 12, marginTop: 2 },

  // Bell
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 6,
  },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#e53935',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#1E5631',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // ── Scroll content ──
  scrollContent: { padding: 16 },

  selectorLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  noClassCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e53935',
  },
  noClassText: { color: '#888', fontSize: 13 },

  // class badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  classBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  classBadgeActive: { backgroundColor: '#1E5631', borderColor: '#1E5631' },
  classBadgeText: { fontSize: 13, color: '#444', fontWeight: '600' },
  classBadgeTextActive: { color: '#fff' },

  // filters
  filtersContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  termRow: {
    flexDirection: 'row',
    backgroundColor: '#e8ebe8',
    borderRadius: 8,
    padding: 3,
  },
  termBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  termBtnActive: { backgroundColor: '#fff', elevation: 1 },
  termBtnText: { fontSize: 12, color: '#666', fontWeight: '600' },
  termBtnTextActive: { color: '#1E5631' },
  yearBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  yearBoxText: { fontSize: 12, fontWeight: '700', color: '#333' },

  // section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e1',
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  refreshText: { color: '#1E5631', fontSize: 13, fontWeight: '700' },

  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 13,
  },

  // students
  studentsListWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
    overflow: 'hidden',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
    gap: 8,
  },
  studentName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  studentNumber: { fontSize: 11, color: '#777', marginTop: 2 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusGraded: { backgroundColor: '#e8f5e9' },
  statusPending: { backgroundColor: '#ffebee' },
  statusTextGraded: { color: '#2e7d32', fontSize: 10, fontWeight: 'bold' },
  statusTextPending: { color: '#c62828', fontSize: 10, fontWeight: 'bold' },

  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E5631',
    borderRadius: 7,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  manageBtn: { backgroundColor: '#e8f0fe' },
  manageBtnText: { fontSize: 14 },

  // ── Notification Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  notifModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 0,
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#1E5631',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  notifModalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  notifCloseBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  notifCloseText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  emptyNotif: { alignItems: 'center', paddingVertical: 40 },
  emptyNotifIcon: { fontSize: 44, marginBottom: 10 },
  emptyNotifText: { fontSize: 14, color: '#888' },

  notifCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f9fffe',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1E5631',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  notifCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  notifTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#1E5631' },
  notifTagChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  notifTag: { fontSize: 10, color: '#2e7d32', fontWeight: '700' },
  notifMessage: { fontSize: 13, color: '#444', lineHeight: 19, marginBottom: 6 },
  notifMeta: { fontSize: 10, color: '#999' },

  // ── Result Modal ──
  resultModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  resultModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#1E5631',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  resultModalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultModalSubtitle: { color: '#b3d1b3', fontSize: 11, marginTop: 2 },

  addResultBtn: {
    margin: 16,
    backgroundColor: '#1E5631',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addResultBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  resultCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f9fffe',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0ede0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultCardLeft: { flex: 1 },
  resultTerm: { fontSize: 13, fontWeight: 'bold', color: '#1E5631' },
  resultYear: { fontSize: 11, color: '#666', marginTop: 1 },
  resultStatusChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipApproved: { backgroundColor: '#e8f5e9' },
  chipDraft: { backgroundColor: '#fff3e0' },
  resultStatusText: { fontSize: 10, fontWeight: 'bold', color: '#555' },

  resultCardRight: { alignItems: 'center' },
  resultAvg: { fontSize: 18, fontWeight: 'bold', color: '#1E5631' },
  resultGrade: { fontSize: 12, color: '#555', fontWeight: '600' },

  resultActions: { gap: 6 },
  resultEditBtn: {
    backgroundColor: '#1E5631',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resultEditText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  resultDeleteBtn: {
    backgroundColor: '#e53935',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resultDeleteText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
