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
                    <Text style={styles.tahfeezhLabel}>From Surah</Text>
                    <Text style={styles.tahfeezhVal}>{result.tahfeezhDetails?.fromSurah || '-'}</Text>
                  </View>
                  <View style={styles.tahfeezhItem}>
                    <Text style={styles.tahfeezhLabel}>To Surah</Text>
                    <Text style={styles.tahfeezhVal}>{result.tahfeezhDetails?.toSurah || '-'}</Text>
                  </View>
                  <View style={styles.tahfeezhItem}>
                    <Text style={styles.tahfeezhLabel}>Missed Hifz</Text>
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
            <TouchableOpacity style={styles.editBtn} onPress={onEdit} style={{ marginTop: 20, width: '100%' }}>
              <Text style={styles.editBtnText}>Start Grading</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f5' },
  header: {
    backgroundColor: '#1E5631',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#b3d1b3', fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 15 },
  reportSheetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    elevation: 3,
    marginBottom: 30,
  },
  outerBorder: { borderWidth: 1, borderColor: '#1E5631', borderRadius: 8, padding: 2 },
  innerBorder: { borderWidth: 2, borderColor: '#1E5631', borderRadius: 6, padding: 8 },
  sheetHeader: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E5631', paddingBottom: 8, marginBottom: 10 },
  sheetTitleAr: { fontSize: 16, fontWeight: 'bold', color: '#1E5631' },
  sheetTitleEn: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 2 },
  sheetSub: { fontSize: 8, color: '#666', fontWeight: 'bold', marginTop: 1 },
  termHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E5631', padding: 8, borderRadius: 4, marginBottom: 10 },
  termHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  averageBadge: { backgroundColor: '#d4af37', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignItems: 'center' },
  averageBadgeLabel: { fontSize: 7, color: '#fff', fontWeight: 'bold' },
  averageBadgeVal: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1E5631', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 3, marginBottom: 6 },
  tableBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  tableHeaderRow: { backgroundColor: '#f9fcf9' },
  tableCol: { textAlign: 'center', fontSize: 11, color: '#444' },
  subjectNameText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  subjectNameArText: { fontSize: 10, color: '#777', marginTop: 1 },
  tahfeezhBox: { flexDirection: 'row', gap: 8 },
  tahfeezhItem: { flex: 1, backgroundColor: '#f9faf9', borderWidth: 1, borderColor: '#e1e5e1', borderRadius: 6, padding: 8, alignItems: 'center' },
  tahfeezhLabel: { fontSize: 8, color: '#666', textAlign: 'center', marginBottom: 4 },
  tahfeezhVal: { fontSize: 12, fontWeight: 'bold', color: '#1E5631' },
  remarksBox: { backgroundColor: '#fdfbf7', borderWidth: 1, borderColor: '#f5efe3', borderRadius: 6, padding: 8 },
  remarkText: { fontSize: 11, color: '#555', lineHeight: 16, marginVertical: 2 },
  actionsRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  editBtn: { flex: 1, backgroundColor: '#d4af37', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  pdfBtn: { flex: 1, backgroundColor: '#1E5631', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  pdfBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e6e2', marginTop: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 }
});
