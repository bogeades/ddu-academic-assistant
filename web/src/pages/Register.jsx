import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    yearOfStudy: 1,
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match. Please ensure both passwords are identical.');
    }

    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters in length.');
    }

    if (!/\d/.test(formData.password)) {
      return setError('Password must contain at least one numerical digit (0-9).');
    }

    if (!/[A-Z]/.test(formData.password)) {
      return setError('Password must contain at least one uppercase letter (A-Z).');
    }

    setSubmitting(true);
    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        studentId: formData.studentId,
        yearOfStudy: parseInt(formData.yearOfStudy, 10),
        password: formData.password,
      });

      setSuccess(res.message || 'Registration successful! Your account is pending administrator approval.');
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && serverErrors.length > 0) {
        setError(serverErrors.map((e) => e.message).join(' • '));
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please check your data.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '36px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/ddu-logo.png"
            alt="Dire Dawa University Seal"
            style={{
              width: '76px',
              height: '76px',
              objectFit: 'contain',
              marginBottom: '10px',
              filter: 'drop-shadow(0 2px 6px rgba(11, 57, 84, 0.15))',
            }}
          />
          <h2 style={{ fontSize: '22px', color: '#0b3954', fontWeight: 'bold' }}>Student Registration (FR-S01)</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Dire Dawa University IoT - Department of Computer Science</p>
        </div>

        {success ? (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <CheckCircle size={44} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#065f46', fontSize: '18px', marginBottom: '8px' }}>Registration Submitted!</h3>
            <p style={{ color: '#047857', fontSize: '14px', lineHeight: '1.6' }}>{success}</p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex' }}>
                Proceed to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Full Name</label>
              <input type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required placeholder="e.g., Abebe Chala" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Institutional Email</label>
              <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} required placeholder="e.g., abebe@ddu.edu.et" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Student ID</label>
                <input type="text" name="studentId" className="input-field" value={formData.studentId} onChange={handleChange} placeholder="e.g., DDU/R/1024/14" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Year of Study</label>
                <select name="yearOfStudy" className="input-field" value={formData.yearOfStudy} onChange={handleChange}>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                  <option value={5}>5th Year</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Password (min 8 chars, 1 number, 1 uppercase)</label>
              <input type="password" name="password" className="input-field" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Confirm Password</label>
              <input type="password" name="confirmPassword" className="input-field" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              <UserPlus size={18} />
              <span>{submitting ? 'Registering...' : 'Create Student Account'}</span>
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              Already registered? <Link to="/login" style={{ fontWeight: '600' }}>Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
