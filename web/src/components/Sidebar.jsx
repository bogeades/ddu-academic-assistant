import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  CheckSquare,
  HelpCircle,
  FileSpreadsheet,
  GraduationCap,
  Users,
  Settings,
  Database,
  ShieldAlert,
  BarChart2,
  CheckCircle,
  Megaphone,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '6px',
    color: isActive ? '#0284c7' : '#334155',
    backgroundColor: isActive ? '#e0f2fe' : 'transparent',
    fontWeight: isActive ? '600' : '500',
    fontSize: '14px',
    marginBottom: '4px',
    textDecoration: 'none',
  });

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '20px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {/* Student Links */}
      {user.role === 'student' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase' }}>
            Academic Core
          </div>
          <NavLink to="/dashboard" style={linkStyle}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/ai-chat" style={linkStyle}>
            <MessageSquare size={18} /> AI Academic Tutor
          </NavLink>
          <NavLink to="/summarizer" style={linkStyle}>
            <FileText size={18} /> Document Summarizer
          </NavLink>
          <NavLink to="/materials" style={linkStyle}>
            <BookOpen size={18} /> Course Materials
          </NavLink>
          <NavLink to="/tasks" style={linkStyle}>
            <CheckSquare size={18} /> Task Manager
          </NavLink>
          <NavLink to="/quizzes" style={linkStyle}>
            <HelpCircle size={18} /> Quizzes & Tests
          </NavLink>
          <NavLink to="/assignments" style={linkStyle}>
            <FileSpreadsheet size={18} /> Assignments
          </NavLink>
          <NavLink to="/announcements" style={linkStyle}>
            <Megaphone size={18} /> Announcements
          </NavLink>
          <NavLink to="/enrollment" style={linkStyle}>
            <GraduationCap size={18} /> Course Enrollment
          </NavLink>
          <NavLink to="/records" style={linkStyle}>
            <FileText size={18} /> Academic Transcript
          </NavLink>
        </>
      )}

      {/* Lecturer Links */}
      {user.role === 'lecturer' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase' }}>
            Instruction Portal
          </div>
          <NavLink to="/lecturer" style={linkStyle}>
            <LayoutDashboard size={18} /> Overview & Analytics
          </NavLink>
          <NavLink to="/materials" style={linkStyle}>
            <BookOpen size={18} /> Upload Materials
          </NavLink>
          <NavLink to="/quizzes" style={linkStyle}>
            <HelpCircle size={18} /> Quizzes
          </NavLink>
          <NavLink to="/assignments" style={linkStyle}>
            <FileSpreadsheet size={18} /> Assignments & Grading
          </NavLink>
          <NavLink to="/announcements" style={linkStyle}>
            <Megaphone size={18} /> Course Announcements
          </NavLink>
          <NavLink to="/summarizer" style={linkStyle}>
            <FileText size={18} /> AI Summarizer
          </NavLink>
        </>
      )}

      {/* Registrar Links */}
      {user.role === 'registrar' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase' }}>
            Registrar Portal
          </div>
          <NavLink to="/registrar" style={linkStyle}>
            <Users size={18} /> Student Directory
          </NavLink>
          <NavLink to="/enrollment" style={linkStyle}>
            <GraduationCap size={18} /> Course Registration
          </NavLink>
          <NavLink to="/records" style={linkStyle}>
            <FileText size={18} /> Official Records & PDF
          </NavLink>
        </>
      )}

      {/* Department Head Links */}
      {user.role === 'deptHead' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase' }}>
            Department Management
          </div>
          <NavLink to="/department" style={linkStyle}>
            <BarChart2 size={18} /> Department Executive Portal
          </NavLink>
          <NavLink to="/materials" style={linkStyle}>
            <BookOpen size={18} /> Course Materials
          </NavLink>
          <NavLink to="/announcements" style={linkStyle}>
            <Megaphone size={18} /> Announcements
          </NavLink>
        </>
      )}

      {/* Admin Links */}
      {user.role === 'admin' && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '8px 12px', textTransform: 'uppercase' }}>
            System Administration
          </div>
          <NavLink to="/admin" style={linkStyle}>
            <LayoutDashboard size={18} /> Control Center
          </NavLink>
          <NavLink to="/materials" style={linkStyle}>
            <BookOpen size={18} /> Manage Materials
          </NavLink>
          <NavLink to="/registrar" style={linkStyle}>
            <Users size={18} /> All Students
          </NavLink>
          <NavLink to="/department" style={linkStyle}>
            <BarChart2 size={18} /> Dept Performance
          </NavLink>
        </>
      )}
    </aside>
  );
};
