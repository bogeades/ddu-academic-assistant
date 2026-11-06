import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#0b3954', fontWeight: 'bold' }}>Loading Dire Dawa Academic Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to respective dashboard if trying to access unauthorized route
    const roleRoutes = {
      student: '/dashboard',
      lecturer: '/lecturer',
      registrar: '/registrar',
      deptHead: '/department',
      admin: '/admin',
    };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }

  return children;
};
