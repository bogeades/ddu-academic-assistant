import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, touchTargets } from '../theme/colors';
import {
  getServerBaseUrl,
  setServerBaseUrl,
  checkServerHealth,
  PRIMARY_WIFI_IP,
} from '../services/api';
import { getHomeRouteForRole } from '../navigation/routes';

export const LoginScreen = ({ navigation }) => {
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

  // Server IP / Connection Manager
  const [currentUrl, setCurrentUrl] = useState(getServerBaseUrl());
  const [serverInput, setServerInput] = useState(PRIMARY_WIFI_IP);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // { success: boolean, message: string }
  const [showServerConfig, setShowServerConfig] = useState(false);

  const { user, login, verifyOTP, firstTimeSetup, resendOTP } = useAuth();

  useEffect(() => {
    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: getHomeRouteForRole(user.role) }],
      });
    }
  }, [navigation, user]);

  // Test connection on mount
  useEffect(() => {
    checkServerHealth(getServerBaseUrl()).then((res) => {
      setConnectionStatus(res);
    });
  }, []);

  const handleTestAndSaveServer = async (targetIpOrUrl) => {
    const raw = (targetIpOrUrl || serverInput || '').trim();
    if (!raw) return;

    let formattedUrl = raw;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `http://${formattedUrl}:5000/api`;
    } else if (!formattedUrl.endsWith('/api')) {
      formattedUrl = `${formattedUrl.replace(/\/+$/, '')}/api`;
    }

    setTestingConnection(true);
    try {
      const res = await checkServerHealth(formattedUrl);
      setConnectionStatus(res);
      if (res.success) {
        const savedUrl = await setServerBaseUrl(formattedUrl);
        setCurrentUrl(savedUrl);
        setError('');
      } else {
        setError(`Cannot reach server at ${formattedUrl}. Verify phone is on the same hotspot/Wi-Fi.`);
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handlePasswordSetup = async () => {
    if (!otp || otp.trim().length !== 6) {
      return setError('Please enter the 6-digit OTP code sent in your approval email.');
    }
    if (!newPassword || newPassword.length < 8) {
      return setError('Your permanent password must be at least 8 characters in length.');
    }
    if (newPassword !== confirmPassword) {
      return setError('New password and confirm password do not match.');
    }

    setError('');
    setSubmitting(true);
    try {
      await firstTimeSetup(email, password, otp.trim(), newPassword);
    } catch (err) {
      setError(err.response?.data?.message || 'Password setup failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (showPasswordSetup) {
      return handlePasswordSetup();
    }

    if (showOtp) {
      if (!otp || otp.trim().length !== 6) {
        return setError('Please enter the 6-digit OTP verification code.');
      }
      setError('');
      setSubmitting(true);
      try {
        await verifyOTP(email, otp.trim());
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired OTP code. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email || !password) return setError('Email and password are required.');
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res && res.requirePasswordSetup) {
        setShowPasswordSetup(true);
        setOtpNotice(res.message || 'First-time login: Please verify OTP and create your personal password.');
        if (res.devOtp) {
          setOtp(res.devOtp);
        }
      } else if (res && res.requireOtp) {
        setShowOtp(true);
        setOtpNotice(res.message || 'Account approved! Please enter the 6-digit OTP code sent to your email.');
        if (res.devOtp) {
          setOtp(res.devOtp);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.message === 'Network Error'
          ? `Cannot reach server at ${getServerBaseUrl()}. Try selecting Wi-Fi or Ethernet below.`
          : err.message || 'Login failed. Please check credentials.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await resendOTP(email);
      setOtpNotice(res.message || 'A fresh OTP has been dispatched.');
      if (res.devOtp) {
        setOtp(res.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchServer = async (ip) => {
    const newUrl = await setServerBaseUrl(`http://${ip}:5000/api`);
    setCurrentUrl(newUrl);
    setError(`Server updated to ${newUrl}. Retrying login...`);
    if (email && password) {
      setTimeout(handleLogin, 300);
    }
  };

  const setDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerBox}>
        <Image
          source={require('../../assets/ddu-logo.png')}
          style={{ width: 88, height: 88, marginBottom: 12, resizeMode: 'contain' }}
        />
        <Text style={styles.title}>Dire Dawa University</Text>
        <Text style={styles.subtitle}>AI Smart Academic Assistant</Text>
      </View>

      {otpNotice ? (
        <View style={styles.otpNoticeBox}>
          <Text style={styles.otpNoticeTitle}>Account Approved by Administrator!</Text>
          <Text style={styles.otpNoticeText}>{otpNotice}</Text>
        </View>
      ) : null}

      {/* Server Status & Configuration Box */}
      <View style={[styles.serverStatusCard, connectionStatus?.success ? styles.serverOnline : styles.serverOffline]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.serverStatusTitle}>
              {connectionStatus?.success ? '🟢 Server Connected' : '🔴 Server Disconnected'}
            </Text>
            <Text style={styles.serverStatusSub} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.serverConfigToggleBtn}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverConfigToggleText}>
              {showServerConfig ? 'Close' : 'Change IP'}
            </Text>
          </TouchableOpacity>
        </View>

        {showServerConfig && (
          <View style={styles.serverConfigExpanded}>
            <Text style={styles.serverConfigLabel}>Server Host / IP Address:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={serverInput}
                onChangeText={setServerInput}
                placeholder="192.168.137.76"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => handleTestAndSaveServer(serverInput)}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.testBtnText}>Connect</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => {
                setServerInput(PRIMARY_WIFI_IP);
                handleTestAndSaveServer(PRIMARY_WIFI_IP);
              }}
            >
              <Text style={styles.presetBtnText}>Use Wi-Fi Default ({PRIMARY_WIFI_IP})</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showPasswordSetup ? (
        <View style={styles.otpCard}>
          <Text style={styles.otpNoticeTitle}>First-Time Student Setup</Text>
          <Text style={styles.otpSubtitle}>
            Please verify your one-time OTP and create your permanent personal password.
          </Text>

          <Text style={styles.label}>Academic Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. student.cs@ddu.edu.et"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Temporary Default Password (Optional)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Temporary Password (e.g. Ddu@1234!)"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <Text style={styles.label}>6-Digit Verification OTP</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={6}
          />

          <Text style={styles.label}>Create Personal Password (min 8 chars)</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Personal Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Save Password & Enter Portal</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setShowPasswordSetup(false); setError(''); }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : !showOtp ? (
        <>
          <Text style={styles.label}>Institutional Email or University / Lecturer ID</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. lecturer.cs@ddu.edu.et or LEC/CS/101"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In to Portal</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 14, alignItems: 'center' }}
            onPress={() => navigation.navigate('LecturerActivation', { identifier: email })}
          >
            <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700' }}>
              🔑 Invited Lecturer? Activate Account with OTP & Temp Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 10, alignItems: 'center' }}
            onPress={() => { setShowPasswordSetup(true); setError(''); }}
          >
            <Text style={{ color: '#0284c7', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
              First-Time Student? Verify OTP & Set Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>New Student? Create Account</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.otpCard}>
          <Text style={styles.otpSubtitle}>
            Verification OTP sent to your email for account:
          </Text>
          <Text style={styles.otpAccountEmail}>{email}</Text>

          <Text style={styles.label}>6-Digit Verification Code</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Verify OTP & Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1, marginTop: 0 }]}
              onPress={handleResend}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>Resend OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1, marginTop: 0 }]}
              onPress={() => {
                setShowOtp(false);
                setOtp('');
                setError('');
                setOtpNotice('');
              }}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Demo Credentials */}
      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>QUICK DEMO ACCESS</Text>
        <View style={styles.demoRow}>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => setDemo('student.cs@ddu.edu.et', 'Student@123')}
          >
            <Text style={styles.demoBtnText}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => setDemo('lecturer.cs@ddu.edu.et', 'Lecturer@123')}
          >
            <Text style={styles.demoBtnText}>Lecturer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => setDemo('admin@ddu.edu.et', 'Admin@123')}
          >
            <Text style={styles.demoBtnText}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => setDemo('registrar@ddu.edu.et', 'Registrar@123')}
          >
            <Text style={styles.demoBtnText}>Registrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    height: touchTargets.minInputHeight,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: touchTargets.borderRadius,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text,
  },
  loginBtn: {
    height: touchTargets.minButtonHeight,
    backgroundColor: colors.primary,
    borderRadius: touchTargets.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerLinkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  serverStatusCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  serverOnline: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  serverOffline: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  serverStatusTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  serverStatusSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  serverConfigToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  serverConfigToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  serverConfigExpanded: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  serverConfigLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  testBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: touchTargets.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 4,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  demoSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  otpNoticeBox: {
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  otpNoticeTitle: {
    color: '#065f46',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  otpNoticeText: {
    color: '#047857',
    fontSize: 12,
  },
  otpCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  otpSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  otpAccountEmail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInput: {
    height: 52,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: touchTargets.borderRadius,
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: colors.text,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: touchTargets.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: '#f1f5f9',
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    height: 44,
    borderRadius: touchTargets.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
