import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogIn, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, verifyOTP, firstTimeSetup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired');

  const redirectByRole = (user) => {
    if (user.role === 'student') navigate('/dashboard');
    else if (user.role === 'lecturer') navigate('/lecturer');
    else if (user.role === 'registrar') navigate('/registrar');
    else if (user.role === 'deptHead') navigate('/department');
    else if (user.role === 'admin') navigate('/admin');
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (showPasswordSetup) {
        if (!otp || otp.trim().length !== 6) {
          setError('Please enter the 6-digit verification OTP code from your approval email.');
          setSubmitting(false);
          return;
        }
        if (!newPassword || newPassword.length < 8) {
          setError('Your permanent password must be at least 8 characters in length.');
          setSubmitting(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('New password and password confirmation do not match.');
          setSubmitting(false);
          return;
        }

        const user = await firstTimeSetup(email, password, otp.trim(), newPassword);
        redirectByRole(user);
      } else if (showOtp) {
        if (!otp || otp.trim().length !== 6) {
          setError('Please enter the valid 6-digit verification OTP code.');
          setSubmitting(false);
          return;
        }
        const user = await verifyOTP(email, otp.trim());
        redirectByRole(user);
      } else {
        const result = await login(email, password);
        if (result && result.requirePasswordSetup) {
          setShowPasswordSetup(true);
          setOtpNotice(result.message || 'First-time setup: Enter your OTP code and create your personal password.');
          if (result.devOtp) {
            setOtp(result.devOtp);
          }
        } else if (result && result.requireOtp) {
          setShowOtp(true);
          setOtpNotice(result.message || 'Account approved! Please enter the 6-digit OTP verification code sent to your email.');
          if (result.devOtp) {
            setOtp(result.devOtp);
          }
        } else if (result && result.role) {
          redirectByRole(result);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials or OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/auth/resend-otp', { email });
      setOtpNotice(res.data.message || 'A fresh OTP has been dispatched.');
      if (res.data.devOtp) {
        setOtp(res.data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const setSampleRole = (sampleEmail, samplePass) => {
    setEmail(sampleEmail);
    setPassword(samplePass);
    setShowOtp(false);
    setOtp('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/ddu-logo.png"
            alt="Dire Dawa University Seal"
            style={{
              width: '88px',
              height: '88px',
              objectFit: 'contain',
              marginBottom: '10px',
              filter: 'drop-shadow(0 2px 8px rgba(11, 57, 84, 0.18))',
            }}
          />
          <h2 style={{ fontSize: '20px', color: '#0b3954', margin: '4px 0', fontWeight: 'bold' }}>Dire Dawa University</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>AI-Based Smart Academic Assistant Portal</p>
        </div>

        {isExpired && (
          <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={16} />
            <span>Session expired due to university inactivity policy. Please log in again.</span>
          </div>
        )}

        {otpNotice && (
          <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 'bold' }}>Account Approved by Administrator!</div>
              <div>{otpNotice}</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {showPasswordSetup ? (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
                  Student First-Time Account Setup
                </div>
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                  Your assignment has been approved. Enter your temporary password, 6-digit OTP from your email, and choose your personal password.
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Academic Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@ddu.edu.et"
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Temporary Default Password <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '11px' }}>(from Email / Admin)</span>
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Temporary password (e.g. Ddu@1234!)"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  6-Digit OTP Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 123456"
                  style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Create New Personal Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Confirm Personal Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
                disabled={submitting}
              >
                <KeyRound size={18} />
                <span>{submitting ? 'Setting up Password...' : 'Save Password & Enter Portal'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowPasswordSetup(false); setError(''); }}
                className="btn-outline"
                style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
              >
                Cancel
              </button>
            </>
          ) : !showOtp ? (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Academic Email Address or University ID
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. LEC/CS/101 or lecturer.cs@ddu.edu.et"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={submitting}
              >
                <LogIn size={18} />
                <span>{submitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link
                  to="/activate-lecturer"
                  style={{
                    color: '#0b3954',
                    backgroundColor: '#e0f2fe',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  <KeyRound size={14} color="#0284c7" />
                  <span>Invited Lecturer? Activate Account with OTP & Temp Password</span>
                </Link>

                <button
                  type="button"
                  onClick={() => { setShowPasswordSetup(true); setError(''); setOtpNotice(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    textDecoration: 'underline',
                  }}
                >
                  First-Time Student? Verify OTP & Set Personal Password
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Account:</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b3954' }}>{email}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Enter 6-Digit OTP Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 123456"
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', fontWeight: 'bold' }}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Check your inbox for the verification code sent upon admin approval.
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
                disabled={submitting}
              >
                <KeyRound size={18} />
                <span>{submitting ? 'Verifying OTP...' : 'Verify OTP & Complete Sign In'}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px', minHeight: '34px' }}
                  disabled={submitting}
                >
                  Resend OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOtp(false); setOtp(''); setError(''); setOtpNotice(''); }}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px', minHeight: '34px' }}
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          New student? <Link to="/register" style={{ fontWeight: '600' }}>Register Student Account</Link>
        </div>

        {/* Quick Demo Credentials */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Quick Demo Sign-In
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            <button type="button" onClick={() => setSampleRole('student.cs@ddu.edu.et', 'Student@123')} className="btn-outline" style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}>Student</button>
            <button type="button" onClick={() => setSampleRole('lecturer.cs@ddu.edu.et', 'Lecturer@123')} className="btn-outline" style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}>Lecturer</button>
            <button type="button" onClick={() => setSampleRole('registrar@ddu.edu.et', 'Registrar@123')} className="btn-outline" style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}>Registrar</button>
            <button type="button" onClick={() => setSampleRole('depthead.cs@ddu.edu.et', 'DeptHead@123')} className="btn-outline" style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}>Dept Head</button>
            <button type="button" onClick={() => setSampleRole('admin@ddu.edu.et', 'Admin@123')} className="btn-outline" style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}>Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
};
