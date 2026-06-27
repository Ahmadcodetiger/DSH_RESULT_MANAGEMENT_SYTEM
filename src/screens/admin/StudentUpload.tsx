import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform
} from 'react-native';
import api from '../../services/api';

interface StudentUploadProps {
  goBack: () => void;
}

export default function StudentUpload({ goBack }: StudentUploadProps) {
  const [uploadMode, setUploadMode] = useState<'manual' | 'json'>('manual');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual Add Form State
  const [manualStudent, setManualStudent] = useState({
    name: '',
    admissionNumber: '',
    level: '',
    section: '',
    academicYear: '2025/2026',
    parentPin: ''
  });
  
  // Results view
  const [uploadResults, setUploadResults] = useState<{
    uploaded: Array<{ admissionNumber: string; name: string; pin: string }>;
    skipped: Array<{ admissionNumber: string; name: string; reason: string }>;
  } | null>(null);

  const sampleJson = JSON.stringify(
    {
      students: [
        {
          admissionNumber: "DSH/001",
          name: "Amaani Yahuza",
          level: "5",
          section: "ALLO",
          academicYear: "2025/2026"
        },
        {
          admissionNumber: "DSH/002",
          name: "Zayd Ibrahim",
          level: "5",
          section: "ALLO",
          academicYear: "2025/2026"
        }
      ]
    },
    null,
    2
  );

  const fillSample = () => {
    setJsonText(sampleJson);
  };

  const handleUpload = async () => {
    if (!jsonText.trim()) {
      Alert.alert('Validation', 'Please paste student JSON first');
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(jsonText);
      if (!parsedPayload.students || !Array.isArray(parsedPayload.students)) {
        throw new Error('Must contain a "students" array.');
      }
    } catch (e: any) {
      Alert.alert('JSON Syntax Error', 'Please check the formatting. ' + e.message);
      return;
    }

    setLoading(true);
    setUploadResults(null);
    try {
      const response = await api.post('/admin/students/upload', parsedPayload);
      setUploadResults(response.data);
      Alert.alert('Upload Complete', `Successfully uploaded ${response.data.uploaded.length} students.`);
    } catch (err: any) {
      Alert.alert('Server Error', err.response?.data?.message || 'Failed to parse/upload students');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    const { name, admissionNumber, level, section, academicYear, parentPin } = manualStudent;
    if (!name.trim() || !admissionNumber.trim() || !level.trim() || !section.trim() || !academicYear.trim()) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    setUploadResults(null);
    try {
      const payload = {
        students: [
          {
            name: name.trim(),
            admissionNumber: admissionNumber.trim(),
            level: level.trim(),
            section: section.trim(),
            academicYear: academicYear.trim(),
            parentPin: parentPin.trim() || undefined
          }
        ]
      };
      const response = await api.post('/admin/students/upload', payload);
      setUploadResults(response.data);
      if (response.data.uploaded.length > 0) {
        Alert.alert('Success', 'Student added successfully.');
        setManualStudent({
          name: '',
          admissionNumber: '',
          level: '',
          section: '',
          academicYear: '2025/2026',
          parentPin: ''
        });
      } else {
        const reason = response.data.skipped[0]?.reason || 'Unknown error';
        Alert.alert('Skipped', `Failed to create student: ${reason}`);
      }
    } catch (err: any) {
      Alert.alert('Server Error', err.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!uploadResults) return;
    const textToCopy = uploadResults.uploaded
      .map(s => `Name: ${s.name} | Admission No: ${s.admissionNumber} | Parent PIN: ${s.pin}`)
      .join('\n');
    Clipboard.setString(textToCopy);
    Alert.alert('Copied', 'PIN list copied to clipboard!');
  };

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add / Upload Students</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {uploadResults ? (
          /* Results view */
          <View style={styles.resultsBox}>
            <Text style={styles.resultsHeader}>Import Summary</Text>
            
            <Text style={styles.resultSummaryText}>
              ✓ Successfully created: <Text style={styles.boldText}>{uploadResults.uploaded.length}</Text>
            </Text>
            {uploadResults.skipped.length > 0 && (
              <Text style={[styles.resultSummaryText, { color: '#d32f2f' }]}>
                ⚠ Skipped/Error: <Text style={styles.boldText}>{uploadResults.skipped.length}</Text>
              </Text>
            )}

            {uploadResults.uploaded.length > 0 && (
              <View style={styles.pinTableBox}>
                <Text style={styles.pinTableHeader}>Generated Parent Login Details:</Text>
                <Text style={styles.pinSubText}>
                  Provide these credentials to parents so they can log in securely.
                </Text>
                
                {uploadResults.uploaded.map((s, idx) => (
                  <View key={idx} style={styles.pinRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.pinRowName}>{s.name}</Text>
                      <Text style={styles.pinRowNo}>{s.admissionNumber}</Text>
                    </View>
                    <View style={styles.pinValBox}>
                      <Text style={styles.pinLabel}>PIN</Text>
                      <Text style={styles.pinText}>{s.pin}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyToClipboard}>
                  <Text style={styles.copyBtnText}>Copy Credentials List</Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadResults.skipped.length > 0 && (
              <View style={[styles.pinTableBox, { borderColor: '#ffebee' }]}>
                <Text style={[styles.pinTableHeader, { color: '#c62828' }]}>Skipped Students:</Text>
                {uploadResults.skipped.map((s, idx) => (
                  <Text key={idx} style={styles.skippedItemText}>
                    • {s.admissionNumber || 'No Admission'} ({s.name || 'No Name'}): {s.reason}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.resetBtn} onPress={() => setUploadResults(null)}>
              <Text style={styles.resetBtnText}>Add / Upload More</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Entry Forms */
          <View>
            {/* Tab selection */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, uploadMode === 'manual' && styles.tabBtnActive]}
                onPress={() => setUploadMode('manual')}
              >
                <Text style={[styles.tabBtnText, uploadMode === 'manual' && styles.tabBtnTextActive]}>
                  Manual Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, uploadMode === 'json' && styles.tabBtnActive]}
                onPress={() => setUploadMode('json')}
              >
                <Text style={[styles.tabBtnText, uploadMode === 'json' && styles.tabBtnTextActive]}>
                  Bulk JSON Import
                </Text>
              </TouchableOpacity>
            </View>

            {uploadMode === 'manual' ? (
              /* Manual Input Form */
              <View style={styles.formCard}>
                <Text style={styles.label}>Student Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Amaani Yahuza"
                  placeholderTextColor="#999"
                  value={manualStudent.name}
                  onChangeText={(val) => setManualStudent({ ...manualStudent, name: val })}
                />

                <Text style={styles.label}>Admission Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. DSH/015"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  value={manualStudent.admissionNumber}
                  onChangeText={(val) => setManualStudent({ ...manualStudent, admissionNumber: val })}
                />

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Level *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 5"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={manualStudent.level}
                      onChangeText={(val) => setManualStudent({ ...manualStudent, level: val })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Section *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. ALLO"
                      placeholderTextColor="#999"
                      autoCapitalize="characters"
                      value={manualStudent.section}
                      onChangeText={(val) => setManualStudent({ ...manualStudent, section: val })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Academic Year *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 2025/2026"
                      placeholderTextColor="#999"
                      value={manualStudent.academicYear}
                      onChangeText={(val) => setManualStudent({ ...manualStudent, academicYear: val })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Parent PIN (Opt)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Blank for auto"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={4}
                      value={manualStudent.parentPin}
                      onChangeText={(val) => setManualStudent({ ...manualStudent, parentPin: val.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleManualSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.uploadBtnText}>Add Student Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Bulk JSON Import */
              <View>
                <Text style={styles.instructions}>
                  Paste a JSON array containing the details of students you want to upload.
                </Text>

                <View style={styles.sampleBox}>
                  <View style={styles.sampleHeader}>
                    <Text style={styles.sampleTitle}>Required JSON Format:</Text>
                    <TouchableOpacity onPress={fillSample}>
                      <Text style={styles.fillSampleText}>Insert Example Template</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.sampleCode} numberOfLines={8}>
                    {sampleJson}
                  </Text>
                </View>

                <Text style={styles.label}>Paste JSON Content Below</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Pasted JSON content here..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={15}
                  textAlignVertical="top"
                  value={jsonText}
                  onChangeText={setJsonText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleUpload}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.uploadBtnText}>Process & Import List</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  backBtn: {
    marginRight: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  scrollContent: {
    padding: 20,
  },
  instructions: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
    marginBottom: 16,
    fontWeight: '500',
  },
  sampleBox: {
    backgroundColor: '#eef2ee',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cce0cc',
    padding: 14,
    marginBottom: 20,
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sampleTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E5631',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fillSampleText: {
    fontSize: 11,
    color: '#1E5631',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  sampleCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d0d8d0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#333',
    minHeight: 180,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  uploadBtn: {
    backgroundColor: '#1E5631',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resultsBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2ebe2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E5631',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f0',
    paddingBottom: 8,
    marginBottom: 12,
  },
  resultSummaryText: {
    fontSize: 14,
    color: '#2e7d32',
    marginVertical: 4,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: 'bold',
  },
  pinTableBox: {
    backgroundColor: '#f6faf6',
    borderColor: '#b3d1b3',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginTop: 15,
  },
  pinTableHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 4,
  },
  pinSubText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2ebe2',
  },
  pinRowName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  pinRowNo: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
    fontWeight: '500',
  },
  pinValBox: {
    alignItems: 'center',
    backgroundColor: '#eaf5ea',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    borderWidth: 1,
    borderColor: '#b3d1b3',
  },
  pinLabel: {
    fontSize: 8,
    color: '#1E5631',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pinText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  copyBtn: {
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  skippedItemText: {
    fontSize: 11,
    color: '#ef4444',
    marginVertical: 2,
    fontWeight: '500',
  },
  resetBtn: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#1E5631',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#eef2ee',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#1E5631',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2ebe2',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formInput: {
    backgroundColor: '#fafcfa',
    borderWidth: 1.5,
    borderColor: '#d0d8d0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#333',
    marginBottom: 14,
  },
});

