import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Animated, Text, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import StudentUpload from './src/screens/admin/StudentUpload';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import GradingForm from './src/screens/teacher/GradingForm';
import TeacherStudentPreview from './src/screens/teacher/TeacherStudentPreview';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import api, { setAuthToken } from './src/services/api';

type ScreenName =
  | 'LOGIN'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_GRADING'
  | 'STUDENT_UPLOAD'
  | 'TEACHER_DASHBOARD'
  | 'TEACHER_PREVIEW'
  | 'TEACHER_GRADING'
  | 'PARENT_DASHBOARD';

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('LOGIN');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States for grading sub-flow
  const [gradingStudent, setGradingStudent] = useState<any>(null);
  const [gradingTerm, setGradingTerm] = useState('');
  const [gradingYear, setGradingYear] = useState('');

  // Global Floating Notification Banner States
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [bannerAnim] = useState(new Animated.Value(-150));

  const showBanner = () => {
    Animated.spring(bannerAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotification(null);
    });
  };

  // Trigger banner animation when activeNotification is loaded
  useEffect(() => {
    if (activeNotification) {
      showBanner();
    }
  }, [activeNotification]);

  // Periodic polling for notifications (every 10 seconds to catch when data is turned on)
  useEffect(() => {
    let intervalId: any;

    const checkNewNotifications = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('lastUserRole') || 'ALL';
        const response = await api.get(`/public/notifications?role=${savedRole}`);
        const notificationsList = response.data || [];

        if (notificationsList.length === 0) return;

        const seenIdsStr = await AsyncStorage.getItem('seenNotificationIds') || '[]';
        const seenIds = JSON.parse(seenIdsStr) as string[];

        // Filter for announcements that have not been displayed yet
        const unseenNotifications = notificationsList.filter(
          (n: any) => !seenIds.includes(n._id)
        );

        if (unseenNotifications.length > 0) {
          const newest = unseenNotifications[0];
          const updatedSeenIds = [...seenIds, ...unseenNotifications.map((n: any) => n._id)];
          await AsyncStorage.setItem('seenNotificationIds', JSON.stringify(updatedSeenIds));
          setActiveNotification(newest);
        }
      } catch (error) {
        console.log('[Background Notification Check] Fetch skipped (offline/error)');
      }
    };

    checkNewNotifications();
    intervalId = setInterval(checkNewNotifications, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLoginSuccess = async (userPayload: any) => {
    setCurrentUser(userPayload);
    try {
      if (userPayload?.role) {
        await AsyncStorage.setItem('lastUserRole', userPayload.role);
      }
    } catch (e) {
      console.log('Error saving user role:', e);
    }
    if (userPayload.role === 'ADMIN') {
      setScreen('ADMIN_DASHBOARD');
    } else if (userPayload.role === 'TEACHER') {
      setScreen('TEACHER_DASHBOARD');
    } else if (userPayload.role === 'PARENT') {
      setScreen('PARENT_DASHBOARD');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setScreen('LOGIN');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        {screen === 'LOGIN' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
        
        {screen === 'ADMIN_DASHBOARD' && (
          <AdminDashboard
            onLogout={handleLogout}
            navigateToBulkUpload={() => setScreen('STUDENT_UPLOAD')}
            onSelectStudentGrading={(student, term, academicYear) => {
              setGradingStudent(student);
              setGradingTerm(term);
              setGradingYear(academicYear);
              setScreen('ADMIN_GRADING');
            }}
          />
        )}

        {screen === 'ADMIN_GRADING' && (
          <GradingForm
            student={gradingStudent}
            term={gradingTerm}
            academicYear={gradingYear}
            goBack={() => setScreen('ADMIN_DASHBOARD')}
          />
        )}

        {screen === 'STUDENT_UPLOAD' && (
          <StudentUpload goBack={() => setScreen('ADMIN_DASHBOARD')} />
        )}

        {screen === 'TEACHER_DASHBOARD' && (
          <TeacherDashboard
            teacherUser={currentUser}
            onLogout={handleLogout}
            onSelectStudentGrading={(student, term, academicYear) => {
              setGradingStudent(student);
              setGradingTerm(term);
              setGradingYear(academicYear);
              if (student.hasResult) {
                setScreen('TEACHER_PREVIEW');
              } else {
                setScreen('TEACHER_GRADING');
              }
            }}
          />
        )}

        {screen === 'TEACHER_PREVIEW' && (
          <TeacherStudentPreview
            student={gradingStudent}
            term={gradingTerm}
            academicYear={gradingYear}
            goBack={() => setScreen('TEACHER_DASHBOARD')}
            onEdit={() => setScreen('TEACHER_GRADING')}
          />
        )}

        {screen === 'TEACHER_GRADING' && (
          <GradingForm
            student={gradingStudent}
            term={gradingTerm}
            academicYear={gradingYear}
            goBack={() => setScreen('TEACHER_DASHBOARD')}
          />
        )}

        {screen === 'PARENT_DASHBOARD' && (
          <ParentDashboard studentUser={currentUser} onLogout={handleLogout} />
        )}

        {/* --- GLOBAL FLOATING NOTIFICATION TOAST BANNER --- */}
        {activeNotification && (
          <Animated.View
            style={[
              styles.bannerContainer,
              { transform: [{ translateY: bannerAnim }] }
            ]}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerHeader}>
                <View style={styles.bannerTitleRow}>
                  <Text style={styles.bannerIcon}>
                    {activeNotification.targetRole === 'TEACHER' ? '🎓' : activeNotification.targetRole === 'PARENT' ? '👥' : '📢'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle} numberOfLines={1}>{activeNotification.title}</Text>
                    <Text style={styles.bannerSub}>
                      Broadcast for {activeNotification.targetRole === 'ALL' ? 'Everyone' : activeNotification.targetRole}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.dismissBtn} onPress={hideBanner}>
                  <Text style={styles.dismissBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.bannerMessage} numberOfLines={3}>
                {activeNotification.message}
              </Text>
              {activeNotification.createdBy && (
                <Text style={styles.bannerAuthor}>Sent by {activeNotification.createdBy}</Text>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 15,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E5631',
    zIndex: 9999,
    // Premium Drop Shadows
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  bannerContent: {
    padding: 14,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E5631',
  },
  bannerSub: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    marginTop: 1,
  },
  dismissBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f0f4f0',
    marginLeft: 10,
  },
  dismissBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  bannerMessage: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginTop: 4,
  },
  bannerAuthor: {
    fontSize: 10,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 6,
  },
});
