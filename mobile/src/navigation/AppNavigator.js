import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { LecturerActivationScreen } from '../screens/LecturerActivationScreen';
import { StudentHomeScreen } from '../screens/StudentHomeScreen';
import { AIChatScreen } from '../screens/AIChatScreen';
import { SummarizerScreen } from '../screens/SummarizerScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { TaskManagerScreen } from '../screens/TaskManagerScreen';
import { MaterialsScreen } from '../screens/MaterialsScreen';
import { AssignmentsScreen } from '../screens/AssignmentsScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { EnrollmentScreen } from '../screens/EnrollmentScreen';
import { AcademicRecordsScreen } from '../screens/AcademicRecordsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { LecturerScreen } from '../screens/LecturerScreen';
import { RegistrarScreen } from '../screens/RegistrarScreen';
import { DeptHeadScreen } from '../screens/DeptHeadScreen';
import { colors } from '../theme/colors';
import { getHomeRouteForRole } from './routes';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? getHomeRouteForRole(user.role) : 'Login'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Authentication Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Student Registration' }}
      />
      <Stack.Screen
        name="LecturerActivation"
        component={LecturerActivationScreen}
        options={{ title: 'Lecturer Activation' }}
      />

      {/* Student Portal Screens */}
      <Stack.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{ title: 'Dire Dawa University' }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ title: 'AI Academic Tutor' }}
      />
      <Stack.Screen
        name="Summarizer"
        component={SummarizerScreen}
        options={{ title: 'Document Summarizer' }}
      />
      <Stack.Screen
        name="Quizzes"
        component={QuizScreen}
        options={{ title: 'Practice Quizzes' }}
      />
      <Stack.Screen
        name="Tasks"
        component={TaskManagerScreen}
        options={{ title: 'Task Manager' }}
      />
      <Stack.Screen
        name="Materials"
        component={MaterialsScreen}
        options={{ title: 'Course Materials' }}
      />
      <Stack.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{ title: 'Assignments & Submissions' }}
      />
      <Stack.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{ title: 'University Announcements' }}
      />
      <Stack.Screen
        name="Enrollment"
        component={EnrollmentScreen}
        options={{ title: 'Course Registration' }}
      />
      <Stack.Screen
        name="Records"
        component={AcademicRecordsScreen}
        options={{ title: 'Academic Transcript & CGPA' }}
      />

      {/* Staff & Faculty Portals */}
      <Stack.Screen
        name="AdminPortal"
        component={AdminScreen}
        options={{ title: 'System Administration' }}
      />
      <Stack.Screen
        name="LecturerPortal"
        component={LecturerScreen}
        options={{ title: 'Lecturer Teaching Portal' }}
      />
      <Stack.Screen
        name="RegistrarPortal"
        component={RegistrarScreen}
        options={{ title: 'Registrar Assignment Portal' }}
      />
      <Stack.Screen
        name="DeptHeadPortal"
        component={DeptHeadScreen}
        options={{ title: 'Department Head Portal' }}
      />
    </Stack.Navigator>
  );
};
