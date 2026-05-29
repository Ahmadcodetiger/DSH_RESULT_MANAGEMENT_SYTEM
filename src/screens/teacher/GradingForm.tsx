import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  FlatList,
  SafeAreaView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { SURAHS, Surah } from '../../utils/surahs';

interface GradingFormProps {
  student: any;
  term: string;
  academicYear: string;
  goBack: () => void;
}

interface SubjectState {
  subjectName: string;
  subjectNameArabic: string;
  score60: string;
  score20_1: string;
  score20_2: string;
  isGraded: boolean;
  section?: 'tahfeezh' | 'academic'; // New field for grouping
}

// Subject groups for organized display
const TAHFEEZH_SUBJECTS: SubjectState[] = [
  { subjectName: "Al-Qur'an Karem (Hifz)", subjectNameArabic: "القرآن الكريم ( حفظ )", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'tahfeezh' },
  { subjectName: "Al-Qur'an (Writing)", subjectNameArabic: "القرآن كتابة", score60: '', score20_1: '', score20_2: '', isGraded: false, section: 'tahfeezh' },
  { subjectName: "Arabic", subjectNameArabic: "العربية", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'tahfeezh' },
  { subjectName: "Grammar VERBAL", subjectNameArabic: "القواعد", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'tahfeezh' },
  { subjectName: "Islamic Subjects", subjectNameArabic: "المواد الإسلامية", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'tahfeezh' }
];

const ACADEMIC_SUBJECTS: SubjectState[] = [
  { subjectName: "Science", subjectNameArabic: "علوم", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'academic' },
  { subjectName: "Literacy", subjectNameArabic: "معرفة القراءة والكتابة", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'academic' },
  { subjectName: "Numeracy", subjectNameArabic: "الحساب", score60: '', score20_1: '', score20_2: '', isGraded: true, section: 'academic' },
  { subjectName: "Phonics", subjectNameArabic: "سماع الصوت", score60: '', score20_1: '', score20_2: '', isGraded: false, section: 'academic' },
  { subjectName: "Social Habits", subjectNameArabic: "العادات الاجتماعية", score60: '', score20_1: '', score20_2: '', isGraded: false, section: 'academic' }
];

const INITIAL_SUBJECTS: SubjectState[] = [...TAHFEEZH_SUBJECTS, ...ACADEMIC_SUBJECTS];

const EVALUATION_ELEMENTS_TEMPLATE = [
  { label: 'Correctness of recitation & Tajweed Practicing', labelAr: 'صحة التلاوة وتطبيق التجويد', rating: 'ممتاز جدا' },
  { label: 'Excellent Sound and Performance', labelAr: 'جودة الصوت والأداء المتميز', rating: 'ممتاز جدا' },
  { label: 'Emotional Stability & Honesty', labelAr: 'الاستقرار العاطفي والصدق والأمانة', rating: 'ممتاز جدا' },
  { label: 'Perseverance and Relationship with Students', labelAr: 'المثابرة والعلاقة مع الطلاب', rating: 'ممتاز جدا' },
  { label: 'Language Skills (Reading, Listening and Oral)', labelAr: 'المهارات اللغوية (مهارة القراءة والكتابة والاستماع والتعبير الشفهي)', rating: 'ممتاز' },
  { label: 'Group & School Activities', labelAr: 'الأنشطة الأسرية والمدرسية', rating: 'ممتاز' }
];

const RATINGS = ['ممتاز جدا', 'ممتاز', 'جيد جدا', 'مقبول', 'ضعيف'];

export default function GradingForm({ student, term, academicYear, goBack }: GradingFormProps) {
  const [step, setStep] = useState(1);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields State
  const [subjects, setSubjects] = useState<SubjectState[]>([]);
  
  const [absenceOfHifz, setAbsenceOfHifz] = useState('0');
  const [daysPresent, setDaysPresent] = useState('0');
  const [daysAbsent, setDaysAbsent] = useState('0');
  const [fromSurah, setFromSurah] = useState('');
  const [toSurah, setToSurah] = useState('');
  const [memorizedPages, setMemorizedPages] = useState('0');

  const [evalElements, setEvalElements] = useState(EVALUATION_ELEMENTS_TEMPLATE);
  
  const [supervisorRec, setSupervisorRec] = useState('');
  const [teacherRec, setTeacherRec] = useState('');
  const [headTeacherComments, setHeadTeacherComments] = useState('');
  const [nextTermBegins, setNextTermBegins] = useState('13-04-2026');
  const [dateIssued, setDateIssued] = useState('11-03-2026');

  // Surah Picker Modal State
  const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
  const [surahPickerTarget, setSurahPickerTarget] = useState<'FROM' | 'TO' | null>(null);

  // Fetch existing grades and dynamic subjects to edit if they exist
  useEffect(() => {
    const fetchExistingAndSubjects = async () => {
      setLoadingExisting(true);
      try {
        // 1. Load active subjects list from AsyncStorage
        let activeSubjectsList = [...INITIAL_SUBJECTS];
        const storedSubjects = await AsyncStorage.getItem('huffaz_subjects');
        if (storedSubjects) {
          const parsed = JSON.parse(storedSubjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Map raw stored subjects to include score fields
            activeSubjectsList = parsed.map((s: any) => ({
              subjectName: s.subjectName,
              subjectNameArabic: s.subjectNameArabic,
              score60: '',
              score20_1: '',
              score20_2: '',
              isGraded: s.isGraded !== undefined ? s.isGraded : true,
              section: s.section || 'academic'
            }));
          }
        }

        // 2. Fetch existing results from API
        const res = await api.get(`/grading/student/${student._id}`);
        // Find result matching the exact term and year
        const match = res.data.find(
          (r: any) => r.term === term && r.academicYear === academicYear
        );

        if (match) {
          // Pre-populate active subjects list with matching previous scores
          const populatedSubjects = activeSubjectsList.map((initSub) => {
            const foundSub = match.subjects.find((s: any) => s.subjectName === initSub.subjectName);
            if (foundSub) {
              return {
                subjectName: foundSub.subjectName,
                subjectNameArabic: foundSub.subjectNameArabic,
                score60: foundSub.isGraded ? foundSub.score60.toString() : '',
                score20_1: foundSub.isGraded ? foundSub.score20_1.toString() : '',
                score20_2: foundSub.isGraded ? foundSub.score20_2.toString() : '',
                isGraded: foundSub.isGraded,
                section: initSub.section
              };
            }
            return initSub;
          });

          setSubjects(populatedSubjects);
          
          if (match.tahfeezhDetails) {
            setAbsenceOfHifz((match.tahfeezhDetails.absenceOfHifz || 0).toString());
            setDaysPresent((match.tahfeezhDetails.daysPresent || 0).toString());
            setDaysAbsent((match.tahfeezhDetails.daysAbsent || 0).toString());
            setFromSurah(match.tahfeezhDetails.fromSurah || '');
            setToSurah(match.tahfeezhDetails.toSurah || '');
            setMemorizedPages((match.tahfeezhDetails.memorizedPages || 0).toString());
          }

          if (match.evaluationElements && match.evaluationElements.length > 0) {
            const populatedEvals = match.evaluationElements.map((e: any) => ({
              label: e.elementLabel,
              labelAr: e.elementLabelArabic,
              rating: e.rating
            }));
            setEvalElements(populatedEvals);
          }

          setSupervisorRec(match.supervisorRecommendations || '');
          setTeacherRec(match.teacherRecommendations || '');
          setHeadTeacherComments(match.headTeacherComments || '');
          setNextTermBegins(match.nextTermBegins || '');
          setDateIssued(match.dateIssued || '');
        } else {
          // No match, use clean active subjects list
          setSubjects(activeSubjectsList);
        }
      } catch (err: any) {
        console.log('Error checking existing results / loading subjects:', err.message);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExistingAndSubjects();
  }, [student._id, term, academicYear]);

  // Real-time calculation helpers
  const handleScoreChange = (index: number, field: 'score60' | 'score20_1' | 'score20_2', value: string) => {
    // Numeric sanitization
    const cleaned = value.replace(/[^0-9]/g, '');
    const updated = [...subjects];
    updated[index][field] = cleaned;
    setSubjects(updated);
  };

  const toggleSubjectGrading = (index: number) => {
    const updated = [...subjects];
    updated[index].isGraded = !updated[index].isGraded;
    if (!updated[index].isGraded) {
      updated[index].score60 = '';
      updated[index].score20_1 = '';
      updated[index].score20_2 = '';
    }
    setSubjects(updated);
  };

  const getSubjectTotalAndGrade = (sub: SubjectState) => {
    if (!sub.isGraded) return { total: '-', grade: '-' };
    const s60 = Math.min(60, Math.max(0, Number(sub.score60) || 0));
    const s20_1 = Math.min(20, Math.max(0, Number(sub.score20_1) || 0));
    const s20_2 = Math.min(20, Math.max(0, Number(sub.score20_2) || 0));
    const total = s60 + s20_1 + s20_2;
    
    // Auto letter grade
    let grade = 'F';
    if (total >= 80) grade = 'A';
    else if (total >= 70) grade = 'B';
    else if (total >= 60) grade = 'C';
    else if (total >= 50) grade = 'D';

    return { total, grade };
  };

  const handleOpenSurahPicker = (target: 'FROM' | 'TO') => {
    setSurahPickerTarget(target);
    setIsSurahModalOpen(true);
  };

  const handleSelectSurah = (surahName: string) => {
    if (surahPickerTarget === 'FROM') {
      setFromSurah(surahName);
    } else if (surahPickerTarget === 'TO') {
      setToSurah(surahName);
    }
    setIsSurahModalOpen(false);
    setSurahPickerTarget(null);
  };

  const handleEvaluationRatingChange = (idx: number, rating: string) => {
    const updated = [...evalElements];
    updated[idx].rating = rating;
    setEvalElements(updated);
  };

  const submitGrades = async () => {
    setSubmitting(true);
    try {
      // Map subjects back to model inputs
      const subjectInputs = subjects.map((s) => ({
        subjectName: s.subjectName,
        subjectNameArabic: s.subjectNameArabic,
        score60: Number(s.score60) || 0,
        score20_1: Number(s.score20_1) || 0,
        score20_2: Number(s.score20_2) || 0,
        isGraded: s.isGraded
      }));

      const payload = {
        studentId: student._id,
        academicYear,
        term,
        subjects: subjectInputs,
        tahfeezhDetails: {
          absenceOfHifz: Number(absenceOfHifz) || 0,
          daysPresent: Number(daysPresent) || 0,
          daysAbsent: Number(daysAbsent) || 0,
          fromSurah,
          toSurah,
          memorizedPages: Number(memorizedPages) || 0
        },
        evaluationElements: evalElements.map(e => ({
          elementLabel: e.label,
          elementLabelArabic: e.labelAr,
          rating: e.rating
        })),
        supervisorRecommendations: supervisorRec,
        teacherRecommendations: teacherRec,
        headTeacherComments,
        dateIssued,
        nextTermBegins
      };

      await api.post('/grading/submit', payload);
      Alert.alert('Success', 'Report sheet saved successfully.');
      goBack();
    } catch (err: any) {
      Alert.alert('Submit Failed', err.response?.data?.message || 'Error uploading grading details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5631" />
        <Text style={styles.loadingText}>Retrieving student record details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
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

      {/* Progress Wizard Header */}
      <View style={styles.progressRow}>
        <View style={[styles.progressStep, step >= 1 && styles.stepActive]}>
          <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>1. Academics</Text>
        </View>
        <View style={[styles.progressStep, step >= 2 && styles.stepActive]}>
          <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>2. Tahfeezh</Text>
        </View>
        <View style={[styles.progressStep, step >= 3 && styles.stepActive]}>
          <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>3. Comments</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          /* STEP 1: SUBJECT GRADES */
          <View>
            <Text style={styles.sectionHeaderTitle}>Subject Assessment Input</Text>
            <Text style={styles.sectionDesc}>
              Check the toggle to enable grading. Letter grades & totals are calculated in real-time.
            </Text>

            {/* TAHFEEZH SECTION */}
            <View style={styles.subjectGroupContainer}>
              <Text style={styles.subjectGroupTitle}>📖 Tahfeezh Section (Islamic Studies)</Text>
              {subjects.filter(s => s.section === 'tahfeezh').map((sub, idx) => {
                const globalIdx = subjects.findIndex(s => s.subjectName === sub.subjectName);
                const calc = getSubjectTotalAndGrade(sub);
                return (
                  <View key={idx} style={[styles.subjectCard, !sub.isGraded && styles.subjectCardDisabled]}>
                    <View style={styles.subjectCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{sub.subjectName}</Text>
                        <Text style={styles.subjectNameAr}>{sub.subjectNameArabic}</Text>
                      </View>
                      <Switch
                        value={sub.isGraded}
                        onValueChange={() => toggleSubjectGrading(globalIdx)}
                        trackColor={{ false: '#dcdcdc', true: '#b3d1b3' }}
                        thumbColor={sub.isGraded ? '#1E5631' : '#f4f3f4'}
                      />
                    </View>

                    {sub.isGraded && (
                      <View style={styles.scoresRow}>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Exam (60)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score60}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score60', val)}
                          />
                        </View>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Test 1 (20)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score20_1}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score20_1', val)}
                          />
                        </View>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Test 2 (20)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score20_2}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score20_2', val)}
                          />
                        </View>

                        {/* Calculations display */}
                        <View style={styles.calcBox}>
                          <Text style={styles.calcLabel}>Total (100)</Text>
                          <Text style={styles.calcVal}>{calc.total}</Text>
                        </View>
                        <View style={[styles.calcBox, { backgroundColor: '#eef6ee' }]}>
                          <Text style={styles.calcLabel}>Grade</Text>
                          <Text style={[styles.calcVal, { color: '#1E5631', fontSize: 16 }]}>
                            {calc.grade}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ACADEMIC SECTION */}
            <View style={[styles.subjectGroupContainer, { marginTop: 20 }]}>
              <Text style={styles.subjectGroupTitle}>📚 Academic Subjects</Text>
              {subjects.filter(s => s.section === 'academic').map((sub, idx) => {
                const globalIdx = subjects.findIndex(s => s.subjectName === sub.subjectName);
                const calc = getSubjectTotalAndGrade(sub);
                return (
                  <View key={idx} style={[styles.subjectCard, !sub.isGraded && styles.subjectCardDisabled]}>
                    <View style={styles.subjectCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subjectName}>{sub.subjectName}</Text>
                        <Text style={styles.subjectNameAr}>{sub.subjectNameArabic}</Text>
                      </View>
                      <Switch
                        value={sub.isGraded}
                        onValueChange={() => toggleSubjectGrading(globalIdx)}
                        trackColor={{ false: '#dcdcdc', true: '#b3d1b3' }}
                        thumbColor={sub.isGraded ? '#1E5631' : '#f4f3f4'}
                      />
                    </View>

                    {sub.isGraded && (
                      <View style={styles.scoresRow}>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Exam (60)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score60}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score60', val)}
                          />
                        </View>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Test 1 (20)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score20_1}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score20_1', val)}
                          />
                        </View>
                        <View style={styles.scoreInputBox}>
                          <Text style={styles.scoreLabel}>Test 2 (20)</Text>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={2}
                            value={sub.score20_2}
                            onChangeText={(val) => handleScoreChange(globalIdx, 'score20_2', val)}
                          />
                        </View>

                        {/* Calculations display */}
                        <View style={styles.calcBox}>
                          <Text style={styles.calcLabel}>Total (100)</Text>
                          <Text style={styles.calcVal}>{calc.total}</Text>
                        </View>
                        <View style={[styles.calcBox, { backgroundColor: '#eef6ee' }]}>
                          <Text style={styles.calcLabel}>Grade</Text>
                          <Text style={[styles.calcVal, { color: '#1E5631', fontSize: 16 }]}>
                            {calc.grade}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          /* STEP 2: TAHFEEZH & ATTENDANCE */
          <View>
            <Text style={styles.sectionHeaderTitle}>Qur'an (Tahfeezh) & Attendance</Text>
            
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Total Absence of Giving Hifz</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={absenceOfHifz}
                onChangeText={(val) => setAbsenceOfHifz(val.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.fieldCard, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.fieldLabel}>Days Present</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={daysPresent}
                  onChangeText={(val) => setDaysPresent(val.replace(/[^0-9]/g, ''))}
                />
              </View>
              <View style={[styles.fieldCard, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Days Absent</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="numeric"
                  value={daysAbsent}
                  onChangeText={(val) => setDaysAbsent(val.replace(/[^0-9]/g, ''))}
                />
              </View>
            </View>

            {/* From/To Surah pickers */}
            <View style={styles.gridRow}>
              <View style={[styles.fieldCard, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.fieldLabel}>From Surah</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => handleOpenSurahPicker('FROM')}
                >
                  <Text style={styles.pickerTriggerText}>
                    {fromSurah || 'Select Surah...'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.fieldCard, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>To Surah</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => handleOpenSurahPicker('TO')}
                >
                  <Text style={styles.pickerTriggerText}>
                    {toSurah || 'Select Surah...'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Total Memorized Pages</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={memorizedPages}
                onChangeText={(val) => setMemorizedPages(val.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          /* STEP 3: CHARACTER EVALUATIONS & COMMENTS */
          <View>
            <Text style={styles.sectionHeaderTitle}>Evaluations & Remarks</Text>
            
            {/* Elements of evaluation mapping */}
            <Text style={styles.subSectionTitle}>Elements of Evaluation (عناصر التقويم)</Text>
            {evalElements.map((el, idx) => (
              <View key={idx} style={styles.evalCard}>
                <Text style={styles.evalLabel}>{el.label}</Text>
                <Text style={styles.evalLabelAr}>{el.labelAr}</Text>
                
                <View style={styles.ratingRow}>
                  {RATINGS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.ratingBtn, el.rating === r && styles.ratingBtnActive]}
                      onPress={() => handleEvaluationRatingChange(idx, r)}
                    >
                      <Text style={[styles.ratingBtnText, el.rating === r && styles.ratingBtnTextActive]}>
                        {r.split(' ')[0]} {/* Grab the first word for brief display e.g. ممتاز */}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Comments & Administration Dates</Text>
            
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Supervisor's Recommendations</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 60 }]}
                multiline
                placeholder="e.g. Masha Allah Barakallah Feeki"
                value={supervisorRec}
                onChangeText={setSupervisorRec}
              />
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Teacher's Recommendations</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 60 }]}
                multiline
                placeholder="e.g. A good and disciplined student. Keep it up."
                value={teacherRec}
                onChangeText={setTeacherRec}
              />
            </View>

            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Head Teacher's Comments</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 60 }]}
                multiline
                placeholder="e.g. An Outstanding Performance."
                value={headTeacherComments}
                onChangeText={setHeadTeacherComments}
              />
            </View>

            <View style={styles.gridRow}>
              <View style={[styles.fieldCard, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.fieldLabel}>Next Term Begins</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="dd-mm-yyyy"
                  value={nextTermBegins}
                  onChangeText={setNextTermBegins}
                />
              </View>
              <View style={[styles.fieldCard, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Date Issued</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="dd-mm-yyyy"
                  value={dateIssued}
                  onChangeText={setDateIssued}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        {step > 1 ? (
          <TouchableOpacity style={styles.footerBtnSide} onPress={() => setStep(step - 1)}>
            <Text style={styles.footerBtnSideText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 0.8 }} />
        )}

        {step < 3 ? (
          <TouchableOpacity style={styles.footerBtnMain} onPress={() => setStep(step + 1)}>
            <Text style={styles.footerBtnMainText}>Next Step →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerBtnMain, { backgroundColor: '#1E5631' }]}
            onPress={submitGrades}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.footerBtnMainText}>Save & Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 114 Surahs Dropdown Selector Modal */}
      <Modal visible={isSurahModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Surah</Text>
            
            <FlatList
              data={SURAHS}
              keyExtractor={(item) => item.number.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.surahItem}
                  onPress={() => handleSelectSurah(item.arabic)}
                >
                  <Text style={styles.surahNo}>{item.number}</Text>
                  <Text style={styles.surahEng}>{item.english}</Text>
                  <Text style={styles.surahAr}>{item.arabic}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsSurahModalOpen(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#1E5631',
  },
  header: {
    backgroundColor: '#1E5631',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  progressRow: {
    flexDirection: 'row',
    backgroundColor: '#e1ebe1',
    borderBottomWidth: 1,
    borderBottomColor: '#cce0cc',
  },
  progressStep: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  stepActive: {
    borderBottomColor: '#1E5631',
  },
  stepText: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#1E5631',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    lineHeight: 16,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
  },
  subjectCardDisabled: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
    opacity: 0.6,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  subjectNameAr: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
    textAlign: 'left',
  },
  scoresRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f2f4f2',
    paddingTop: 10,
    gap: 8,
  },
  scoreInputBox: {
    flex: 1.2,
  },
  scoreLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreInput: {
    backgroundColor: '#f8faf8',
    borderColor: '#d0d8d0',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  calcBox: {
    flex: 1,
    backgroundColor: '#f0f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    padding: 4,
  },
  calcLabel: {
    fontSize: 8,
    color: '#777',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  calcVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8faf8',
    borderColor: '#d0d8d0',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333',
  },
  gridRow: {
    flexDirection: 'row',
  },
  pickerTrigger: {
    backgroundColor: '#f8faf8',
    borderColor: '#d0d8d0',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  pickerTriggerText: {
    fontSize: 13,
    color: '#1E5631',
    fontWeight: '600',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 10,
  },
  evalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e6e2',
    marginBottom: 12,
  },
  evalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  evalLabelAr: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f3f0',
    borderRadius: 6,
    padding: 3,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  ratingBtnActive: {
    backgroundColor: '#1E5631',
  },
  ratingBtnText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  ratingBtnTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e6e2',
    padding: 15,
    alignItems: 'center',
  },
  footerBtnSide: {
    flex: 0.8,
    borderWidth: 1,
    borderColor: '#1E5631',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  footerBtnSideText: {
    color: '#1E5631',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerBtnMain: {
    flex: 1.2,
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerBtnMainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 15,
    textAlign: 'center',
  },
  surahItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  surahNo: {
    width: 30,
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  surahEng: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  surahAr: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E5631',
    direction: 'rtl',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  modalCloseBtn: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: '#666',
    fontWeight: 'bold',
  },
});
