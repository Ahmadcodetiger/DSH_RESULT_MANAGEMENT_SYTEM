import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
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
  onSelectStudentGrading
}: TeacherDashboardProps) {
  const assigned = teacherUser.assignedClasses || [];

  const [selectedClassIdx, setSelectedClassIdx] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState('Second Term');
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const activeClass = assigned[selectedClassIdx];

  const fetchClassStudents = async () => {
    if (!activeClass) return;
    setLoading(true);
    try {
      const res = await api.get('/teacher/students', {
        params: {
          level: activeClass.level,
          section: activeClass.section,
          academicYear: selectedYear,
          term: selectedTerm
        }
      });
      setStudents(res.data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve students for this class.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassStudents();
  }, [selectedClassIdx, selectedTerm, selectedYear]);

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Teacher Portal</Text>
          <Text style={styles.headerSubtitle}>Logged in as: {teacherUser.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Class Selection Row */}
        <Text style={styles.selectorLabel}>Select Assigned Class:</Text>
        <View style={styles.badgeRow}>
          {assigned.map((cls: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[styles.classBadge, selectedClassIdx === idx && styles.classBadgeActive]}
              onPress={() => setSelectedClassIdx(idx)}
            >
              <Text style={[styles.classBadgeText, selectedClassIdx === idx && styles.classBadgeTextActive]}>
                Level {cls.level} - {cls.section}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Term & Year Selection Row */}
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
                  <Text style={[styles.termBtnText, selectedTerm === t && styles.termBtnTextActive]}>
                    {t.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ width: 100 }}>
            <Text style={styles.selectorLabel}>Year:</Text>
            <TouchableOpacity style={styles.yearBox} onPress={() => {
              // Rotate between academic years for simplicity
              setSelectedYear(selectedYear === '2025/2026' ? '2026/2027' : '2025/2026');
            }}>
              <Text style={styles.yearBoxText}>{selectedYear}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Students list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Class List: Level {activeClass?.level || '-'} ({activeClass?.section || '-'})
          </Text>
          <TouchableOpacity onPress={fetchClassStudents}>
            <Text style={styles.refreshText}>Reload</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 30 }} />
        ) : !activeClass ? (
          <Text style={styles.emptyText}>You do not have any assigned classes. Please contact the administrator.</Text>
        ) : students.length === 0 ? (
          <Text style={styles.emptyText}>No students uploaded to this class.</Text>
        ) : (
          <View style={styles.studentsListWrapper}>
            {students.map((student) => (
              <TouchableOpacity
                key={student._id}
                style={styles.studentItem}
                onPress={() => onSelectStudentGrading(student, selectedTerm, selectedYear)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentNumber}>{student.admissionNumber}</Text>
                </View>
                
                {/* Grading status indicator */}
                {student.hasResult ? (
                  <View style={[styles.statusBadge, styles.statusGraded]}>
                    <Text style={styles.statusTextGraded}>Graded ✓</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusPending]}>
                    <Text style={styles.statusTextPending}>Pending</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  selectorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  classBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classBadgeActive: {
    backgroundColor: '#1E5631',
    borderColor: '#1E5631',
  },
  classBadgeText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  classBadgeTextActive: {
    color: '#fff',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  termRow: {
    flexDirection: 'row',
    backgroundColor: '#e8ebe8',
    borderRadius: 8,
    padding: 3,
  },
  termBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  termBtnActive: {
    backgroundColor: '#fff',
    elevation: 1,
  },
  termBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  termBtnTextActive: {
    color: '#1E5631',
  },
  yearBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  yearBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e1',
    paddingBottom: 6,
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
    marginVertical: 20,
  },
  studentsListWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
    overflow: 'hidden',
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  studentNumber: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusGraded: {
    backgroundColor: '#e8f5e9',
  },
  statusPending: {
    backgroundColor: '#ffebee',
  },
  statusTextGraded: {
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextPending: {
    color: '#c62828',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
