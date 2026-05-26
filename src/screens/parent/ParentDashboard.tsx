import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api, { getAuthToken } from '../../services/api';

interface ParentDashboardProps {
  studentUser: any;
  onLogout: () => void;
}

export default function ParentDashboard({ studentUser, onLogout }: ParentDashboardProps) {
  const [selectedTerm, setSelectedTerm] = useState('Second Term');
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  
  const [results, setResults] = useState<any[]>([]);
  const [activeResult, setActiveResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.get('/parent/results');
      setResults(res.data.results || []);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load student result lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Update active result when selected term/year changes or results list reloads
  useEffect(() => {
    const match = results.find(
      (r) => r.term === selectedTerm && r.academicYear === selectedYear
    );
    setActiveResult(match || null);
  }, [results, selectedTerm, selectedYear]);

  const handleDownloadPdf = async () => {
    if (!activeResult) return;
    setDownloading(true);
    try {
      const token = getAuthToken();
      // Hits the server-side PDF generator route
      const pdfUrl = `${api.defaults.baseURL}/results/${activeResult._id}/pdf`;
      const filename = `Report_${studentUser.admissionNumber.replace('/', '_')}_${selectedTerm.replace(' ', '_')}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Download Report Sheet: ${studentUser.name}`,
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Download Complete', 'PDF saved to app files.');
        }
      } else {
        throw new Error('Download failed with status ' + downloadResult.status);
      }
    } catch (err: any) {
      Alert.alert('Download Error', 'Could not compile or download report card PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parent Portal</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{studentUser.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Child Profile Card */}
        <View style={styles.profileCard}>
          <Text style={styles.profileHeader}>STUDENT DETAIL / تفاصيل الطالب</Text>
          <View style={styles.profileRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileLabel}>Admission No:</Text>
              <Text style={styles.profileVal}>{studentUser.admissionNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileLabel}>Class & Section:</Text>
              <Text style={styles.profileVal}>Level {studentUser.level} - {studentUser.section}</Text>
            </View>
          </View>
        </View>

        {/* Term & Year Selection Row */}
        <View style={styles.filtersContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.selectorLabel}>Select Term:</Text>
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
            <Text style={styles.selectorLabel}>Academic Year:</Text>
            <TouchableOpacity style={styles.yearBox} onPress={() => {
              setSelectedYear(selectedYear === '2025/2026' ? '2026/2027' : '2025/2026');
            }}>
              <Text style={styles.yearBoxText}>{selectedYear}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 40 }} />
        ) : activeResult ? (
          /* Report Sheet Visual Preview */
          <View style={styles.reportSheetCard}>
            <View style={styles.doubleBorder}>
              
              {/* Header inside Preview */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitleAr}>أكاديمية دار صغار الحفاظ</Text>
                <Text style={styles.sheetTitleEn}>HOME OF YOUNG HUFFAZ ACADEMY</Text>
                <Text style={styles.sheetSub}>ISLAMIC/TAHFEEZH (DUAL CURRICULUM)</Text>
              </View>

              {/* Term Header */}
              <View style={styles.termHeader}>
                <Text style={styles.termHeaderText}>{activeResult.term} Result Sheet</Text>
                <View style={styles.averageBadge}>
                  <Text style={styles.averageBadgeLabel}>AVG</Text>
                  <Text style={styles.averageBadgeVal}>{activeResult.finalAverage}%</Text>
                </View>
              </View>

              {/* Subject Grades Preview Table */}
              <Text style={styles.sectionTitle}>ACADEMICS / المواد الأكاديمية</Text>
              <View style={styles.tableBox}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text style={[styles.tableCol, { flex: 2, textAlign: 'left' }]}>Subject</Text>
                  <Text style={[styles.tableCol, { flex: 0.8 }]}>Total</Text>
                  <Text style={[styles.tableCol, { flex: 0.8 }]}>Grade</Text>
                </View>
                
                {activeResult.subjects.map((sub: any, idx: number) => {
                  if (!sub.isGraded) return null;
                  return (
                    <View key={idx} style={styles.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.subjectNameText}>{sub.subjectName}</Text>
                        <Text style={styles.subjectNameArText}>{sub.subjectNameArabic}</Text>
                      </View>
                      <Text style={[styles.tableCol, { flex: 0.8, fontWeight: 'bold' }]}>
                        {sub.score100}
                      </Text>
                      <Text style={[styles.tableCol, { flex: 0.8, fontWeight: 'bold', color: '#1E5631' }]}>
                        {sub.grade}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Tahfeezh Section */}
              <Text style={[styles.sectionTitle, { marginTop: 15 }]}>TAHFEEZH / حفظ القرآن</Text>
              <View style={styles.tahfeezhBox}>
                <View style={styles.tahfeezhItem}>
                  <Text style={styles.tahfeezhLabel}>From Surah / من سورة</Text>
                  <Text style={styles.tahfeezhVal}>{activeResult.tahfeezhDetails.fromSurah || '-'}</Text>
                </View>
                <View style={styles.tahfeezhItem}>
                  <Text style={styles.tahfeezhLabel}>To Surah / إلى سورة</Text>
                  <Text style={styles.tahfeezhVal}>{activeResult.tahfeezhDetails.toSurah || '-'}</Text>
                </View>
                <View style={styles.tahfeezhItem}>
                  <Text style={styles.tahfeezhLabel}>Missed Sessions / غياب التسميع</Text>
                  <Text style={styles.tahfeezhVal}>{activeResult.tahfeezhDetails.absenceOfHifz || '0'}</Text>
                </View>
              </View>

              {/* Remarks/Recommendations */}
              <Text style={[styles.sectionTitle, { marginTop: 15 }]}>REMARKS / الملاحظات والتوصيات</Text>
              <View style={styles.remarksBox}>
                <Text style={styles.remarkText}>
                  • <Text style={{ fontWeight: 'bold' }}>Teacher:</Text>{' '}
                  {activeResult.teacherRecommendations || 'Disciplined student. Keep it up.'}
                </Text>
                {activeResult.supervisorRecommendations ? (
                  <Text style={styles.remarkText}>
                    • <Text style={{ fontWeight: 'bold' }}>Supervisor:</Text>{' '}
                    {activeResult.supervisorRecommendations}
                  </Text>
                ) : null}
              </View>

              {/* PDF download trigger */}
              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={handleDownloadPdf}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.pdfBtnText}>Download PDF Report Sheet</Text>
                )}
              </TouchableOpacity>

            </View>
          </View>
        ) : (
          /* Empty view */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Result Card Pending</Text>
            <Text style={styles.emptyDesc}>
              The report sheet for {selectedTerm} is not ready yet. Please check back later or contact your class teacher.
            </Text>
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
    fontSize: 13,
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
    padding: 15,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#d4af37', // Gold tag
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
    paddingBottom: 6,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
  },
  profileLabel: {
    fontSize: 11,
    color: '#888',
  },
  profileVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
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
  reportSheetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 3,
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 30,
  },
  doubleBorder: {
    borderWidth: 3,
    borderColor: '#1E5631',
    borderStyle: 'double',
    padding: 10,
    borderRadius: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E5631',
    paddingBottom: 8,
    marginBottom: 10,
  },
  sheetTitleAr: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  sheetTitleEn: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  sheetSub: {
    fontSize: 8,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 1,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E5631',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  termHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  averageBadge: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  averageBadgeLabel: {
    fontSize: 7,
    color: '#fff',
    fontWeight: 'bold',
  },
  averageBadgeVal: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E5631',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 3,
    marginBottom: 6,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: '#f9fcf9',
  },
  tableCol: {
    textAlign: 'center',
    fontSize: 11,
    color: '#444',
  },
  subjectNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  subjectNameArText: {
    fontSize: 10,
    color: '#777',
    marginTop: 1,
  },
  tahfeezhBox: {
    flexDirection: 'row',
    gap: 8,
  },
  tahfeezhItem: {
    flex: 1,
    backgroundColor: '#f9faf9',
    borderWidth: 1,
    borderColor: '#e1e5e1',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  tahfeezhLabel: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  tahfeezhVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  remarksBox: {
    backgroundColor: '#fdfbf7',
    borderWidth: 1,
    borderColor: '#f5efe3',
    borderRadius: 6,
    padding: 8,
  },
  remarkText: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
    marginVertical: 2,
  },
  pdfBtn: {
    backgroundColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  pdfBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e6e2',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});
