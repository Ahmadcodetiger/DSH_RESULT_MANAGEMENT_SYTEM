import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image
} from 'react-native';
import api, { setAuthToken } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isStaff, setIsStaff] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [admissionNumber, setAdmissionNumber] = useState('');
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStaffLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login-staff', { username, password });
      const { token, user } = response.data;
      if (user.role === 'ACCOUNTANT' || user.role === 'DIRECTOR') {
        setError('Accountants & Directors must use the Web Portal to access their dashboards.');
        setLoading(false);
        return;
      }
      setAuthToken(token);
      onLoginSuccess({ ...user, role: user.role });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentLogin = async () => {
    if (!admissionNumber || !pin) {
      setError('Please enter Admission Number and PIN');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login-parent', {
        admissionNumber,
        pin
      });
      const { token, student } = response.data;
      setAuthToken(token);
      onLoginSuccess({ ...student, role: 'PARENT' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Parent login failed. Verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBox}>
            <Image
              source={require('../../assets/images/dsh_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.arabicLogo}> دار صغار الحفاظ</Text>
            <Text style={styles.title}>HOME OF YOUNG HUFFAZ ACADEMY</Text>
            <Text style={styles.subtitle}>Result Management System</Text>
          </View>

          <View style={styles.card}>
            {/* Tab Swapping */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, isStaff && styles.activeTab]}
                onPress={() => {
                  setIsStaff(true);
                  setError('');
                }}
              >
                <Text style={[styles.tabText, isStaff && styles.activeTabText]}>Staff Portal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isStaff && styles.activeTab]}
                onPress={() => {
                  setIsStaff(false);
                  setError('');
                }}
              >
                <Text style={[styles.tabText, !isStaff && styles.activeTabText]}>Parent Portal</Text>

              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {isStaff ? (
              /* Staff Login Forms */
              <View style={styles.formContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter staff username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter staff password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleStaffLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Log In as Staff</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Parent Login Forms */
              <View style={styles.formContainer}>
                <Text style={styles.label}>Admission Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DSH/015"
                  placeholderTextColor="#999"
                  value={admissionNumber}
                  onChangeText={setAdmissionNumber}
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>Parent PIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4 to 6-digit numeric PIN"
                  placeholderTextColor="#999"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.button, styles.parentButton]}
                  onPress={handleParentLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Access Child's Results</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f4',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1E5631',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  arabicLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E5631',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.75,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2ebe2',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#eef2ee',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#777',
  },
  activeTabText: {
    color: '#1E5631',
  },
  errorText: {
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  formContainer: {},
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fcfdfc',
    borderWidth: 1.5,
    borderColor: '#d0d8d0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1E5631',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1E5631',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  parentButton: {
    backgroundColor: '#d4af37',
    shadowColor: '#d4af37',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
