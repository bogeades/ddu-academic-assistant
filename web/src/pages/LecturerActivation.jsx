import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Lock,
  Building,
  UserCheck,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LecturerActivation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Wizard Steps: 1 (Verify OTP), 2 (Set Personal Password), 3 (Success)
  const [step, setStep] = useState(1);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verifiedLecturer, setVerifiedLecturer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Extract query parameters from email invitation link (?email=...&id=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const idParam = params.get('id') || params.get('lecturerId');
    if (emailParam) {
      setIdentifier(emailParam);
    } else if (idParam) {
      setIdentifier(idParam);
    }
  }, [location.search]);

  // Password Policy Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  // Step 1: Verify OTP and Temporary Password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!identifier.trim()) {
      return setError('Please enter your Lecturer ID or registered university email.');
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      return setError('Please enter the 6-digit OTP verification code received in your approval email.');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/lecturer-verify-otp', {
        identifier: identifier.trim(),
        tempPassword: tempPassword.trim(),
        otp: otp.trim(),
      });

      if (res.data.verified) {
        setVerifiedLecturer(res.data.lecturer);
        setStep(2);
        setNotice(res.data.message || 'Credentials verified! Now please set your permanent password.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Verification failed. Please double-check your credentials or contact the administrator.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Set Permanent Personal Password & Activate
  const handleActivateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      return setError('Your password does not satisfy all security requirements.');
    }
    if (!passwordsMatch) {
      return setError('New password and confirm password do not match.');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/lecturer-activate-account', {
        identifier: identifier.trim(),
        tempPassword: tempPassword.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        // Store session token and user info
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        setStep(3);
        setNotice(res.data.message || 'Account activated successfully!');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Activation failed. Please check your credentials or try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (!identifier.trim()) {
      return setError('Please enter your registered email address first.');
    }
    setError('');
    setResending(true);
    try {
      const res = await api.post('/auth/resend-otp', { email: identifier.trim() });
      setNotice(res.data.message || 'A fresh OTP code has been dispatched to your email.');
      if (res.data.devOtp) {
        setOtp(res.data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b3954',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'linear-gradient(135deg, #072233 0%, #0b3954 60%, #0284c7 100%)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#0b3954',
            color: '#ffffff',
            padding: '28px 24px',
            textAlign: 'center',
            borderBottom: '3px solid #0284c7',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              border: '2px solid rgba(255,255,255,0.25)',
            }}
          >
            <ShieldCheck size={32} color="#38bdf8" />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px', letterSpacing: '0.3px' }}>
            Dire Dawa University
          </h1>
          <p style={{ fontSize: '13px', color: '#93c5fd', margin: 0, fontWeight: '500' }}>
            Lecturer Account Activation & OTP Verification
          </p>
        </div>

        {/* Step Progress Tracker */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '12px 24px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 1 ? 1 : 0.4 }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step > 1 ? '#16a34a' : '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {step > 1 ? <Check size={14} /> : '1'}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>Verify OTP</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', opacity: step >= 2 ? 1 : 0.4 }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step > 2 ? '#16a34a' : step === 2 ? '#0284c7' : '#cbd5e1',
                color: step >= 2 ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {step > 2 ? <Check size={14} /> : '2'}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>Set Password</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step === 3 ? 1 : 0.4 }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step === 3 ? '#16a34a' : '#cbd5e1',
                color: step === 3 ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              3
            </div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>Complete</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {/* Alerts */}
          {error && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{notice}</span>
            </div>
          )}

          {/* ================= STEP 1: VERIFY OTP & TEMP CREDENTIALS ================= */}
          {step === 1 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '16px', padding: '12px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
                  Step 1: Identity & Credentials Verification
                </div>
                <div style={{ fontSize: '12px', color: '#3b82f6', lineHeight: 1.5 }}>
                  Please enter your Lecturer ID or registered email, the temporary password from your invitation email, and the 6-digit verification OTP code.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Lecturer ID or Registered Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. LEC/CS/101 or lecturer.cs@ddu.edu.et"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Temporary Default Password <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'normal' }}>(from email)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    className="input-field"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Temporary credential (e.g. Ddu@Temp1234!)"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  6-Digit OTP Verification Code <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  style={{
                    textAlign: 'center',
                    fontSize: '22px',
                    letterSpacing: '6px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    height: '48px',
                    borderColor: '#0284c7',
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                  This single-use security code expires in 24 hours.
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: '44px', fontSize: '14px', marginBottom: '12px' }}
                disabled={submitting}
              >
                {submitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Verify Credentials & Proceed</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '12px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  disabled={resending}
                >
                  <RefreshCw size={13} className={resending ? 'spin' : ''} />
                  <span>{resending ? 'Sending...' : 'Resend Verification Code'}</span>
                </button>

                <Link to="/login" style={{ color: '#64748b', textDecoration: 'none' }}>
                  Already activated? <strong style={{ color: '#0b3954' }}>Sign In</strong>
                </Link>
              </div>
            </form>
          )}

          {/* ================= STEP 2: CREATE PERSONAL PASSWORD ================= */}
          {step === 2 && (
            <form onSubmit={handleActivateAccount}>
              {verifiedLecturer && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Verified Faculty Profile
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954' }}>
                    {verifiedLecturer.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    Lecturer ID: <strong>{verifiedLecturer.lecturerId}</strong> • Department: <strong>{verifiedLecturer.department || 'Dire Dawa University'}</strong>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  New Personal Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter permanent password"
                    style={{ paddingRight: '40px' }}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Live Password Strength Requirements Checklist */}
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Password Security Requirements:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: hasMinLength ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} style={{ opacity: hasMinLength ? 1 : 0.3 }} />
                    <span>Minimum 8 characters in length</span>
                  </div>
                  <div style={{ color: hasUppercase ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} style={{ opacity: hasUppercase ? 1 : 0.3 }} />
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div style={{ color: hasNumber ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} style={{ opacity: hasNumber ? 1 : 0.3 }} />
                    <span>At least one numerical digit (0-9)</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Confirm Personal Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your permanent password"
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <span style={{ fontSize: '11px', color: '#dc2626', display: 'block', marginTop: '4px' }}>
                    Passwords do not match.
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: '44px', fontSize: '14px', marginBottom: '10px' }}
                disabled={submitting || !isPasswordValid}
              >
                <Lock size={16} />
                <span>{submitting ? 'Saving Password & Activating...' : 'Activate Account & Save Password'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-outline"
                style={{ width: '100%', justifyContent: 'center', height: '38px', fontSize: '12px' }}
              >
                Back to OTP Verification
              </button>
            </form>
          )}

          {/* ================= STEP 3: ACTIVATION COMPLETE SUCCESS ================= */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#16a34a',
                }}
              >
                <CheckCircle2 size={40} />
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0b3954', margin: '0 0 8px' }}>
                Account Successfully Activated!
              </h2>

              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                Your temporary credentials have been invalidated and your permanent personal password is now active.
                You can now log in using your <strong>Lecturer ID</strong> or <strong>email</strong>.
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: '#334155',
                }}
              >
                <div style={{ fontWeight: '600', color: '#0b3954' }}>Next Steps:</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  Proceed to the <strong>Lecturer Teaching Dashboard</strong> to access your approved teaching courses, assigned student rosters, lecture notes, and grading system.
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/lecturer')}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: '46px', fontSize: '15px', marginBottom: '10px' }}
              >
                <GraduationCap size={18} />
                <span>Go to Lecturer Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-outline"
                style={{ width: '100%', justifyContent: 'center', height: '40px', fontSize: '13px' }}
              >
                Sign In Screen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          Dire Dawa University • AI-Based Smart Academic Assistant System
        </div>
      </div>
    </div>
  );
};
