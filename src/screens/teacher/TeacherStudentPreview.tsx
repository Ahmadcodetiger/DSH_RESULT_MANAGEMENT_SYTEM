import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api, { getAuthToken } from '../../services/api';

interface TeacherStudentPreviewProps {
  student: any;
  term: string;
  academicYear: string;
  goBack: () => void;
  onEdit: () => void;
}

export default function TeacherStudentPreview({
  student,
  term,
  academicYear,
  goBack,
  onEdit
}: TeacherStudentPreviewProps) {
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await api.get(`/grading/student/${student._id}`);
        const match = res.data.find(
          (r: any) => r.term === term && r.academicYear === academicYear
        );
        setResult(match || null);
      } catch (err: any) {
        Alert.alert('Error', 'Could not load student result details.');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [student._id, term, academicYear]);

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const token = getAuthToken();
      const pdfUrl = `${api.defaults.baseURL}/results/${result._id}/pdf`;
      const filename = `Report_${student.admissionNumber.replace(/\//g, '_')}_${term.replace(/ /g, '_')}.pdf`;
      const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Download Report Sheet: ${student.name}`,
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
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>✕ Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{student.name}</Text>
          <Text style={styles.headerSubtitle}>
            Level {student.level} | {term} ({academicYear})
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#1E5631" size="large" style={{ marginVertical: 40 }} />
        ) : result ? (
          <View style={styles.reportSheetCard}>
            <View style={styles.outerBorder}>
              <View style={styles.innerBorder}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitleAr}>أكاديمية دار صغار الحفاظ</Text>
                  <Text style={styles.sheetTitleEn}>HOME OF YOUNG HUFFAZ ACADEMY</Text>
                  <Text style={styles.sheetSub}>ISLAMIC/TAHFEEZH (DUAL CURRICULUM)</Text>
                </View>

                <View style={styles.termHeader}>
                  <Text style={styles.termHeaderText}>{result.term} Result Sheet</Text>
                  <View style={styles.averageBadge}>
                    <Text style={styles.averageBadgeLabel}>AVG</Text>
                    <Text style={styles.averageBadgeVal}>{result.finalAverage}%</Text>
                  </View>
                </View>

                {/* Tahfeezh Subjects Preview Table */}
                <Text style={styles.sectionTitle}>TAHFEEZH (ISLAMIC STUDIES) / قسم التحفيظ (الدراسات الإسلامية)</Text>
                <View style={[styles.tableBox, { marginBottom: 15 }]}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCol, { flex: 2, textAlign: 'left' }]}>Subject</Text>
                    <Text style={[styles.tableCol, { flex: 0.8 }]}>Total</Text>
                    <Text style={[styles.tableCol, { flex: 0.8 }]}>Grade</Text>
                  </View>
                  
                  {result.subjects.map((sub: any, idx: number) => {
                    const isTahfeezh = sub.section === 'tahfeezh' || ["Al-Qur'an Karem (Hifz)", "Al-Qur'an (Writing)", "Arabic", "Grammar VERBAL", "Islamic Subjects"].includes(sub.subjectName);
                    if (!sub.isGraded || !isTahfeezh) return null;
                    return (
                      <View key={`tahfeezh-${idx}`} style={styles.tableRow}>
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

                {/* Academic Subjects Preview Table */}
                <Text style={styles.sectionTitle}>ACADEMICS / المواد الأكاديمية</Text>
                <View style={styles.tableBox}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCol, { flex: 2, textAlign: 'left' }]}>Subject</Text>
                    <Text style={[styles.tableCol, { flex: 0.8 }]}>Total</Text>
                    <Text style={[styles.tableCol, { flex: 0.8 }]}>Grade</Text>
                  </View>
                  
                  {result.subjects.map((sub: any, idx: number) => {
                    const isTahfeezh = sub.section === 'tahfeezh' || ["Al-Qur'an Karem (Hifz)", "Al-Qur'an (Writing)", "Arabic", "Grammar VERBAL", "Islamic Subjects"].includes(sub.subjectName);
                    if (!sub.isGraded || isTahfeezh) return null;
                    return (
                      <View key={`acad-${idx}`} style={styles.tableRow}>
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

                {/* Tahfeezh Details */}
                <Text style={[styles.sectionTitle, { marginTop: 15 }]}>TAHFEEZH / حفظ القرآن</Text>
                <View style={styles.tahfeezhBox}>
                  <View style={styles.tahfeezhItem}>
                    <Text style={styles.tahfeezhLabel}>From Surah / من سورة</Text>
                    <Text style={styles.tahfeezhVal}>{result.tahfeezhDetails?.fromSurah || '-'}</Text>
                  </View>
                  <View style={styles.tahfeezhItem}>
                    <Text style={styles.tahfeezhLabel}>To Surah / إلى سورة</Text>
                    <Text style={styles.tahfeezhVal}>{result.tahfeezhDetails?.toSurah || '-'}</Text>
                  </View>
                  <View style={styles.tahfeezhItem}>
                    <Text style={styles.tahfeezhLabel}>Missed Sessions / غياب التسميع</Text>
                    <Text style={styles.tahfeezhVal}>{result.tahfeezhDetails?.absenceOfHifz || '0'}</Text>
                  </View>
                </View>

                {/* Remarks/Recommendations */}
                <Text style={[styles.sectionTitle, { marginTop: 15 }]}>REMARKS / الملاحظات والتوصيات</Text>
                <View style={styles.remarksBox}>
                  <Text style={styles.remarkText}>
                    • <Text style={{ fontWeight: 'bold' }}>Teacher:</Text>{' '}
                    {result.teacherRecommendations || '-'}
                  </Text>
                  {result.supervisorRecommendations ? (
                    <Text style={styles.remarkText}>
                      • <Text style={{ fontWeight: 'bold' }}>Supervisor:</Text>{' '}
                      {result.supervisorRecommendations}
                    </Text>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
                    <Text style={styles.editBtnText}>Edit Result</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.pdfBtn}
                    onPress={handleDownloadPdf}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.pdfBtnText}>Download PDF</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Result Found</Text>
            <Text style={styles.emptyDesc}>
              There is no graded result for this term yet.
            </Text>
            <TouchableOpacity style={[styles.editBtn, { marginTop: 20, width: '100%' }]} onPress={onEdit}>
              <Text style={styles.editBtnText}>Start Grading</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f4',
  },
  header: {
    backgroundColor: '#1E5631',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  backBtn: {
    marginRight: 15,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.25,
  },
  headerSubtitle: {
    color: '#b3d1b3',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  reportSheetCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    elevation: 4,
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e2ebe2',
  },
  outerBorder: {
    borderWidth: 1.5,
    borderColor: '#1E5631',
    borderRadius: 12,
    padding: 3,
  },
  innerBorder: {
    borderWidth: 3,
    borderColor: '#1E5631',
    borderRadius: 10,
    padding: 10,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E5631',
    paddingBottom: 10,
    marginBottom: 12,
  },
  sheetTitleAr: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E5631',
    letterSpacing: 0.5,
  },
  sheetTitleEn: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
    letterSpacing: 0.25,
  },
  sheetSub: {
    fontSize: 9,
    color: '#666',
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E5631',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  termHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.25,
  },
  averageBadge: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  averageBadgeLabel: {
    fontSize: 7,
    color: '#fff',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  averageBadgeVal: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E5631',
    borderBottomWidth: 1.5,
    borderBottomColor: '#eee',
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: '#e2ebe2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
    alignItems: 'center',
  },
  tableHeaderRow: {
    backgroundColor: '#f5faf5',
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
    backgroundColor: '#fafcfa',
    borderWidth: 1,
    borderColor: '#e2ebe2',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  tahfeezhLabel: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  tahfeezhVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  remarksBox: {
    backgroundColor: '#fdfcf9',
    borderWidth: 1,
    borderColor: '#f5efe3',
    borderRadius: 8,
    padding: 10,
  },
  remarkText: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
    marginVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#d4af37',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  pdfBtn: {
    flex: 1,
    backgroundColor: '#1E5631',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pdfBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2ebe2',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
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
    paddingHorizontal: 10,
  }
});
