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
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  
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
        <Text style={styles.headerTitle}>Bulk Student Import</Text>
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
              <Text style={styles.resetBtnText}>Upload Another List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Upload entry form */
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
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
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
  },
  scrollContent: {
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 15,
  },
  sampleBox: {
    backgroundColor: '#eef2ee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce0cc',
    padding: 12,
    marginBottom: 20,
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sampleTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E5631',
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
    color: '#444',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d8d0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 180,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  uploadBtn: {
    backgroundColor: '#1E5631',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resultsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e6e2',
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
  },
  boldText: {
    fontWeight: 'bold',
  },
  pinTableBox: {
    backgroundColor: '#f9faf9',
    borderColor: '#1E5631',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
  },
  pinTableHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E5631',
    marginBottom: 3,
  },
  pinSubText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 10,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1ee',
  },
  pinRowName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  pinRowNo: {
    fontSize: 11,
    color: '#777',
    marginTop: 1,
  },
  pinValBox: {
    alignItems: 'center',
    backgroundColor: '#e1ebe1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
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
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  skippedItemText: {
    fontSize: 11,
    color: '#c62828',
    marginVertical: 2,
  },
  resetBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1E5631',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#1E5631',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
