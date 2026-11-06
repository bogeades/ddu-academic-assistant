import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export const LecturerActivationScreen = ({ navigation, route }) => {
  const initialIdentifier = route?.params?.identifier || '';
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [tempPassword, setTempPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Step 2 state
  const [step, setStep] = useState(1); // 1 = OTP verify, 2 = Create Password, 3 = Success
  const [lecturerInfo, setLecturerInfo] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Verify OTP and Temp Password
  const handleVerifyOtp = async () => {
    if (!identifier.trim()) {
      return setError('Please enter your Lecturer ID or registered institutional email.');
    }
    if (!tempPassword.trim()) {
      return setError('Please enter the temporary default password from your invitation email.');
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      return setError('Please enter the 6-digit OTP code received in your email.');
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/lecturer-verify-otp', {
        identifier: identifier.trim(),
        tempPassword: tempPassword.trim(),
        otp: otp.trim(),
      });

      if (res.data?.success) {
        setLecturerInfo(res.data.lecturer);
        setStep(2);
      } else {
        setError(res.data?.message || 'Verification failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Personal Password & Activate Account
  const handleActivate = async () => {
    if (!newPassword || newPassword.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return setError('Password must contain uppercase letters, lowercase letters, and numbers.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Password and confirmation do not match.');
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/lecturer-activate-account', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });

      if (res.data?.success) {
        const { token, user } = res.data;
        if (token && user) {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
        setStep(3);
      } else {
        setError(res.data?.message || 'Activation failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Account activation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Dire Dawa University</Text>
        <Text style={styles.subtitle}>Lecturer Account Activation Portal</Text>
      </View>

      {/* Progress Steps */}
      <View style={styles.stepIndicatorRow}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
          <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify Lecturer Credentials</Text>
          <Text style={styles.cardSub}>
            Please enter the temporary credentials and 6-digit OTP code sent to your official email.
          </Text>

          <Text style={styles.label}>Lecturer ID or Registered Email</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="e.g. LEC/CS/101 or abebe@ddu.edu.et"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Temporary Default Password</Text>
          <TextInput
            style={styles.input}
            value={tempPassword}
            onChangeText={setTempPassword}
            placeholder="From university email invitation"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <Text style={styles.label}>6-Digit Verification OTP</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify OTP & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.cancelBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Permanent Password</Text>
          <Text style={styles.cardSub}>
            Identity verified for <Text style={{ fontWeight: 'bold', color: '#0b3954' }}>{lecturerInfo?.fullName}</Text> ({lecturerInfo?.lecturerId}).
          </Text>

          <View style={styles.infoPill}>
            <Text style={styles.infoPillText}>
              🏛️ {lecturerInfo?.department?.name || 'Academic Faculty'} • 📧 {lecturerInfo?.email}
            </Text>
          </View>

          <Text style={styles.label}>Create Personal Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 chars (uppercase, lowercase, number)"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Personal Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#059669' }]}
            onPress={handleActivate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Activate Account & Save Password</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🎉</Text>
          <Text style={styles.cardTitle}>Account Successfully Activated!</Text>
          <Text style={[styles.cardSub, { textAlign: 'center', marginVertical: 8 }]}>
            Welcome to Dire Dawa University Faculty. Your credentials have been permanently verified.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'LecturerPortal' }] })}
          >
            <Text style={styles.primaryBtnText}>Enter Lecturer Teaching Portal</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center' },
  headerBox: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#0b3954' },
  stepDotText: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
  stepDotTextActive: { color: '#ffffff' },
  stepLine: { width: 40, height: 3, backgroundColor: '#e2e8f0' },
  stepLineActive: { backgroundColor: '#0b3954' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  otpInput: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#0284c7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold', color: '#0b3954' },
  primaryBtn: { backgroundColor: '#0b3954', height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  cancelBtnText: { color: '#64748b', fontSize: 13 },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600' },
  infoPill: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, marginVertical: 10, borderWidth: 1, borderColor: '#bae6fd' },
  infoPillText: { color: '#0369a1', fontSize: 12, fontWeight: '600' },
});