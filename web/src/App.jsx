import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { StudentDashboard } from './pages/StudentDashboard';
import { AIChat } from './pages/AIChat';
import { DocumentSummarizer } from './pages/DocumentSummarizer';
import { MaterialsLibrary } from './pages/MaterialsLibrary';
import { TaskManager } from './pages/TaskManager';
import { QuizPlayer } from './pages/QuizPlayer';
import { AssignmentsView } from './pages/AssignmentsView';
import { AnnouncementsView } from './pages/AnnouncementsView';
import { CourseEnrollment } from './pages/CourseEnrollment';
import { AcademicRecords } from './pages/AcademicRecords';
import { LecturerDashboard } from './pages/LecturerDashboard';
import { RegistrarDashboard } from './pages/RegistrarDashboard';
import { DeptHeadDashboard } from './pages/DeptHeadDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LecturerActivation } from './pages/LecturerActivation';

// Master Layout for authenticated pages
const AppLayout = ({ children }) => {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

// Root index redirector based on user role
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user.role === 'student') return <Navigate to="/dashboard" replace />;
  if (user.role === 'lecturer') return <Navigate to="/lecturer" replace />;
  if (user.role === 'registrar') return <Navigate to="/registrar" replace />;
  if (user.role === 'deptHead') return <Navigate to="/department" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate-lecturer" element={<LecturerActivation />} />
          <Route path="/lecturer-activation" element={<LecturerActivation />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Student Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppLayout>
                  <StudentDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AIChat />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/summarizer"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DocumentSummarizer />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MaterialsLibrary />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AppLayout>
                  <TaskManager />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <QuizPlayer />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AssignmentsView />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AnnouncementsView />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollment"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CourseEnrollment />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AcademicRecords />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Lecturer Routes */}
          <Route
            path="/lecturer"
            element={
              <ProtectedRoute allowedRoles={['lecturer', 'admin']}>
                <AppLayout>
                  <LecturerDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Registrar Routes */}
          <Route
            path="/registrar"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AppLayout>
                  <RegistrarDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Department Head Routes */}
          <Route
            path="/department"
            element={
              <ProtectedRoute allowedRoles={['deptHead', 'admin']}>
                <AppLayout>
                  <DeptHeadDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
